import { requerirUsuario } from "@/lib/auth";
import { errorNoEncontrado } from "@/lib/errores";
import { leerJson, manejar, responderJson, responderSinContenido, type ContextoRuta } from "@/lib/http";
import { actualizarMarcadorSchema, idMarcadorSchema } from "@/schemas/api";
import { actualizarMarcador, eliminarMarcador, obtenerMarcador } from "@/services/marcadores";


type Contexto = ContextoRuta<{ id: string }>;

/** Valida el id de la ruta; un id mal formado responde 404 como uno inexistente. */
async function leerId(contexto: Contexto): Promise<string> {
  const validacion = idMarcadorSchema.safeParse((await contexto.params).id);
  if (!validacion.success) {
    throw errorNoEncontrado("No encontramos ese marcador.");
  }
  return validacion.data;
}

/** Un marcador propio. */
export const GET = manejar<Contexto>(async (request, contexto) => {
  const { uid } = await requerirUsuario(request);
  return responderJson(await obtenerMarcador(uid, await leerId(contexto)));
});

/** Edita título, etiquetas o visibilidad. */
export const PATCH = manejar<Contexto>(async (request, contexto) => {
  const { uid } = await requerirUsuario(request);
  const id = await leerId(contexto);
  const cambios = await leerJson(request, actualizarMarcadorSchema);
  return responderJson(await actualizarMarcador(uid, id, cambios));
});

/** Elimina un marcador propio. */
export const DELETE = manejar<Contexto>(async (request, contexto) => {
  const { uid } = await requerirUsuario(request);
  await eliminarMarcador(uid, await leerId(contexto));
  return responderSinContenido();
});
