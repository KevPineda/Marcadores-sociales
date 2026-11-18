/* eslint-disable no-console -- script de línea de comandos: su salida es para la terminal. */
// Activa el inicio de sesión con correo y contraseña en Firebase Auth (Identity Toolkit API).
// Uso: node --env-file=.env.local scripts/activar-correo.mjs
// Usa la cuenta de servicio de .env.local; no imprime ningún secreto.
// Herramienta de administración por terminal (nunca llega al navegador): excepción justificada a la regla.
// eslint-disable-next-line no-restricted-imports
import { cert } from "firebase-admin/app";

const proyecto = process.env.FIREBASE_PROJECT_ID;
const credencial = cert({
  projectId: proyecto,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
});
const { access_token: token } = await credencial.getAccessToken();
const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${proyecto}`;
const cabeceras = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

/** Llama a la API y devuelve { status, cuerpo } (sin datos sensibles). */
async function llamar(ruta, init = {}) {
  const respuesta = await fetch(`${base}${ruta}`, { ...init, headers: cabeceras });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => ({})) };
}

let resultado = await llamar("/config");
if (resultado.status === 404 || resultado.cuerpo?.error?.message === "CONFIGURATION_NOT_FOUND") {
  console.log("Authentication no estaba inicializado: inicializando…");
  resultado = await llamar("/identityPlatform:initializeAuth", { method: "POST", body: "{}" });
  console.log(`initializeAuth → ${resultado.status} ${resultado.cuerpo?.error?.message ?? ""}`);
}

resultado = await llamar("/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired", {
  method: "PATCH",
  body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
});
console.log(`Activar correo/contraseña → ${resultado.status} ${resultado.cuerpo?.error?.message ?? "OK"}`);
console.log(`Estado actual: email.enabled = ${resultado.cuerpo?.signIn?.email?.enabled ?? "desconocido"}`);
