import { describe, expect, it } from "vitest";
import { extraerMetadatos } from "@/services/metadatos";

const BASE = "https://ejemplo.com/articulo";

/** HTML mínimo con el contenido indicado en el <head>. */
function pagina(cabecera: string): string {
  return `<!doctype html><html><head>${cabecera}</head><body><title>No soy el título</title></body></html>`;
}

describe("extraerMetadatos", () => {
  it("prefiere Open Graph sobre <title> y la descripción normal", () => {
    const metadatos = extraerMetadatos(
      pagina(`<title>HTML</title><meta property="og:title" content="OG">
        <meta name="description" content="Normal"><meta property="og:description" content="Desc OG">`),
      BASE,
    );
    expect(metadatos).toMatchObject({ titulo: "OG", descripcion: "Desc OG" });
  });

  it("usa <title> y meta description si no hay Open Graph", () => {
    expect(extraerMetadatos(pagina('<title> Mi   página </title><meta name="description" content="Hola">'), BASE))
      .toEqual({ titulo: "Mi página", descripcion: "Hola", imagenUrl: null });
  });

  it("criterio 3: un título con HTML se trata como texto (se decodifica, no se interpreta)", () => {
    const { titulo } = extraerMetadatos(
      pagina('<meta property="og:title" content="&lt;script&gt;alert(1)&lt;/script&gt; Hola &amp; adiós">'),
      BASE,
    );
    expect(titulo).toBe("<script>alert(1)</script> Hola & adiós");
  });

  it("quita etiquetas reales dentro de <title>", () => {
    expect(extraerMetadatos(pagina("<title><b>Negrita</b> y texto</title>"), BASE).titulo).toBe("Negrita y texto");
  });

  it("acepta atributos en cualquier orden y con comillas simples", () => {
    expect(extraerMetadatos(pagina("<meta content='Invertido' property='og:title'>"), BASE).titulo).toBe("Invertido");
  });

  it("resuelve una imagen relativa contra la URL de la página", () => {
    expect(extraerMetadatos(pagina('<meta property="og:image" content="/img/og.png">'), BASE).imagenUrl).toBe(
      "https://ejemplo.com/img/og.png",
    );
  });

  it.each([
    ["http (contenido mixto)", "http://ejemplo.com/og.png"],
    ["IP interna", "https://192.168.1.10/og.png"],
    ["javascript:", "javascript:alert(1)"],
  ])("descarta una imagen %s", (_, imagen) => {
    expect(extraerMetadatos(pagina(`<meta property="og:image" content="${imagen}">`), BASE).imagenUrl).toBeNull();
  });

  it("recorta el título a 300 caracteres y la descripción a 1000", () => {
    const metadatos = extraerMetadatos(
      pagina(`<title>${"t".repeat(500)}</title><meta name="description" content="${"d".repeat(2000)}">`),
      BASE,
    );
    expect([metadatos.titulo?.length, metadatos.descripcion?.length]).toEqual([300, 1000]);
  });

  it("sin metadatos devuelve todo null", () => {
    expect(extraerMetadatos("<p>sin head</p>", BASE)).toEqual({ titulo: null, descripcion: null, imagenUrl: null });
  });
});
