import { listaMarcadoresSchema, type Marcador } from "@/schemas/marcador";

/** Ruta de los datos de ejemplo del Hito 1 (luego se reemplaza por la API). */
export const URL_MARCADORES_EJEMPLO = "/datos/marcadores-ejemplo.json";

/** Error de carga con un mensaje apto para mostrar al usuario. */
export class ErrorCarga extends Error {
  override name = "ErrorCarga";
}

/** Descarga los marcadores con fetch y valida su forma con Zod. */
export async function cargarMarcadores(signal?: AbortSignal): Promise<Marcador[]> {
  const respuesta = await fetch(URL_MARCADORES_EJEMPLO, { signal, headers: { Accept: "application/json" } });
  if (!respuesta.ok) {
    throw new ErrorCarga(`No se pudieron cargar los marcadores (código ${respuesta.status}).`);
  }

  const datos: unknown = await respuesta.json();
  const validacion = listaMarcadoresSchema.safeParse(datos);
  if (!validacion.success) {
    throw new ErrorCarga("Los datos recibidos no tienen el formato esperado.");
  }
  return validacion.data;
}
