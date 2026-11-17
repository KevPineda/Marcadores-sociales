import * as repositorio from "@/repositories/marcadores";
import { comprobarEnlace, ErrorDescarga } from "@/services/descarga-segura";

export type ResultadoRevision = { revisados: number; rotos: number };

/** Cuántos enlaces se revisan a la vez (no saturar la función ni los sitios). */
const CONCURRENCIA = 5;

/**
 * Revisa los enlaces que llevan más tiempo sin comprobarse y guarda si están
 * rotos. Un enlace que ahora apunta a una dirección interna se marca roto.
 */
export async function revisarEnlaces(limite: number, ahora = new Date()): Promise<ResultadoRevision> {
  const pendientes = await repositorio.listarPendientesDeRevision(limite);
  const revisadoEn = ahora.toISOString();
  let rotos = 0;

  for (let inicio = 0; inicio < pendientes.length; inicio += CONCURRENCIA) {
    const grupo = pendientes.slice(inicio, inicio + CONCURRENCIA);
    await Promise.all(
      grupo.map(async ({ ruta, url }) => {
        let estado: "ok" | "roto";
        try {
          estado = await comprobarEnlace(url);
        } catch (error) {
          if (!(error instanceof ErrorDescarga)) {
            throw error;
          }
          estado = "roto";
        }
        if (estado === "roto") {
          rotos += 1;
        }
        await repositorio.guardarRevision(ruta, estado, revisadoEn);
      }),
    );
  }
  return { revisados: pendientes.length, rotos };
}
