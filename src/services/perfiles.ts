import { errorNoEncontrado } from "@/lib/errores";
import * as marcadores from "@/repositories/marcadores";
import * as perfiles from "@/repositories/perfiles";
import type { Pagina, Paginacion } from "@/schemas/api";
import type { Marcador } from "@/schemas/marcador";

export type MiPerfil = { nombre: string | null };

/** Nombre público del usuario (null si aún no eligió uno). */
export async function obtenerMiPerfil(uid: string): Promise<MiPerfil> {
  return { nombre: await perfiles.obtenerNombreDeUsuario(uid) };
}

/** Reserva un nombre público para el usuario (único; 409 si está ocupado). */
export async function crearPerfil(uid: string, nombre: string, ahora = new Date()): Promise<MiPerfil> {
  await perfiles.reservarNombre(uid, nombre, ahora.toISOString());
  return { nombre };
}

/** Marcadores públicos de un perfil; 404 si el perfil no existe. */
export async function listarColeccionPublica(nombre: string, paginacion: Paginacion): Promise<Pagina<Marcador>> {
  const uid = await perfiles.obtenerUidDePerfil(nombre);
  if (!uid) {
    throw errorNoEncontrado("No existe una colección pública con ese nombre.");
  }
  return marcadores.listarMarcadoresPublicos(uid, paginacion);
}
