import { listaMarcadoresSchema, type Marcador } from "@/schemas/marcador";

/**
 * Almacén temporal en localStorage para el Hito 2.
 * En el Hito 3 se reemplaza por POST/GET a la API (Firestore).
 */
const CLAVE = "marcadores-sociales:locales";

/** Lee los marcadores guardados en este navegador; si algo falla devuelve []. */
export function leerMarcadoresLocales(): Marcador[] {
  try {
    const texto = window.localStorage.getItem(CLAVE);
    if (!texto) {
      return [];
    }
    const validacion = listaMarcadoresSchema.safeParse(JSON.parse(texto));
    return validacion.success ? validacion.data : [];
  } catch {
    return [];
  }
}

/** Guarda un marcador al inicio de la lista local. Devuelve false si el navegador no lo permite. */
export function guardarMarcadorLocal(marcador: Marcador): boolean {
  try {
    const marcadores = [marcador, ...leerMarcadoresLocales()];
    window.localStorage.setItem(CLAVE, JSON.stringify(marcadores));
    return true;
  } catch {
    return false;
  }
}
