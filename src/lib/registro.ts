/**
 * Registro de solicitudes en una línea JSON (Vercel lo muestra en sus logs).
 * Solo datos técnicos: nunca tokens, cookies, cuerpos ni datos personales.
 */
type EventoSolicitud = {
  idSolicitud: string;
  metodo: string;
  ruta: string;
  status: number;
  duracionMs: number;
  error?: string;
};

/** Registra el resultado de una solicitud. */
export function registrarSolicitud(evento: EventoSolicitud): void {
  // eslint-disable-next-line no-console -- único punto de registro de la API
  console.info(JSON.stringify({ tipo: "solicitud", ...evento }));
}
