// Hook PreToolUse de Claude Code.
// Bloquea (exit 2) el acceso a secretos, a archivos fuera del proyecto
// y la modificación de la propia configuración de la IA.
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(
  process.env.CLAUDE_PROJECT_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
);
const ES_WINDOWS = process.platform === "win32";

/** Patrones de nombres de archivo con secretos. */
const PATRONES_SECRETOS = [
  /(?<![\w$])\.env(?:\.[\w-]+)*/gi,
  /[\w-]+\.(?:pem|key|p12|pfx)(?![\w.])/gi,
  /[\w-]*serviceAccount[\w-]*\.json/gi,
  /[\w-]*firebase-adminsdk[\w-]*\.json/gi,
];

/** Archivos con nombre de secreto que sí se pueden leer. */
const PERMITIDOS = new Set([".env.example"]);

/** Rutas de la configuración de la IA que ella misma no puede modificar. */
const CONFIG_PROTEGIDA = [".claude/settings.json", ".claude/hooks/"];

/** Devuelve el primer nombre de secreto encontrado en el texto, o null. */
export function buscarSecreto(texto) {
  for (const patron of PATRONES_SECRETOS) {
    for (const coincidencia of texto.matchAll(patron)) {
      if (!PERMITIDOS.has(coincidencia[0].toLowerCase())) {
        return coincidencia[0];
      }
    }
  }
  return null;
}

/** Indica si una ruta queda fuera de la carpeta del proyecto. */
export function estaFueraDelProyecto(ruta) {
  const absoluta = path.resolve(RAIZ, ruta);
  const relativa = path.relative(
    ES_WINDOWS ? RAIZ.toLowerCase() : RAIZ,
    ES_WINDOWS ? absoluta.toLowerCase() : absoluta,
  );
  return relativa.startsWith("..") || path.isAbsolute(relativa);
}

/** Indica si una ruta apunta a la configuración protegida de la IA. */
export function esConfigProtegida(ruta) {
  const relativa = path.relative(RAIZ, path.resolve(RAIZ, ruta)).replaceAll("\\", "/");
  return CONFIG_PROTEGIDA.some((protegida) => relativa === protegida || relativa.startsWith(protegida));
}

/** Evalúa la llamada a la herramienta y devuelve el motivo de bloqueo, o null. */
export function evaluar(entrada) {
  const herramienta = entrada.tool_name ?? "";
  const datos = entrada.tool_input ?? {};
  const rutas = [datos.file_path, datos.path, datos.notebook_path].filter(Boolean);
  const textos = [...rutas, datos.pattern, datos.glob, datos.command].filter(Boolean);

  for (const texto of textos) {
    const secreto = buscarSecreto(String(texto));
    if (secreto) {
      return `Acceso a secretos bloqueado (${secreto}). Usa .env.example para conocer los nombres de las variables.`;
    }
  }

  for (const ruta of rutas) {
    if (estaFueraDelProyecto(String(ruta))) {
      return `Ruta fuera del proyecto bloqueada: ${ruta}`;
    }
  }

  const escribe = ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(herramienta);
  if (escribe && rutas.some((ruta) => esConfigProtegida(String(ruta)))) {
    return "La IA no puede modificar su propia configuración (.claude/settings.json, .claude/hooks).";
  }

  return null;
}

/** Lee todo stdin como texto. */
async function leerEntrada() {
  let texto = "";
  for await (const parte of process.stdin) {
    texto += parte;
  }
  return texto;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const motivo = evaluar(JSON.parse((await leerEntrada()) || "{}"));
  if (motivo) {
    process.stderr.write(`${motivo}\n`);
    process.exit(2);
  }
  process.exit(0);
}
