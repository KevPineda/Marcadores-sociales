import { ErrorApi } from "@/lib/errores";
import { descargarPagina, ErrorDescarga } from "@/services/descarga-segura";
import { extraerMetadatos, METADATOS_VACIOS, type Metadatos } from "@/services/metadatos";

export type VistaPrevia = { metadatos: Metadatos; estado: "ok" | "roto" };

/**
 * Obtiene la vista previa en el servidor (nunca en el navegador).
 * - Dirección interna → 400 (no se guarda).
 * - Página muy grande, lenta o que no es HTML → se guarda sin vista previa.
 * - Sitio caído o 404 → se guarda marcado como roto.
 */
export async function obtenerVistaPrevia(url: string): Promise<VistaPrevia> {
  try {
    const pagina = await descargarPagina(url);
    const metadatos = pagina.html ? extraerMetadatos(pagina.html, pagina.urlFinal) : METADATOS_VACIOS;
    return { metadatos, estado: "ok" };
  } catch (error) {
    if (!(error instanceof ErrorDescarga)) {
      throw error;
    }
    if (error.motivo === "ssrf") {
      throw new ErrorApi(400, "Los datos enviados no son válidos.", [{ campo: "url", mensaje: error.message }]);
    }
    const roto = error.motivo === "red" || (error.motivo === "http" && (error.status === 404 || error.status === 410));
    return { metadatos: METADATOS_VACIOS, estado: roto ? "roto" : "ok" };
  }
}
