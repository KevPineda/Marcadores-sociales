// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErrorApi } from "@/lib/errores";
import { leerJson, manejar, verificarOrigen } from "@/lib/http";
import { limitarFrecuencia, reiniciarLimites } from "@/lib/limite-frecuencia";

const esquema = z.strictObject({ nombre: z.string().min(1) });

/** POST con el cuerpo y tipo indicados. */
function post(cuerpo: string, tipo = "application/json", cabeceras: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/prueba", {
    method: "POST",
    headers: { "Content-Type": tipo, ...cabeceras },
    body: cuerpo,
  });
}

/** Código HTTP del ErrorApi que lanza la función. */
async function statusDe(promesa: Promise<unknown> | (() => unknown)): Promise<number> {
  try {
    await (typeof promesa === "function" ? promesa() : promesa);
  } catch (error) {
    if (error instanceof ErrorApi) {
      return error.status;
    }
    throw error;
  }
  return 200;
}

describe("leerJson", () => {
  it("devuelve los datos validados", async () => {
    expect(await leerJson(post('{"nombre":"Ana"}'), esquema)).toEqual({ nombre: "Ana" });
  });

  it.each([
    ["415 si no es JSON", post("nombre=Ana", "application/x-www-form-urlencoded"), 415],
    ["413 si supera 16 KB", post(JSON.stringify({ nombre: "a".repeat(20_000) })), 413],
    ["400 si el JSON está mal formado", post("{nombre:"), 400],
    ["400 si no cumple el esquema", post('{"nombre":""}'), 400],
    ["400 si trae campos desconocidos", post('{"nombre":"Ana","rol":"admin"}'), 400],
  ])("%s", async (_, request, status) => {
    expect(await statusDe(leerJson(request, esquema))).toBe(status);
  });
});

describe("verificarOrigen", () => {
  it.each([
    ["mismo origen", { Origin: "http://localhost:3000" }, 200],
    ["origen ajeno", { Origin: "https://malicioso.example" }, 403],
    ["sin Origin y con cookie", { Cookie: "sesion=x" }, 403],
    ["sin Origin y con Bearer (Bruno)", { Authorization: "Bearer token" }, 200],
  ])("POST con %s → %i", async (_, cabeceras, status) => {
    expect(await statusDe(() => verificarOrigen(post("{}", "application/json", cabeceras)))).toBe(status);
  });

  it("no aplica a GET", async () => {
    const request = new Request("http://localhost:3000/api/prueba", { headers: { Origin: "https://otro.example" } });
    expect(await statusDe(() => verificarOrigen(request))).toBe(200);
  });
});

describe("manejar", () => {
  it("convierte un error inesperado en 500 sin detalles internos", async () => {
    const handler = manejar(async () => {
      throw new Error("conexión a la base de datos con clave secreta-123");
    });
    const respuesta = await handler(new Request("http://localhost:3000/api/prueba"), undefined);

    expect(respuesta.status).toBe(500);
    expect(await respuesta.text()).toBe('{"error":"Error interno del servidor."}');
  });
});

describe("limitarFrecuencia", () => {
  it("permite el máximo y responde 429 al siguiente; se reinicia con la ventana", async () => {
    reiniciarLimites();
    for (let i = 0; i < 3; i++) {
      limitarFrecuencia("clave", 3, 60_000, 1_000);
    }
    expect(await statusDe(() => limitarFrecuencia("clave", 3, 60_000, 2_000))).toBe(429);
    expect(await statusDe(() => limitarFrecuencia("clave", 3, 60_000, 61_000))).toBe(200);
  });
});
