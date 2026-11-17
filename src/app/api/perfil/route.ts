import { requerirUsuario } from "@/lib/auth";
import { leerJson, manejar, responderJson } from "@/lib/http";
import { crearPerfilSchema } from "@/schemas/api";
import { crearPerfil, obtenerMiPerfil } from "@/services/perfiles";


/** Mi nombre público (null si aún no tengo). */
export const GET = manejar(async (request) => {
  const { uid } = await requerirUsuario(request);
  return responderJson(await obtenerMiPerfil(uid));
});

/** Elige un nombre público único para la colección /u/[nombre]. */
export const POST = manejar(async (request) => {
  const { uid } = await requerirUsuario(request);
  const { nombre } = await leerJson(request, crearPerfilSchema);
  return responderJson(await crearPerfil(uid, nombre), 201, { Location: `/u/${nombre}` });
});
