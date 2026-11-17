import { requerirUsuario } from "@/lib/auth";
import { leerConsulta, leerJson, manejar, responderJson } from "@/lib/http";
import { limitarFrecuencia } from "@/lib/limite-frecuencia";
import { consultaMarcadoresSchema } from "@/schemas/api";
import { nuevoMarcadorSchema } from "@/schemas/nuevo-marcador";
import { crearMarcador, listarMarcadores } from "@/services/marcadores";


/** Mis marcadores, paginados por cursor y con filtro opcional por etiqueta. */
export const GET = manejar(async (request) => {
  const { uid } = await requerirUsuario(request);
  const consulta = leerConsulta(request, consultaMarcadoresSchema);
  return responderJson(await listarMarcadores(uid, consulta));
});

/** Guarda un enlace con vista previa automática (extraída en el servidor). */
export const POST = manejar(async (request) => {
  const { uid } = await requerirUsuario(request);
  limitarFrecuencia(`crear:${uid}`, 30, 60_000);
  const entrada = await leerJson(request, nuevoMarcadorSchema);
  const marcador = await crearMarcador(uid, entrada);
  return responderJson(marcador, 201, { Location: `/api/marcadores/${marcador.id}` });
});
