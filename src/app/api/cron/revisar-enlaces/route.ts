import { createHash, timingSafeEqual } from "node:crypto";
import { errorNoAutenticado } from "@/lib/errores";
import { manejar, responderJson } from "@/lib/http";
import { revisarEnlaces } from "@/services/revision-enlaces";

export const maxDuration = 60;

/** Enlaces revisados por ejecución. */
const ENLACES_POR_EJECUCION = 50;

/** Compara el secreto en tiempo constante (sin revelar cuántos caracteres coinciden). */
function esSecretoValido(recibido: string | null): boolean {
  const esperado = process.env.CRON_SECRET;
  if (!esperado || !recibido) {
    return false;
  }
  const resumen = (texto: string): Buffer => createHash("sha256").update(texto).digest();
  return timingSafeEqual(resumen(recibido), resumen(`Bearer ${esperado}`));
}

/** Tarea programada (Vercel Cron) que revisa enlaces rotos. Exige `Authorization: Bearer <CRON_SECRET>`. */
export const GET = manejar(async (request) => {
  if (!esSecretoValido(request.headers.get("authorization"))) {
    throw errorNoAutenticado();
  }
  return responderJson(await revisarEnlaces(ENLACES_POR_EJECUCION));
});
