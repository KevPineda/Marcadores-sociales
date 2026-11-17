// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as EXPORTAR } from "@/app/api/marcadores/exportar/route";
import { POST as IMPORTAR } from "@/app/api/marcadores/importar/route";
import { reiniciarLimites } from "@/lib/limite-frecuencia";
import { ANA, BASE, reiniciarFalsos, repositorioMarcadoresFalso } from "./falsos";

vi.mock("@/lib/firebase-admin", async () => {
  const { authFalso } = await import("./falsos");
  return { obtenerAuth: () => authFalso, obtenerFirestore: () => ({}) };
});
vi.mock("@/repositories/marcadores", async () => (await import("./falsos")).repositorioMarcadoresFalso);

const ARCHIVO = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://zod.dev/?utm_source=x" TAGS="typescript">Zod</A>
  <DT><A HREF="https://zod.dev/">Zod repetido</A>
  <DT><A HREF="http://169.254.169.254/">Metadatos</A>
  <DT><A HREF="https://web.dev/vitals">Web Vitals</A>
</DL><p>`;

/** POST multipart con el archivo indicado. */
function importar(archivo: Blob | string, nombreCampo = "archivo"): Request {
  const formulario = new FormData();
  formulario.set(nombreCampo, archivo instanceof Blob ? archivo : new Blob([archivo], { type: "text/html" }), "marcadores.html");
  return new Request(`${BASE}/api/marcadores/importar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANA.token}` },
    body: formulario,
  });
}

beforeEach(() => {
  reiniciarFalsos();
  reiniciarLimites();
});

describe("POST /api/marcadores/importar", () => {
  it("importa los válidos, omite duplicados y descarta URLs internas", async () => {
    const respuesta = await IMPORTAR(importar(ARCHIVO), undefined);

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ importados: 2, duplicados: 1, invalidos: 1 });
    const [, guardados] = repositorioMarcadoresFalso.crearVariosMarcadores.mock.calls[0];
    expect(guardados.map((m) => m.url)).toEqual(["https://zod.dev/", "https://web.dev/vitals"]);
    expect(guardados.every((m) => m.publico === false)).toBe(true);
  });

  it("un JSON en lugar de multipart responde 415", async () => {
    const request = new Request(`${BASE}/api/marcadores/importar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANA.token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    expect((await IMPORTAR(request, undefined)).status).toBe(415);
  });

  it("un archivo que no es HTML responde 415", async () => {
    const respuesta = await IMPORTAR(importar(new Blob(["%PDF"], { type: "application/pdf" })), undefined);
    expect(respuesta.status).toBe(415);
  });

  it("un archivo de más de 2 MB responde 413", async () => {
    const grande = new Blob(["a".repeat(2 * 1024 * 1024 + 1)], { type: "text/html" });
    expect((await IMPORTAR(importar(grande), undefined)).status).toBe(413);
  });

  it("sin el campo «archivo» responde 400", async () => {
    expect((await IMPORTAR(importar(ARCHIVO, "otro"), undefined)).status).toBe(400);
  });
});

describe("GET /api/marcadores/exportar", () => {
  it("descarga un HTML de navegador con lo importado", async () => {
    await IMPORTAR(importar(ARCHIVO), undefined);
    const respuesta = await EXPORTAR(
      new Request(`${BASE}/api/marcadores/exportar`, { headers: { Authorization: `Bearer ${ANA.token}` } }),
      undefined,
    );

    expect(respuesta.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(respuesta.headers.get("Content-Disposition")).toMatch(/^attachment; filename="marcadores-\d{4}-\d{2}-\d{2}\.html"$/);
    const html = await respuesta.text();
    expect(html).toContain("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
    expect(html).toContain('HREF="https://web.dev/vitals"');
  });

  it("sin sesión responde 401", async () => {
    expect((await EXPORTAR(new Request(`${BASE}/api/marcadores/exportar`), undefined)).status).toBe(401);
  });
});
