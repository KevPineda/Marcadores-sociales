import type { Marcador } from "@/schemas/marcador";

/** Crea un marcador de prueba con valores por defecto. */
export function crearMarcador(cambios: Partial<Marcador> = {}): Marcador {
  return {
    id: "m1",
    url: "https://developer.mozilla.org/es/docs/Web/API/Fetch_API",
    titulo: "Uso de Fetch",
    descripcion: "Solicitudes HTTP desde JavaScript.",
    imagenUrl: null,
    etiquetas: ["javascript"],
    publico: true,
    estado: "ok",
    creadoEn: "2026-11-02T14:10:00Z",
    ...cambios,
  };
}

export const MARCADORES_PRUEBA: Marcador[] = [
  crearMarcador(),
  crearMarcador({
    id: "m2",
    url: "https://web.dev/articles/vitals",
    titulo: "Métricas web esenciales",
    descripcion: "LCP, INP y CLS.",
    etiquetas: ["rendimiento"],
  }),
  crearMarcador({
    id: "m3",
    url: "https://owasp.org/ssrf",
    titulo: "Prevención de SSRF",
    descripcion: null,
    etiquetas: ["seguridad", "javascript"],
  }),
];
