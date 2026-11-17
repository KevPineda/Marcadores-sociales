import { errorDemasiadasSolicitudes } from "@/lib/errores";

/**
 * Límite de frecuencia por ventana fija, en memoria.
 * En Vercel cada instancia tiene su propia memoria, así que es una defensa
 * básica; la protección fuerte es una regla de rate limit del Firewall de Vercel.
 */
const ventanas = new Map<string, { inicio: number; total: number }>();

/** IP del cliente según el proxy de Vercel (primera de x-forwarded-for). */
export function ipCliente(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
}

/** Cuenta una solicitud para la clave; lanza 429 con Retry-After si se supera el máximo. */
export function limitarFrecuencia(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): void {
  const ventana = ventanas.get(clave);
  if (!ventana || ahora - ventana.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, total: 1 });
    return;
  }
  ventana.total += 1;
  if (ventana.total > maximo) {
    throw errorDemasiadasSolicitudes(Math.ceil((ventana.inicio + ventanaMs - ahora) / 1000));
  }
}

/** Limpia los contadores (solo para pruebas). */
export function reiniciarLimites(): void {
  ventanas.clear();
}
