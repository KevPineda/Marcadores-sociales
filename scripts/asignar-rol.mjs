/* eslint-disable no-console -- script de línea de comandos: su salida es para la terminal. */
// Asigna el rol de una cuenta como custom claim de Firebase Auth (solo desde el servidor).
// Uso: node --env-file=.env.local scripts/asignar-rol.mjs <correo> <admin|usuario>
// La persona debe cerrar sesión y volver a entrar para que el rol nuevo llegue a su cookie.
// Herramienta de administración por terminal (nunca llega al navegador): excepción justificada a la regla.
// eslint-disable-next-line no-restricted-imports
import { cert, initializeApp } from "firebase-admin/app";
// eslint-disable-next-line no-restricted-imports
import { getAuth } from "firebase-admin/auth";

const [correo, rol] = process.argv.slice(2);
if (!correo || !["admin", "usuario"].includes(rol)) {
  console.error("Uso: node --env-file=.env.local scripts/asignar-rol.mjs <correo> <admin|usuario>");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const usuario = await auth.getUserByEmail(correo);
await auth.setCustomUserClaims(usuario.uid, rol === "admin" ? { rol: "admin" } : {});
// Revoca las sesiones abiertas para que el cambio aplique en el próximo inicio de sesión.
await auth.revokeRefreshTokens(usuario.uid);
console.log(`✔ ${correo} ahora tiene el rol «${rol}». Debe volver a iniciar sesión.`);
