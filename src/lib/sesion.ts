/**
 * Constantes de la sesión compartidas por el servidor y `proxy.ts`
 * (sin dependencias de Firebase para que el proxy sea liviano).
 */
export const NOMBRE_COOKIE_SESION = "sesion";

/** Ruta interna a la que se puede volver después de iniciar sesión; "/" si el valor no es seguro. */
export function rutaInternaSegura(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) {
    return "/";
  }
  try {
    const url = new URL(valor, "http://interno.invalid");
    if (url.origin !== "http://interno.invalid" || url.pathname.startsWith("/login")) {
      return "/";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
