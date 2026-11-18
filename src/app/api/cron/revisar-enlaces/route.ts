import { createHash, timingSafeEqual } from "node:crypto";
import { requerirAdmin } from "@/lib/auth";
import { errorNoAutenticado } from "@/lib/errores";
import { manejar, responderJson } from "@/lib/http";
import { limitarFrecuencia } from "@/lib/limite-frecuencia";
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

/** Revisión manual desde la interfaz: solo con sesión de administrador (403 para usuarios normales). */
export const POST = manejar(async (request) => {
  const { uid } = await requerirAdmin(request);
  limitarFrecuencia(`revision-manual:${uid}`, 5, 60_000);
  return responderJson(await revisarEnlaces(ENLACES_POR_EJECUCION));
});
