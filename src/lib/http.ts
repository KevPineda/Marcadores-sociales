import { z } from "zod";
import {
  ErrorApi,
  errorDemasiadoGrande,
  errorProhibido,
  errorTipoNoPermitido,
  errorValidacion,
} from "@/lib/errores";
import { registrarSolicitud } from "@/lib/registro";

/** Contexto que Next.js pasa a los Route Handlers con segmentos dinámicos. */
export type ContextoRuta<P> = { params: Promise<P> };

type Manejador<C> = (request: Request, contexto: C) => Promise<Response>;

const METODOS_QUE_MODIFICAN = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAXIMO_JSON_BYTES = 16 * 1024;

/** Respuesta JSON; por defecto privada (no-store). */
export function responderJson(datos: unknown, status = 200, cabeceras: Record<string, string> = {}): Response {
  return Response.json(datos, { status, headers: { "Cache-Control": "no-store", ...cabeceras } });
}

/** Respuesta 204 sin cuerpo. */
export function responderSinContenido(cabeceras: Record<string, string> = {}): Response {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...cabeceras } });
}

/**
 * Defensa CSRF: en métodos que modifican datos, la cabecera Origin debe ser la
 * del propio sitio. Sin Origin solo se acepta si la petición trae Bearer
 * (clientes como Bruno), porque los navegadores siempre envían Origin en POST.
 */
export function verificarOrigen(request: Request): void {
  if (!METODOS_QUE_MODIFICAN.has(request.method)) {
    return;
  }
  const origen = request.headers.get("origin");
  const permitidos = new Set([new URL(request.url).origin]);
  if (process.env.APP_URL) {
    permitidos.add(new URL(process.env.APP_URL).origin);
  }

  if (origen ? !permitidos.has(origen) : !request.headers.get("authorization")?.startsWith("Bearer ")) {
    throw errorProhibido("Origen de la solicitud no permitido.");
  }
}

/** Lee y valida un cuerpo JSON: 415 si no es JSON, 413 si es grande, 400 si no cumple el esquema. */
export async function leerJson<T extends z.ZodType>(request: Request, esquema: T): Promise<z.output<T>> {
  const tipo = request.headers.get("content-type") ?? "";
  if (!tipo.toLowerCase().startsWith("application/json")) {
    throw errorTipoNoPermitido("application/json");
  }
  const longitud = Number(request.headers.get("content-length") ?? 0);
  if (longitud > MAXIMO_JSON_BYTES) {
    throw errorDemasiadoGrande(MAXIMO_JSON_BYTES);
  }
  const texto = await request.text();
  if (new TextEncoder().encode(texto).length > MAXIMO_JSON_BYTES) {
    throw errorDemasiadoGrande(MAXIMO_JSON_BYTES);
  }

  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new ErrorApi(400, "El cuerpo no es un JSON válido.");
  }
  const validacion = esquema.safeParse(datos);
  if (!validacion.success) {
    throw errorValidacion(validacion.error);
  }
  return validacion.data;
}

/** Valida los parámetros de la URL (query) con un esquema; 400 con detalle si no cumple. */
export function leerConsulta<T extends z.ZodType>(request: Request, esquema: T): z.output<T> {
  const parametros = Object.fromEntries(new URL(request.url).searchParams);
  const validacion = esquema.safeParse(parametros);
  if (!validacion.success) {
    throw errorValidacion(validacion.error);
  }
  return validacion.data;
}

/** Convierte cualquier error en la respuesta { error, detalles? } y registra la solicitud. */
function respuestaDeError(error: unknown): { respuesta: Response; mensaje: string } {
  if (error instanceof ErrorApi) {
    const cuerpo = error.detalles ? { error: error.message, detalles: error.detalles } : { error: error.message };
    return { respuesta: responderJson(cuerpo, error.status, error.cabeceras), mensaje: error.message };
  }
  if (error instanceof z.ZodError) {
    const errorApi = errorValidacion(error);
    return {
      respuesta: responderJson({ error: errorApi.message, detalles: errorApi.detalles }, 400),
      mensaje: errorApi.message,
    };
  }
  const mensaje = error instanceof Error ? `${error.name}: ${error.message}` : "Error desconocido";
  return { respuesta: responderJson({ error: "Error interno del servidor." }, 500), mensaje };
}

/**
 * Envoltorio común de los Route Handlers: verifica el origen, convierte los
 * errores en respuestas consistentes y registra cada solicitud con un id.
 */
export function manejar<C = unknown>(manejador: Manejador<C>): Manejador<C> {
  return async (request, contexto) => {
    const inicio = performance.now();
    const idSolicitud = crypto.randomUUID();
    let respuesta: Response;
    let mensajeError: string | undefined;

    try {
      verificarOrigen(request);
      respuesta = await manejador(request, contexto);
    } catch (error) {
      ({ respuesta, mensaje: mensajeError } = respuestaDeError(error));
    }

    respuesta.headers.set("X-Request-Id", idSolicitud);
    registrarSolicitud({
      idSolicitud,
      metodo: request.method,
      ruta: new URL(request.url).pathname,
      status: respuesta.status,
      duracionMs: Math.round(performance.now() - inicio),
      ...(respuesta.status >= 500 && mensajeError ? { error: mensajeError } : {}),
    });
    return respuesta;
  };
}
