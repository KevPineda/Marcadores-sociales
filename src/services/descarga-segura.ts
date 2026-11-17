import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { esIpv4Privada, esIpv6Privada, motivoUrlNoPermitida } from "@/services/url";

/** Límites de toda descarga hacia sitios externos. */
export const LIMITES_DESCARGA = {
  tiempoMs: 5_000,
  maximoBytes: 1024 * 1024,
  maximoRedirecciones: 3,
} as const;

export type MotivoDescarga = "ssrf" | "tiempo" | "tamano" | "redirecciones" | "red" | "http";

/** Error de una descarga externa con su motivo (para decidir qué responder). */
export class ErrorDescarga extends Error {
  override name = "ErrorDescarga";

  constructor(
    readonly motivo: MotivoDescarga,
    mensaje: string,
    readonly status?: number,
  ) {
    super(mensaje);
  }
}

export type PaginaDescargada = { urlFinal: string; html: string | null };

const REDIRECCIONES = new Set([301, 302, 303, 307, 308]);
const CABECERAS = {
  "User-Agent": "MarcadoresSociales/1.0 (vista previa de enlaces)",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
};

/**
 * SSRF, segunda capa: valida esquema y host, y resuelve el DNS para rechazar
 * dominios que apunten a IPs internas. Se repite en cada redirección.
 */
export async function verificarDestinoPublico(url: URL): Promise<void> {
  const motivo = motivoUrlNoPermitida(url.href);
  if (motivo) {
    throw new ErrorDescarga("ssrf", motivo);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    return;
  }

  let direcciones: Array<{ address: string; family: number }>;
  try {
    direcciones = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ErrorDescarga("red", "No se pudo resolver el dominio del enlace.");
  }
  for (const { address, family } of direcciones) {
    if (family === 4 ? esIpv4Privada(address) : esIpv6Privada(address)) {
      throw new ErrorDescarga("ssrf", "El dominio del enlace apunta a una dirección interna.");
    }
  }
}

/** Convierte un fallo de fetch en ErrorDescarga (tiempo agotado o error de red). */
function errorDeRed(error: unknown, senal: AbortSignal): ErrorDescarga {
  if (error instanceof ErrorDescarga) {
    return error;
  }
  return senal.aborted
    ? new ErrorDescarga("tiempo", "El sitio tardó demasiado en responder.")
    : new ErrorDescarga("red", "No se pudo conectar con el sitio.");
}

/**
 * Hace la petición siguiendo redirecciones a mano (máximo 3) y validando cada
 * destino. Nota: entre la resolución DNS y la conexión podría haber un cambio
 * de DNS (rebinding); para cerrarlo del todo haría falta fijar la IP resuelta.
 */
async function solicitar(urlTexto: string, senal: AbortSignal): Promise<{ respuesta: Response; url: URL }> {
  let url = new URL(urlTexto);
  for (let saltos = 0; ; saltos++) {
    await verificarDestinoPublico(url);

    let respuesta: Response;
    try {
      respuesta = await fetch(url, { redirect: "manual", signal: senal, headers: CABECERAS });
    } catch (error) {
      throw errorDeRed(error, senal);
    }
    if (!REDIRECCIONES.has(respuesta.status)) {
      return { respuesta, url };
    }

    await respuesta.body?.cancel();
    const destino = respuesta.headers.get("location");
    if (!destino) {
      throw new ErrorDescarga("red", "El sitio redirigió sin indicar el destino.");
    }
    if (saltos >= LIMITES_DESCARGA.maximoRedirecciones) {
      throw new ErrorDescarga("redirecciones", "El enlace tiene demasiadas redirecciones.");
    }
    url = new URL(destino, url);
  }
}

/** Lee el cuerpo como texto y corta la descarga al superar el máximo de bytes. */
async function leerConLimite(respuesta: Response, senal: AbortSignal): Promise<string> {
  const maximo = LIMITES_DESCARGA.maximoBytes;
  if (Number(respuesta.headers.get("content-length") ?? 0) > maximo) {
    await respuesta.body?.cancel();
    throw new ErrorDescarga("tamano", "La página es demasiado grande.");
  }

  const lector = respuesta.body?.getReader();
  if (!lector) {
    return "";
  }
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maximo) {
        await lector.cancel();
        throw new ErrorDescarga("tamano", "La página es demasiado grande.");
      }
      partes.push(value);
    }
  } catch (error) {
    throw errorDeRed(error, senal);
  }

  const bytes = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    bytes.set(parte, posicion);
    posicion += parte.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Descarga el HTML de una página con tiempo máximo, tamaño máximo y límite de
 * redirecciones. Si el contenido no es HTML devuelve html = null.
 */
export async function descargarPagina(urlTexto: string): Promise<PaginaDescargada> {
  const senal = AbortSignal.timeout(LIMITES_DESCARGA.tiempoMs);
  const { respuesta, url } = await solicitar(urlTexto, senal);

  if (!respuesta.ok) {
    await respuesta.body?.cancel();
    throw new ErrorDescarga("http", `El sitio respondió con el código ${respuesta.status}.`, respuesta.status);
  }
  if (!/text\/html|application\/xhtml\+xml/i.test(respuesta.headers.get("content-type") ?? "")) {
    await respuesta.body?.cancel();
    return { urlFinal: url.href, html: null };
  }
  return { urlFinal: url.href, html: await leerConLimite(respuesta, senal) };
}

/** Códigos que indican que el enlace ya no existe. 401/403/429 no cuentan: suelen ser bloqueos a bots. */
function esCodigoRoto(status: number): boolean {
  return status === 404 || status === 410 || status >= 500;
}

/** Comprueba si un enlace responde (sin descargar el cuerpo). */
export async function comprobarEnlace(urlTexto: string): Promise<"ok" | "roto"> {
  const senal = AbortSignal.timeout(LIMITES_DESCARGA.tiempoMs);
  try {
    const { respuesta } = await solicitar(urlTexto, senal);
    await respuesta.body?.cancel();
    return esCodigoRoto(respuesta.status) ? "roto" : "ok";
  } catch (error) {
    if (error instanceof ErrorDescarga && error.motivo === "ssrf") {
      throw error;
    }
    return "roto";
  }
}
