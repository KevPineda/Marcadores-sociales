import type { z } from "zod";

export type DetalleError = { campo: string; mensaje: string };

/** Error con código HTTP y mensaje apto para el cliente (nunca detalles internos). */
export class ErrorApi extends Error {
  override name = "ErrorApi";

  constructor(
    readonly status: number,
    mensaje: string,
    readonly detalles?: DetalleError[],
    readonly cabeceras?: Record<string, string>,
  ) {
    super(mensaje);
  }
}

/** 400 con el detalle por campo de una validación de Zod. */
export function errorValidacion(error: z.ZodError): ErrorApi {
  const detalles: DetalleError[] = [];
  for (const issue of error.issues) {
    detalles.push({ campo: issue.path.join(".") || "(cuerpo)", mensaje: issue.message });
  }
  return new ErrorApi(400, "Los datos enviados no son válidos.", detalles);
}

/** 401: falta la sesión o no es válida. */
export function errorNoAutenticado(): ErrorApi {
  return new ErrorApi(401, "Inicia sesión para continuar.");
}

/** 403: hay sesión, pero no permiso. */
export function errorProhibido(mensaje = "No tienes permiso para esta acción."): ErrorApi {
  return new ErrorApi(403, mensaje);
}

/** 404: no existe o no es tuyo (no se revela cuál de los dos). */
export function errorNoEncontrado(mensaje = "No encontramos lo que buscas."): ErrorApi {
  return new ErrorApi(404, mensaje);
}

/** 409: conflicto con el estado actual (duplicado, nombre ocupado). */
export function errorConflicto(mensaje: string): ErrorApi {
  return new ErrorApi(409, mensaje);
}

/** 413: el cuerpo supera el tamaño permitido. */
export function errorDemasiadoGrande(maximoBytes: number): ErrorApi {
  return new ErrorApi(413, `El contenido supera el máximo permitido (${Math.round(maximoBytes / 1024)} KB).`);
}

/** 415: tipo de contenido no admitido. */
export function errorTipoNoPermitido(esperado: string): ErrorApi {
  return new ErrorApi(415, `Tipo de contenido no admitido. Se esperaba ${esperado}.`);
}

/** 429: demasiadas solicitudes, con la cabecera Retry-After. */
export function errorDemasiadasSolicitudes(segundos: number): ErrorApi {
  return new ErrorApi(429, "Demasiadas solicitudes. Intenta de nuevo en unos segundos.", undefined, {
    "Retry-After": String(segundos),
  });
}
