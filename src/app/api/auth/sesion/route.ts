import {
  cookieDeSesion,
  cookieDeSesionVencida,
  crearCookieDeSesion,
  leerCookie,
  NOMBRE_COOKIE_SESION,
  revocarSesion,
} from "@/lib/auth";
import { leerJson, manejar, responderSinContenido } from "@/lib/http";
import { ipCliente, limitarFrecuencia } from "@/lib/limite-frecuencia";
import { crearSesionSchema } from "@/schemas/api";


/** Crea la cookie de sesión a partir del idToken de un inicio de sesión reciente. */
export const POST = manejar(async (request) => {
  limitarFrecuencia(`sesion:${ipCliente(request)}`, 10, 60_000);
  const { idToken } = await leerJson(request, crearSesionSchema);
  const cookie = await crearCookieDeSesion(idToken);
  return responderSinContenido({ "Set-Cookie": cookieDeSesion(cookie) });
});

/** Cierra la sesión: revoca los refresh tokens y borra la cookie. */
export const DELETE = manejar(async (request) => {
  const cookie = leerCookie(request, NOMBRE_COOKIE_SESION);
  if (cookie) {
    await revocarSesion(cookie);
  }
  return responderSinContenido({ "Set-Cookie": cookieDeSesionVencida() });
});
