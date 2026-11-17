import { errorConflicto, errorNoEncontrado } from "@/lib/errores";
import * as repositorio from "@/repositories/marcadores";
import type { CambiosMarcador, ConsultaMarcadores, Pagina } from "@/schemas/api";
import type { Marcador } from "@/schemas/marcador";
import type { NuevoMarcador } from "@/schemas/nuevo-marcador";
import { obtenerDominio } from "@/services/filtrar-marcadores";
import { idDesdeUrl, normalizarUrl } from "@/services/url";
import { obtenerVistaPrevia } from "@/services/vista-previa";

/**
 * Guarda un enlace: normaliza la URL, rechaza duplicados (409) antes de
 * descargar nada y obtiene la vista previa en el servidor.
 */
export async function crearMarcador(uid: string, entrada: NuevoMarcador, ahora = new Date()): Promise<Marcador> {
  const url = normalizarUrl(entrada.url);
  const id = await idDesdeUrl(url);
  if (await repositorio.existeMarcador(uid, id)) {
    throw errorConflicto("Ya guardaste este enlace.");
  }

  const { metadatos, estado } = await obtenerVistaPrevia(url);
  const marcador: Marcador = {
    id,
    url,
    titulo: entrada.titulo ?? metadatos.titulo ?? obtenerDominio(url),
    descripcion: metadatos.descripcion,
    imagenUrl: metadatos.imagenUrl,
    etiquetas: entrada.etiquetas,
    publico: entrada.publico,
    estado,
    creadoEn: ahora.toISOString(),
  };
  await repositorio.crearMarcador(uid, marcador);
  return marcador;
}

/** Lista paginada de los marcadores del usuario. */
export async function listarMarcadores(uid: string, consulta: ConsultaMarcadores): Promise<Pagina<Marcador>> {
  return repositorio.listarMarcadores(uid, consulta);
}

/** Un marcador del usuario; 404 si no existe o es de otra persona. */
export async function obtenerMarcador(uid: string, id: string): Promise<Marcador> {
  const marcador = await repositorio.obtenerMarcador(uid, id);
  if (!marcador) {
    throw errorNoEncontrado("No encontramos ese marcador.");
  }
  return marcador;
}

/** Actualiza título, etiquetas o visibilidad y devuelve el marcador actualizado. */
export async function actualizarMarcador(uid: string, id: string, cambios: CambiosMarcador): Promise<Marcador> {
  await repositorio.actualizarMarcador(uid, id, cambios);
  return obtenerMarcador(uid, id);
}

/** Elimina un marcador del usuario. */
export async function eliminarMarcador(uid: string, id: string): Promise<void> {
  await repositorio.eliminarMarcador(uid, id);
}
