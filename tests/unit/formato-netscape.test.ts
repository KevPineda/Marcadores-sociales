import { describe, expect, it } from "vitest";
import { generarMarcadoresHtml, leerMarcadoresHtml } from "@/services/formato-netscape";
import { crearMarcador } from "../fixtures/marcadores";

const EXPORTADO_CHROME = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000">Estudio</H3>
    <DL><p>
        <DT><A HREF="https://zod.dev/" ADD_DATE="1700000000" TAGS="typescript,Validación">Zod &amp; tipos</A>
        <DT><A HREF="javascript:alert(1)">Malicioso</A>
        <DT><A ADD_DATE="1">Sin href</A>
    </DL><p>
</DL><p>`;

describe("leerMarcadoresHtml", () => {
  it("lee URL, título decodificado, etiquetas válidas y fecha", () => {
    const [primero] = leerMarcadoresHtml(EXPORTADO_CHROME);
    expect(primero).toEqual({
      url: "https://zod.dev/",
      titulo: "Zod & tipos",
      etiquetas: ["typescript", "validación"],
      creadoEn: "2023-11-14T22:13:20.000Z",
    });
  });

  it("incluye enlaces con cualquier esquema (los filtra el servicio) y omite los que no tienen HREF", () => {
    expect(leerMarcadoresHtml(EXPORTADO_CHROME).map((enlace) => enlace.url)).toEqual([
      "https://zod.dev/",
      "javascript:alert(1)",
    ]);
  });
});

describe("generarMarcadoresHtml", () => {
  it("escapa el título y la URL, y se puede volver a importar igual", () => {
    const marcador = crearMarcador({
      url: "https://ejemplo.com/?a=1&b=2",
      titulo: '<script>alert("x")</script>',
      etiquetas: ["css", "diseño"],
      creadoEn: "2026-11-02T14:10:00.000Z",
    });

    const html = generarMarcadoresHtml([marcador]);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(leerMarcadoresHtml(html)).toEqual([
      { url: marcador.url, titulo: marcador.titulo, etiquetas: ["css", "diseño"], creadoEn: marcador.creadoEn },
    ]);
  });
});
