import { requerirUsuario } from "@/lib/auth";
import { manejar } from "@/lib/http";
import { exportarMarcadores } from "@/services/importacion";


/** Descarga mis marcadores en formato HTML de navegador. */
export const GET = manejar(async (request) => {
  const { uid } = await requerirUsuario(request);
  const html = await exportarMarcadores(uid);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="marcadores-${fecha}.html"`,
      "Cache-Control": "no-store",
    },
  });
});
