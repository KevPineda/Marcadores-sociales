// @vitest-environment node
import { lookup } from "node:dns/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { comprobarEnlace, descargarPagina, ErrorDescarga, LIMITES_DESCARGA } from "@/services/descarga-segura";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

const MB = 1024 * 1024;

/** Simula el DNS: todos los dominios resuelven a la IP indicada. */
function resolverA(ip: string): void {
  vi.mocked(lookup).mockResolvedValue([{ address: ip, family: ip.includes(":") ? 6 : 4 }] as never);
}

/** Respuesta HTML de prueba. */
function html(cuerpo: string, status = 200): Response {
  return new Response(cuerpo, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** Redirección a otro destino. */
function redireccion(destino: string): Response {
  return new Response(null, { status: 302, headers: { Location: destino } });
}

/** Captura el ErrorDescarga lanzado por una promesa. */
async function errorDe(promesa: Promise<unknown>): Promise<ErrorDescarga> {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ErrorDescarga) {
      return error;
    }
    throw error;
  }
  throw new Error("Se esperaba un ErrorDescarga");
}

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resolverA("93.184.216.34");
  fetchSimulado = vi.fn();
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("descargarPagina: SSRF", () => {
  it("rechaza un dominio que resuelve a una IP privada (DNS)", async () => {
    resolverA("10.0.0.7");
    const error = await errorDe(descargarPagina("https://interno.ejemplo.com/"));

    expect(error.motivo).toBe("ssrf");
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza un dominio que resuelve a ::1", async () => {
    resolverA("::1");
    expect((await errorDe(descargarPagina("https://v6.ejemplo.com/"))).motivo).toBe("ssrf");
  });

  it("valida cada redirección: un 302 hacia 169.254.169.254 se bloquea", async () => {
    fetchSimulado.mockResolvedValueOnce(redireccion("http://169.254.169.254/latest/meta-data/"));

    const error = await errorDe(descargarPagina("https://ejemplo.com/"));

    expect(error.motivo).toBe("ssrf");
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it("sigue como máximo 3 redirecciones", async () => {
    fetchSimulado.mockImplementation(async () => redireccion("https://ejemplo.com/otra"));

    const error = await errorDe(descargarPagina("https://ejemplo.com/"));

    expect(error.motivo).toBe("redirecciones");
    expect(fetchSimulado).toHaveBeenCalledTimes(LIMITES_DESCARGA.maximoRedirecciones + 1);
  });

  it("no sigue redirecciones automáticamente y envía una señal de tiempo máximo", async () => {
    fetchSimulado.mockResolvedValueOnce(html("<title>Hola</title>"));
    await descargarPagina("https://ejemplo.com/");

    const [, opciones] = fetchSimulado.mock.calls[0];
    expect(opciones.redirect).toBe("manual");
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("descargarPagina: tamaño máximo (criterio 2)", () => {
  it("corta la descarga de una página de 50 MB sin leerla completa", async () => {
    let bytesEnviados = 0;
    const trozo = new Uint8Array(64 * 1024).fill(65);
    const cincuentaMb = new ReadableStream<Uint8Array>({
      pull(controlador) {
        if (bytesEnviados >= 50 * MB) {
          controlador.close();
          return;
        }
        bytesEnviados += trozo.byteLength;
        controlador.enqueue(trozo);
      },
    });
    fetchSimulado.mockResolvedValueOnce(
      new Response(cincuentaMb, { headers: { "Content-Type": "text/html" } }),
    );

    const error = await errorDe(descargarPagina("https://ejemplo.com/enorme"));

    expect(error.motivo).toBe("tamano");
    expect(bytesEnviados).toBeLessThan(2 * MB);
  });

  it("rechaza sin leer nada si Content-Length anuncia 50 MB", async () => {
    const respuesta = html("x");
    respuesta.headers.set("Content-Length", String(50 * MB));
    fetchSimulado.mockResolvedValueOnce(respuesta);

    expect((await errorDe(descargarPagina("https://ejemplo.com/"))).motivo).toBe("tamano");
  });
});

describe("descargarPagina: respuestas", () => {
  it("devuelve el HTML y la URL final tras una redirección pública", async () => {
    fetchSimulado
      .mockResolvedValueOnce(redireccion("/nueva"))
      .mockResolvedValueOnce(html("<title>Nueva</title>"));

    expect(await descargarPagina("https://ejemplo.com/vieja")).toEqual({
      urlFinal: "https://ejemplo.com/nueva",
      html: "<title>Nueva</title>",
    });
  });

  it("si no es HTML (un PDF) devuelve html = null", async () => {
    fetchSimulado.mockResolvedValueOnce(new Response("%PDF", { headers: { "Content-Type": "application/pdf" } }));
    expect((await descargarPagina("https://ejemplo.com/a.pdf")).html).toBeNull();
  });

  it("un 404 es un ErrorDescarga http con el código", async () => {
    fetchSimulado.mockResolvedValueOnce(html("no", 404));
    const error = await errorDe(descargarPagina("https://ejemplo.com/"));
    expect([error.motivo, error.status]).toEqual(["http", 404]);
  });
});

describe("comprobarEnlace", () => {
  it.each([
    [404, "roto"],
    [410, "roto"],
    [503, "roto"],
    [200, "ok"],
    [403, "ok"],
    [429, "ok"],
  ])("un código %i se considera %s", async (status, esperado) => {
    fetchSimulado.mockResolvedValueOnce(new Response(null, { status }));
    expect(await comprobarEnlace("https://ejemplo.com/")).toBe(esperado);
  });

  it("un error de red se considera roto", async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await comprobarEnlace("https://ejemplo.com/")).toBe("roto");
  });
});
