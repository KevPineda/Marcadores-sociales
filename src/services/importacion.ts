import { ErrorApi } from "@/lib/errores";
import * as repositorio from "@/repositories/marcadores";
import type { Marcador } from "@/schemas/marcador";
import { obtenerDominio } from "@/services/filtrar-marcadores";
import { generarMarcadoresHtml, leerMarcadoresHtml } from "@/services/formato-netscape";
import { idDesdeUrl, motivoUrlNoPermitida, normalizarUrl } from "@/services/url";

export const MAXIMO_ENLACES_IMPORTACION = 1000;

export type ResultadoImportacion = { importados: number; duplicados: number; invalidos: number };

/**
 * Importa un archivo de marcadores del navegador. Las URL internas o no http(s)
 * se descartan; los duplicados (en el archivo o ya guardados) se omiten.
 * No descarga vistas previas: se importan como privados con el título del archivo.
 */
export async function importarMarcadores(uid: string, html: string, ahora = new Date()): Promise<ResultadoImportacion> {
  const enlaces = leerMarcadoresHtml(html);
  if (enlaces.length > MAXIMO_ENLACES_IMPORTACION) {
    throw new ErrorApi(400, `El archivo tiene más de ${MAXIMO_ENLACES_IMPORTACION} enlaces.`);
  }

  const porId = new Map<string, Marcador>();
  let invalidos = 0;
  for (const enlace of enlaces) {
    if (motivoUrlNoPermitida(enlace.url) || enlace.url.length > 2048) {
      invalidos += 1;
      continue;
    }
    const url = normalizarUrl(enlace.url);
    const id = await idDesdeUrl(url);
    if (porId.has(id)) {
      continue;
    }
    porId.set(id, {
      id,
      url,
      titulo: enlace.titulo ?? obtenerDominio(url),
      descripcion: null,
      imagenUrl: null,
      etiquetas: enlace.etiquetas,
      publico: false,
      estado: "ok",
      creadoEn: enlace.creadoEn ?? ahora.toISOString(),
    });
  }

  const importados = await repositorio.crearVariosMarcadores(uid, [...porId.values()]);
  return { importados, duplicados: enlaces.length - invalidos - importados, invalidos };
}

/** Exporta todos los marcadores del usuario en formato HTML de navegador. */
export async function exportarMarcadores(uid: string): Promise<string> {
  return generarMarcadoresHtml(await repositorio.listarTodosLosMarcadores(uid));
}
