import { limpiarTexto } from "@/services/texto-html";
import { esHostInterno } from "@/services/url";

export type Metadatos = { titulo: string | null; descripcion: string | null; imagenUrl: string | null };

export const METADATOS_VACIOS: Metadatos = { titulo: null, descripcion: null, imagenUrl: null };

/** Solo se analiza el <head> (o los primeros 256 KB si no se encuentra su cierre). */
const MAXIMO_CABECERA = 256 * 1024;

/** Lee los atributos de una etiqueta HTML en un objeto (nombres en minúscula). */
function leerAtributos(etiqueta: string): Record<string, string> {
  const atributos: Record<string, string> = {};
  for (const [, nombre, , dobles, simples, sinComillas] of etiqueta.matchAll(
    /([a-z][a-z0-9:_-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi,
  )) {
    atributos[nombre.toLowerCase()] = dobles ?? simples ?? sinComillas ?? "";
  }
  return atributos;
}

/** Mapa property/name → content de las etiquetas <meta> (gana la primera aparición). */
function leerMetas(cabecera: string): Map<string, string> {
  const metas = new Map<string, string>();
  for (const [etiqueta] of cabecera.matchAll(/<meta\b[^>]*>/gi)) {
    const atributos = leerAtributos(etiqueta);
    const clave = (atributos.property ?? atributos.name)?.toLowerCase();
    if (clave && atributos.content !== undefined && !metas.has(clave)) {
      metas.set(clave, atributos.content);
    }
  }
  return metas;
}

/** Resuelve la imagen contra la URL de la página; solo https y hosts públicos. */
function resolverImagen(valor: string | undefined, urlBase: string): string | null {
  if (!valor) {
    return null;
  }
  try {
    const url = new URL(valor.trim(), urlBase);
    const valida = url.protocol === "https:" && !esHostInterno(url.hostname) && url.href.length <= 2048;
    return valida ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Extrae título, descripción e imagen (Open Graph, Twitter o HTML básico).
 * Todo lo extraído es texto no confiable: se limpia aquí y React lo escapa al mostrarlo.
 */
export function extraerMetadatos(html: string, urlBase: string): Metadatos {
  const finCabecera = html.search(/<\/head>/i);
  const cabecera = html.slice(0, finCabecera === -1 ? MAXIMO_CABECERA : finCabecera);
  const metas = leerMetas(cabecera);
  const tituloHtml = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(cabecera)?.[1];

  return {
    titulo: limpiarTexto(metas.get("og:title") ?? metas.get("twitter:title") ?? tituloHtml, 300),
    descripcion: limpiarTexto(
      metas.get("og:description") ?? metas.get("twitter:description") ?? metas.get("description"),
      1000,
    ),
    imagenUrl: resolverImagen(
      metas.get("og:image") ?? metas.get("og:image:url") ?? metas.get("twitter:image"),
      urlBase,
    ),
  };
}
