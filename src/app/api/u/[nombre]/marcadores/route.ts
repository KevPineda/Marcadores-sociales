import { errorNoEncontrado } from "@/lib/errores";
import { leerConsulta, manejar, responderJson, type ContextoRuta } from "@/lib/http";
import { ipCliente, limitarFrecuencia } from "@/lib/limite-frecuencia";
import { paginacionSchema } from "@/schemas/api";
import { nombrePerfilSchema } from "@/schemas/marcador";
import { listarColeccionPublica } from "@/services/perfiles";


/** Lectura pública: caché compartida de 60 s en la CDN. */
const CACHE_PUBLICA = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

/** Marcadores públicos de una persona (sin sesión). */
export const GET = manejar<ContextoRuta<{ nombre: string }>>(async (request, { params }) => {
  limitarFrecuencia(`publico:${ipCliente(request)}`, 60, 60_000);
  const validacion = nombrePerfilSchema.safeParse((await params).nombre);
  if (!validacion.success) {
    throw errorNoEncontrado("No existe una colección pública con ese nombre.");
  }
  const paginacion = leerConsulta(request, paginacionSchema);
  return responderJson(await listarColeccionPublica(validacion.data, paginacion), 200, CACHE_PUBLICA);
});
