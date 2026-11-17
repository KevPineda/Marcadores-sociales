import { requerirUsuario } from "@/lib/auth";
import { ErrorApi, errorDemasiadoGrande, errorTipoNoPermitido } from "@/lib/errores";
import { manejar, responderJson } from "@/lib/http";
import { limitarFrecuencia } from "@/lib/limite-frecuencia";
import { importarMarcadores } from "@/services/importacion";


const MAXIMO_ARCHIVO_BYTES = 2 * 1024 * 1024;

/** Importa un archivo HTML de marcadores (campo «archivo» de un multipart/form-data). */
export const POST = manejar(async (request) => {
  const { uid } = await requerirUsuario(request);
  limitarFrecuencia(`importar:${uid}`, 5, 60_000);

  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    throw errorTipoNoPermitido("multipart/form-data");
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAXIMO_ARCHIVO_BYTES + 64 * 1024) {
    throw errorDemasiadoGrande(MAXIMO_ARCHIVO_BYTES);
  }

  const archivo = (await request.formData()).get("archivo");
  if (!(archivo instanceof File)) {
    throw new ErrorApi(400, "Los datos enviados no son válidos.", [
      { campo: "archivo", mensaje: "Adjunta el archivo HTML exportado por tu navegador." },
    ]);
  }
  if (archivo.size > MAXIMO_ARCHIVO_BYTES) {
    throw errorDemasiadoGrande(MAXIMO_ARCHIVO_BYTES);
  }
  if (archivo.type && archivo.type !== "text/html") {
    throw errorTipoNoPermitido("un archivo text/html");
  }

  return responderJson(await importarMarcadores(uid, await archivo.text()));
});
