import "server-only";
import { cacheLife } from "next/cache";
import datos from "../../public/datos/marcadores-ejemplo.json";
import { listaMarcadoresSchema, type Marcador } from "@/schemas/marcador";

/**
 * Datos de ejemplo leídos en el servidor (Hitos 1 y 2).
 * En el Hito 3 se reemplazan por el repositorio de Firestore.
 */
const MARCADORES = listaMarcadoresSchema.parse(datos);

export type PerfilPublico = { nombre: string; nombreVisible: string };

const PERFILES: PerfilPublico[] = [{ nombre: "demo", nombreVisible: "Colección de ejemplo" }];

/** Nombres de perfiles públicos conocidos (para prerenderizar sus páginas). */
export function listarNombresPerfiles(): string[] {
  return PERFILES.map((perfil) => perfil.nombre);
}

/** Etiquetas usadas en los datos de ejemplo (para prerenderizar sus páginas). */
export function listarEtiquetasEjemplo(): string[] {
  return [...new Set(MARCADORES.flatMap((marcador) => marcador.etiquetas))];
}

/** Perfil público por nombre, o null si no existe. */
export async function obtenerPerfilPublico(nombre: string): Promise<PerfilPublico | null> {
  "use cache";
  cacheLife("hours");
  return PERFILES.find((perfil) => perfil.nombre === nombre) ?? null;
}

/** Solo los marcadores públicos del perfil, del más reciente al más antiguo. */
export async function obtenerMarcadoresPublicos(nombre: string): Promise<Marcador[]> {
  "use cache";
  cacheLife("hours");
  if (!PERFILES.some((perfil) => perfil.nombre === nombre)) {
    return [];
  }
  return MARCADORES.filter((marcador) => marcador.publico).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}
