/* eslint-disable no-console -- script de línea de comandos: su salida es para la terminal. */
// Genera .env.local (y opcionalmente las variables de Vercel) sin mostrar ningún secreto.
//
// Uso:
//   node scripts/configurar-entorno.mjs --cuenta <clave-cuenta-servicio.json> [--vercel]
//
// - Lee la clave de la cuenta de servicio (Admin SDK) que descargaste de la consola de Firebase.
// - Obtiene la configuración web pública con la CLI de Firebase (crea la app web si no existe).
// - Genera un CRON_SECRET aleatorio.
// - Escribe .env.local y, con --vercel, sube las variables al entorno "production" de Vercel.
// Solo imprime NOMBRES de variables, nunca valores. Después borra el JSON de la cuenta de servicio.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const argumentos = process.argv.slice(2);
const valorDe = (bandera) => {
  const indice = argumentos.indexOf(bandera);
  return indice === -1 ? null : (argumentos[indice + 1] ?? null);
};
const conVercel = argumentos.includes("--vercel");
const rutaCuenta = valorDe("--cuenta");
const RAIZ = path.resolve(import.meta.dirname, "..");
const DESTINO = path.join(RAIZ, ".env.local");

function fallar(mensaje) {
  process.stderr.write(`✖ ${mensaje}\n`);
  process.exit(1);
}

/** Ejecuta una CLI con npx y devuelve stdout; nunca imprime la salida. */
function npx(args, entrada) {
  const resultado = spawnSync("npx", ["-y", ...args], {
    cwd: RAIZ,
    input: entrada,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (resultado.status !== 0) {
    const detalle = (resultado.stderr || resultado.stdout || "").split("\n").slice(-5).join("\n");
    fallar(`Falló "${args.slice(0, 3).join(" ")}":\n${detalle}`);
  }
  return resultado.stdout;
}

/** La CLI de Firebase con --json responde { status, result }. */
function firebaseJson(args) {
  const salida = npx(["firebase-tools", ...args, "--json"]);
  const inicio = salida.indexOf("{");
  return JSON.parse(salida.slice(inicio)).result;
}

if (!rutaCuenta) {
  fallar("Falta --cuenta <ruta al JSON de la cuenta de servicio>.");
}

const cuenta = JSON.parse(readFileSync(path.resolve(rutaCuenta), "utf8"));
if (cuenta.type !== "service_account" || !cuenta.private_key || !cuenta.client_email) {
  fallar("El archivo no parece una clave de cuenta de servicio de Firebase.");
}
const proyecto = cuenta.project_id;
console.log(`Proyecto de Firebase: ${proyecto}`);

let apps = firebaseJson(["apps:list", "WEB", "--project", proyecto]) ?? [];
if (apps.length === 0) {
  console.log("No hay app web registrada: creando «marcadores-sociales»…");
  apps = [firebaseJson(["apps:create", "WEB", "marcadores-sociales", "--project", proyecto])];
}
const web = firebaseJson(["apps:sdkconfig", "WEB", apps[0].appId, "--project", proyecto]);
const sdk = web.sdkConfig ?? web;

const variables = {
  NEXT_PUBLIC_FIREBASE_API_KEY: sdk.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: sdk.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: sdk.projectId,
  NEXT_PUBLIC_FIREBASE_APP_ID: sdk.appId,
  FIREBASE_PROJECT_ID: proyecto,
  FIREBASE_CLIENT_EMAIL: cuenta.client_email,
  FIREBASE_PRIVATE_KEY: cuenta.private_key,
  CRON_SECRET: randomBytes(32).toString("hex"),
};
for (const [nombre, valor] of Object.entries(variables)) {
  if (!valor) {
    fallar(`No se pudo obtener ${nombre}.`);
  }
}

const lineas = Object.entries(variables).map(([nombre, valor]) =>
  nombre === "FIREBASE_PRIVATE_KEY" ? `${nombre}="${valor.replace(/\n/g, "\\n")}"` : `${nombre}=${valor}`,
);
// Conserva las líneas de otras herramientas (p. ej. VERCEL_OIDC_TOKEN de `vercel link`).
const previas = existsSync(DESTINO)
  ? readFileSync(DESTINO, "utf8")
      .split(/\r?\n/)
      .filter((linea) => linea.trim() && !Object.keys(variables).some((nombre) => linea.startsWith(`${nombre}=`)))
      .filter((linea) => linea !== "# Generado por scripts/configurar-entorno.mjs")
  : [];
const contenido = [...previas, "# Generado por scripts/configurar-entorno.mjs", ...lineas].join("\n");
writeFileSync(DESTINO, `${contenido}\n`, { mode: 0o600 });
console.log(`✔ .env.local escrito con: ${Object.keys(variables).join(", ")}`);

if (conVercel) {
  for (const [nombre, valor] of Object.entries(variables)) {
    // Las NEXT_PUBLIC_* son públicas (van al navegador); el resto queda como secreto.
    const tipo = nombre.startsWith("NEXT_PUBLIC_") ? "config" : "secret";
    npx(["vercel", "env", "add", nombre, "--environment", "production", "--type", tipo, "--force"], valor);
    console.log(`✔ Vercel (production): ${nombre}`);
  }
}

console.log("\nListo. Borra ahora el JSON de la cuenta de servicio: ya no se necesita.");
