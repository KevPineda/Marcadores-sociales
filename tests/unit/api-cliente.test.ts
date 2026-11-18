import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorApiCliente, guardarMarcador, listarMisMarcadores } from "@/lib/api-cliente";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api-cliente", () => {
  it("convierte el formato { error, detalles } en ErrorApiCliente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Datos inválidos.", detalles: [{ campo: "url", mensaje: "Mal." }] }), {
          status: 400,
        }),
      ),
    );
    const error = await guardarMarcador({ url: "https://a.dev/", titulo: null, etiquetas: [], publico: false }).catch(
      (causa: unknown) => causa,
    );
    expect(error).toBeInstanceOf(ErrorApiCliente);
    expect(error).toMatchObject({ status: 400, message: "Datos inválidos.", detalles: [{ campo: "url", mensaje: "Mal." }] });
  });

  it("un fallo de red se convierte en un mensaje claro (status 0)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(listarMisMarcadores(null)).rejects.toMatchObject({ status: 0, message: /no pudimos conectar/i });
  });

  it("rechaza respuestas con formato inesperado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: "x" }), { status: 200 })));
    await expect(listarMisMarcadores(null)).rejects.toThrow(/formato esperado/);
  });
});
