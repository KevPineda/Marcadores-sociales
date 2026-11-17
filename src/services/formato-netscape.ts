import { etiquetaSchema, type Marcador } from "@/schemas/marcador";
import { MAXIMO_ETIQUETAS, separarEtiquetas } from "@/schemas/nuevo-marcador";
import { decodificarEntidades, escaparHtml, limpiarTexto } from "@/services/texto-html";

/** Enlace leído de un archivo de marcadores del navegador. */
export type EnlaceImportado = { url: string; titulo: string | null; etiquetas: string[]; creadoEn: string | null };

/** Lee los atributos de una etiqueta <A ...> (nombres en mayúscula, valores decodificados). */
function leerAtributosEnlace(texto: string): Record<string, string> {
  const atributos: Record<string, string> = {};
  for (const [, nombre, dobles, simples] of texto.matchAll(/([a-z_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    atributos[nombre.toUpperCase()] = decodificarEntidades(dobles ?? simples ?? "");
  }
  return atributos;
}

/** Convierte ADD_DATE (segundos Unix) a ISO, o null si no es válido. */
function fechaDesdeUnix(valor: string | undefined): string | null {
  const segundos = Number(valor);
  if (!valor || !Number.isFinite(segundos) || segundos <= 0) {
    return null;
  }
  const fecha = new Date(segundos * 1000);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Etiquetas válidas del atributo TAGS (sin repetir, máximo 10). */
function leerEtiquetas(valor: string | undefined): string[] {
  const validas = new Set<string>();
  for (const etiqueta of separarEtiquetas(valor ?? "")) {
    const validacion = etiquetaSchema.safeParse(etiqueta);
    if (validacion.success && validas.size < MAXIMO_ETIQUETAS) {
      validas.add(validacion.data);
    }
  }
  return [...validas];
}

/**
 * Lee un archivo de marcadores exportado por un navegador (formato Netscape).
 * No valida las URL: eso lo hace el servicio de importación.
 */
export function leerMarcadoresHtml(html: string): EnlaceImportado[] {
  const enlaces: EnlaceImportado[] = [];
  for (const [, atributosTexto, contenido] of html.matchAll(/<a\s+([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const atributos = leerAtributosEnlace(atributosTexto);
    if (!atributos.HREF) {
      continue;
    }
    enlaces.push({
      url: atributos.HREF.trim(),
      titulo: limpiarTexto(contenido, 300),
      etiquetas: leerEtiquetas(atributos.TAGS),
      creadoEn: fechaDesdeUnix(atributos.ADD_DATE),
    });
  }
  return enlaces;
}

/** Genera un archivo de marcadores (formato Netscape) que cualquier navegador puede importar. */
export function generarMarcadoresHtml(marcadores: Marcador[]): string {
  const lineas = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- Exportado desde Marcadores sociales. -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Marcadores</TITLE>",
    "<H1>Marcadores</H1>",
    "<DL><p>",
  ];
  for (const marcador of marcadores) {
    const fecha = Math.floor(new Date(marcador.creadoEn).getTime() / 1000);
    const etiquetas = marcador.etiquetas.length ? ` TAGS="${escaparHtml(marcador.etiquetas.join(","))}"` : "";
    lineas.push(
      `    <DT><A HREF="${escaparHtml(marcador.url)}" ADD_DATE="${fecha}"${etiquetas}>${escaparHtml(marcador.titulo)}</A>`,
    );
    if (marcador.descripcion) {
      lineas.push(`    <DD>${escaparHtml(marcador.descripcion)}`);
    }
  }
  lineas.push("</DL><p>", "");
  return lineas.join("\n");
}
