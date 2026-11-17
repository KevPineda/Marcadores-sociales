// @vitest-environment node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "..", "..");
const HOOK = path.join(RAIZ, ".claude", "hooks", "proteger-secretos.mjs");

/** Ejecuta el hook como lo hace Claude Code y devuelve código de salida y mensaje. */
function ejecutarHook(toolName: string, toolInput: Record<string, string>): { codigo: number | null; mensaje: string } {
  const resultado = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: RAIZ },
    encoding: "utf8",
  });
  return { codigo: resultado.status, mensaje: resultado.stderr };
}

describe("La IA no puede leer secretos", () => {
  it.each([
    ["Read", { file_path: ".env" }],
    ["Read", { file_path: ".env.local" }],
    ["Read", { file_path: path.join(RAIZ, ".env.production") }],
    ["Read", { file_path: "llaves/proyecto-firebase-adminsdk-abc12.json" }],
    ["Read", { file_path: "serviceAccount.json" }],
    ["Read", { file_path: "certificados/privada.pem" }],
    ["Edit", { file_path: ".env.local" }],
    ["Grep", { pattern: "FIREBASE", path: ".env.local" }],
    ["Glob", { pattern: "**/.env*" }],
    ["Bash", { command: "cat .env.local" }],
    ["Bash", { command: "type .env" }],
    ["Bash", { command: "node -e \"console.log(require('fs').readFileSync('.env.local','utf8'))\"" }],
  ])("%s %j → bloqueado", (herramienta, entrada) => {
    const { codigo, mensaje } = ejecutarHook(herramienta, entrada);
    expect(codigo).toBe(2);
    expect(mensaje).toMatch(/secretos/i);
  });

  it.each([
    ["Read", { file_path: ".env.example" }],
    ["Read", { file_path: "src/app/page.tsx" }],
    ["Bash", { command: "npm test" }],
    ["Bash", { command: "grep -r process.env.FIREBASE_PROJECT_ID src" }],
  ])("%s %j → permitido", (herramienta, entrada) => {
    expect(ejecutarHook(herramienta, entrada).codigo).toBe(0);
  });
});

describe("La IA no puede salir de la carpeta del proyecto", () => {
  it.each([
    ["Read", { file_path: "../otro-proyecto/archivo.ts" }],
    ["Read", { file_path: path.resolve(RAIZ, "..", "secreto.txt") }],
    ["Write", { file_path: "../../fuera.txt" }],
    ["Grep", { pattern: "clave", path: ".." }],
  ])("%s %j → bloqueado", (herramienta, entrada) => {
    const { codigo, mensaje } = ejecutarHook(herramienta, entrada);
    expect(codigo).toBe(2);
    expect(mensaje).toMatch(/fuera del proyecto/i);
  });
});

describe("La IA no puede relajar su propia configuración", () => {
  it.each([
    ["Edit", { file_path: ".claude/settings.json" }],
    ["Write", { file_path: ".claude/hooks/proteger-secretos.mjs" }],
  ])("%s %j → bloqueado", (herramienta, entrada) => {
    const { codigo, mensaje } = ejecutarHook(herramienta, entrada);
    expect(codigo).toBe(2);
    expect(mensaje).toMatch(/configuración/i);
  });

  it("puede leer su configuración", () => {
    expect(ejecutarHook("Read", { file_path: ".claude/settings.json" }).codigo).toBe(0);
  });
});
