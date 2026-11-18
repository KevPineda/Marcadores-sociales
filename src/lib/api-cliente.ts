import { z } from "zod";
import { listaMarcadoresSchema, marcadorSchema, type Marcador } from "@/schemas/marcador";
import type { Pagina } from "@/schemas/api";
import type { NuevoMarcador } from "@/schemas/nuevo-marcador";

/** Error de la API con su código HTTP y los detalles por campo. */
export class ErrorApiCliente extends Error {
  override name = "ErrorApiCliente";

  constructor(
    readonly status: number,
    mensaje: string,
    readonly detalles: Array<{ campo: string; mensaje: string }> = [],
  ) {
    super(mensaje);
  }
}

const cuerpoErrorSchema = z.object({
  error: z.string(),
  detalles: z.array(z.object({ campo: z.string(), mensaje: z.string() })).optional(),
});

const paginaMarcadoresSchema = z.object({
  items: listaMarcadoresSchema,
  siguienteCursor: z.string().nullable(),
});

const miPerfilSchema = z.object({ nombre: z.string().nullable() });

const usuarioActualSchema = z.object({
  usuario: z.object({ uid: z.string(), correo: z.string().nullable(), rol: z.enum(["usuario", "admin"]) }),
});

const resultadoRevisionSchema = z.object({ revisados: z.number(), rotos: z.number() });

const MENSAJE_SIN_CONEXION = "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
const MENSAJE_FORMATO = "La respuesta del servidor no tiene el formato esperado.";

/** Hace la petición a la API del mismo sitio y lanza ErrorApiCliente si no es 2xx. */
async function pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ErrorApiCliente(0, MENSAJE_SIN_CONEXION);
  }
  if (respuesta.ok) {
    return respuesta;
  }
  const cuerpo = cuerpoErrorSchema.safeParse(await respuesta.json().catch(() => null));
  throw new ErrorApiCliente(
    respuesta.status,
    cuerpo.success ? cuerpo.data.error : `El servidor respondió con el código ${respuesta.status}.`,
    cuerpo.success ? (cuerpo.data.detalles ?? []) : [],
  );
}

/** Lee el cuerpo JSON y lo valida con Zod. */
async function leer<T>(respuesta: Response, esquema: z.ZodType<T>): Promise<T> {
  const validacion = esquema.safeParse(await respuesta.json().catch(() => null));
  if (!validacion.success) {
    throw new ErrorApiCliente(respuesta.status, MENSAJE_FORMATO);
  }
  return validacion.data;
}

/** Una página de mis marcadores (100 por página). */
export async function listarMisMarcadores(cursor: string | null, signal?: AbortSignal): Promise<Pagina<Marcador>> {
  const parametros = new URLSearchParams({ limite: "100" });
  if (cursor) {
    parametros.set("cursor", cursor);
  }
  return leer(await pedir(`/api/marcadores?${parametros}`, { signal }), paginaMarcadoresSchema);
}

/** Guarda un enlace; el servidor obtiene la vista previa. */
export async function guardarMarcador(datos: NuevoMarcador): Promise<Marcador> {
  return leer(await pedir("/api/marcadores", { method: "POST", body: JSON.stringify(datos) }), marcadorSchema);
}

/** Elimina uno de mis marcadores. */
export async function eliminarMarcador(id: string): Promise<void> {
  await pedir(`/api/marcadores/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Cambia el idToken de Firebase por la cookie de sesión HttpOnly. */
export async function crearSesion(idToken: string): Promise<void> {
  await pedir("/api/auth/sesion", { method: "POST", body: JSON.stringify({ idToken }) });
}

/** Cierra la sesión (borra la cookie y revoca los tokens). */
export async function cerrarSesion(): Promise<void> {
  await pedir("/api/auth/sesion", { method: "DELETE" });
}

/** Mi nombre público, o null si aún no elegí uno. */
export async function obtenerMiPerfil(): Promise<{ nombre: string | null }> {
  return leer(await pedir("/api/perfil"), miPerfilSchema);
}

/** Reserva mi nombre público. */
export async function crearMiPerfil(nombre: string): Promise<{ nombre: string | null }> {
  return leer(await pedir("/api/perfil", { method: "POST", body: JSON.stringify({ nombre }) }), miPerfilSchema);
}

/** Usuario de la sesión actual (con su rol). */
export async function obtenerUsuarioActual(): Promise<z.infer<typeof usuarioActualSchema>["usuario"]> {
  return (await leer(await pedir("/api/auth/yo"), usuarioActualSchema)).usuario;
}

/** Solo administradores: revisa ahora los enlaces rotos. */
export async function revisarEnlacesAhora(): Promise<z.infer<typeof resultadoRevisionSchema>> {
  return leer(await pedir("/api/cron/revisar-enlaces", { method: "POST" }), resultadoRevisionSchema);
}

/** Lleva a la página de inicio de sesión y vuelve después a la página actual. */
export function irAlLogin(): void {
  const actual = `${window.location.pathname}${window.location.search}`;
  // Navegación completa a propósito: se llama fuera de los componentes y descarta el estado sin sesión.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?siguiente=${encodeURIComponent(actual)}`);
}
