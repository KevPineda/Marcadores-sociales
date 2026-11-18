import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE_SESION } from "@/lib/sesion";

/**
 * Redirige a /login si no hay cookie de sesión.
 * Es solo comodidad de navegación: la seguridad real está en `requerirUsuario` de cada ruta de la API.
 */
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.has(NOMBRE_COOKIE_SESION)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("siguiente", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/", "/guardar", "/perfil", "/etiquetas/:path*"],
};
