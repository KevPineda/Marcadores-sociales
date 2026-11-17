import { requerirUsuario } from "@/lib/auth";
import { manejar, responderJson } from "@/lib/http";


/** Usuario de la sesión actual. */
export const GET = manejar(async (request) => {
  const usuario = await requerirUsuario(request);
  return responderJson({ usuario });
});
