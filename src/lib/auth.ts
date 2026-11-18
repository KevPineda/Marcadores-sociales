import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { ErrorApi, errorNoAutenticado, errorProhibido } from "@/lib/errores";
import { obtenerAuth } from "@/lib/firebase-admin";
import { NOMBRE_COOKIE_SESION } from "@/lib/sesion";

export { NOMBRE_COOKIE_SESION };

/** Duración de la cookie de sesión: 5 días (Firebase admite de 5 min a 2 semanas). */
export const DURACION_SESION_MS = 5 * 24 * 60 * 60 * 1000;

/** Máximo tiempo desde el inicio de sesión para crear la cookie (inicio de sesión reciente). */
export const MAXIMO_EDAD_INICIO_SESION_S = 5 * 60;

export type Rol = "usuario" | "admin";
export type Usuario = { uid: string; correo: string | null; rol: Rol };

/** Lee una cookie de la cabecera Cookie. */
export function leerCookie(request: Request, nombre: string): string | null {
  const cabecera = request.headers.get("cookie") ?? "";
  for (const parte of cabecera.split(";")) {
    const [clave, ...valor] = parte.trim().split("=");
    if (clave === nombre) {
      return decodeURIComponent(valor.join("="));
    }
  }
  return null;
}

/** Convierte las claims verificadas en el usuario de la aplicación. */
function usuarioDesdeClaims(claims: DecodedIdToken): Usuario {
  return { uid: claims.uid, correo: claims.email ?? null, rol: claims.rol === "admin" ? "admin" : "usuario" };
}

/**
 * Verifica la sesión de la petición y devuelve el usuario; 401 si no hay o no es válida.
 * Acepta la cookie de sesión (navegador) o `Authorization: Bearer <idToken>` (Bruno/Postman).
 * Comprueba la revocación de tokens en ambos casos.
 */
export async function requerirUsuario(request: Request): Promise<Usuario> {
  const cookie = leerCookie(request, NOMBRE_COOKIE_SESION);
  const autorizacion = request.headers.get("authorization");
  const token = autorizacion?.startsWith("Bearer ") ? autorizacion.slice(7) : null;
  if (!cookie && !token) {
    throw errorNoAutenticado();
  }

  const auth = obtenerAuth();
  try {
    const claims = cookie ? await auth.verifySessionCookie(cookie, true) : await auth.verifyIdToken(token ?? "", true);
    return usuarioDesdeClaims(claims);
  } catch {
    throw errorNoAutenticado();
  }
}

/**
 * Exige una sesión con rol `admin` (custom claim de Firebase): 401 sin sesión, 403 si es usuario normal.
 * El rol se asigna solo desde el servidor (scripts/asignar-rol.mjs); nadie puede dárselo desde el navegador.
 */
export async function requerirAdmin(request: Request): Promise<Usuario> {
  const usuario = await requerirUsuario(request);
  if (usuario.rol !== "admin") {
    throw errorProhibido("Solo un administrador puede hacer esto.");
  }
  return usuario;
}

/**
 * Crea la cookie de sesión de Firebase a partir del idToken.
 * Exige un inicio de sesión reciente (auth_time de menos de 5 minutos); 401 si no.
 */
export async function crearCookieDeSesion(idToken: string): Promise<string> {
  const auth = obtenerAuth();
  let authTime: number;
  try {
    authTime = (await auth.verifyIdToken(idToken, true)).auth_time;
  } catch {
    throw errorNoAutenticado();
  }
  if (Date.now() / 1000 - authTime > MAXIMO_EDAD_INICIO_SESION_S) {
    throw new ErrorApi(401, "Tu inicio de sesión no es reciente. Vuelve a iniciar sesión.");
  }
  return auth.createSessionCookie(idToken, { expiresIn: DURACION_SESION_MS });
}

/** Revoca los refresh tokens del dueño de la cookie (si es válida) para cerrar la sesión en todos lados. */
export async function revocarSesion(cookie: string): Promise<void> {
  try {
    const auth = obtenerAuth();
    const { sub } = await auth.verifySessionCookie(cookie);
    await auth.revokeRefreshTokens(sub);
  } catch {
    // Cookie vencida o inválida: no hay nada que revocar.
  }
}

/** Cabecera Set-Cookie de la sesión (HttpOnly, Secure, SameSite=Lax). */
export function cookieDeSesion(valor: string): string {
  return [
    `${NOMBRE_COOKIE_SESION}=${encodeURIComponent(valor)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${Math.floor(DURACION_SESION_MS / 1000)}`,
  ].join("; ");
}

/** Cabecera Set-Cookie que borra la sesión. */
export function cookieDeSesionVencida(): string {
  return `${NOMBRE_COOKIE_SESION}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
