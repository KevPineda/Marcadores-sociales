// Hook PostToolUse de Claude Code.
// Corre ESLint sobre el archivo que la IA acaba de editar y le devuelve
// los errores (exit 2) para que los corrija antes de seguir.
import { spawnSync } from "node:child_process";
import path from "node:path";

const RAIZ = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const EXTENSIONES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

let texto = "";
for await (const parte of process.stdin) {
  texto += parte;
}

const archivo = JSON.parse(texto || "{}").tool_input?.file_path;
if (!archivo || !EXTENSIONES.has(path.extname(archivo))) {
  process.exit(0);
}

const resultado = spawnSync("npx", ["eslint", "--max-warnings=0", archivo], {
  cwd: RAIZ,
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (resultado.status !== 0) {
  process.stderr.write(`ESLint encontró problemas en ${archivo}:\n${resultado.stdout}${resultado.stderr}`);
  process.exit(2);
}
process.exit(0);
