// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/marcadores/route";
import { reiniciarLimites } from "@/lib/limite-frecuencia";
import { descargarPagina, ErrorDescarga } from "@/services/descarga-segura";
import { idDesdeUrl } from "@/services/url";
import { ANA, peticion, reiniciarFalsos, repositorioMarcadoresFalso } from "../api/falsos";

/**
 * Integración: Route Handler → servicio (normalización, duplicados, vista
 * previa, metadatos) → repositorio simulado. Solo se simulan Firebase y la red.
 */
vi.mock("@/lib/firebase-admin", async () => {
  const { authFalso } = await import("../api/falsos");
  return { obtenerAuth: () => authFalso, obtenerFirestore: () => ({}) };
});
vi.mock("@/repositories/marcadores", async () => (await import("../api/falsos")).repositorioMarcadoresFalso);
vi.mock("@/services/descarga-segura", async (original) => ({
  ...(await original<typeof import("@/services/descarga-segura")>()),
  descargarPagina: vi.fn(),
}));

const HTML_PAGINA = `<!doctype html><html><head>
  <title>Título HTML</title>
  <meta property="og:title" content="&lt;img src=x onerror=alert(1)&gt; Zod &amp; TypeScript">
  <meta name="description" content="Validación con   inferencia de tipos.">
  <meta property="og:image" content="/og.png">
</head><body></body></html>`;

/** Crea un marcador de Ana por la API. */
async function guardar(cuerpo: unknown): Promise<Response> {
  return POST(peticion("POST", "/api/marcadores", { token: ANA.token, cuerpo }), undefined);
}

beforeEach(() => {
  reiniciarFalsos();
  reiniciarLimites();
  vi.mocked(descargarPagina).mockResolvedValue({ urlFinal: "https://zod.dev/", html: HTML_PAGINA });
});

describe("POST /api/marcadores (ruta → servicio → repositorio)", () => {
  it("guarda con URL normalizada, id = hash, y vista previa extraída en el servidor como texto", async () => {
    const respuesta = await guardar({ url: "https://zod.dev/?utm_source=boletin#inicio", etiquetas: ["typescript"] });

    expect(respuesta.status).toBe(201);
    const marcador = await respuesta.json();
    const id = await idDesdeUrl("https://zod.dev/");
    expect(marcador).toMatchObject({
      id,
      url: "https://zod.dev/",
      titulo: "<img src=x onerror=alert(1)> Zod & TypeScript",
      descripcion: "Validación con inferencia de tipos.",
      imagenUrl: "https://zod.dev/og.png",
      etiquetas: ["typescript"],
      publico: false,
      estado: "ok",
    });
    expect(respuesta.headers.get("Location")).toBe(`/api/marcadores/${id}`);
    expect(descargarPagina).toHaveBeenCalledWith("https://zod.dev/");
    expect(repositorioMarcadoresFalso.crearMarcador).toHaveBeenCalledWith(ANA.uid, marcador);
  });

  it("criterio 4: el mismo enlace con otros utm_* responde 409 sin volver a descargar la página", async () => {
    await guardar({ url: "https://zod.dev/" });
    vi.mocked(descargarPagina).mockClear();

    const respuesta = await guardar({ url: "https://zod.dev/?utm_medium=email&fbclid=abc" });

    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: "Ya guardaste este enlace." });
    expect(descargarPagina).not.toHaveBeenCalled();
  });

  it("el título escrito por la persona tiene prioridad sobre el de la página", async () => {
    const marcador = await (await guardar({ url: "https://zod.dev/", titulo: "Mi título" })).json();
    expect(marcador.titulo).toBe("Mi título");
  });

  it("criterio 2: si la página es demasiado grande, se guarda sin vista previa", async () => {
    vi.mocked(descargarPagina).mockRejectedValue(new ErrorDescarga("tamano", "La página es demasiado grande."));

    const marcador = await (await guardar({ url: "https://ejemplo.com/enorme" })).json();

    expect(marcador).toMatchObject({ titulo: "ejemplo.com", descripcion: null, imagenUrl: null, estado: "ok" });
  });

  it("si el dominio resuelve a una IP interna, responde 400 y no guarda nada", async () => {
    vi.mocked(descargarPagina).mockRejectedValue(
      new ErrorDescarga("ssrf", "El dominio del enlace apunta a una dirección interna."),
    );

    const respuesta = await guardar({ url: "https://interno.ejemplo.com/" });

    expect(respuesta.status).toBe(400);
    expect(repositorioMarcadoresFalso.crearMarcador).not.toHaveBeenCalled();
  });

  it("un sitio que responde 404 se guarda marcado como roto", async () => {
    vi.mocked(descargarPagina).mockRejectedValue(new ErrorDescarga("http", "El sitio respondió 404.", 404));
    const marcador = await (await guardar({ url: "https://ejemplo.com/ya-no-existe" })).json();
    expect(marcador.estado).toBe("roto");
  });

  it("lo guardado aparece en la lista y se puede filtrar por etiqueta", async () => {
    await guardar({ url: "https://zod.dev/", etiquetas: ["typescript"] });
    await guardar({ url: "https://web.dev/vitals", etiquetas: ["rendimiento"] });

    const respuesta = await GET(peticion("GET", "/api/marcadores?etiqueta=rendimiento", { token: ANA.token }), undefined);
    const { items } = await respuesta.json();

    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://web.dev/vitals");
  });
});
