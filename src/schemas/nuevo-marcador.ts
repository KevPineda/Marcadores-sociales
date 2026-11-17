import { z } from "zod";
import { etiquetaSchema } from "@/schemas/marcador";
import { motivoUrlNoPermitida } from "@/services/url";

export const MAXIMO_ETIQUETAS = 10;

/**
 * Datos para guardar un enlace. Se usa igual en el formulario (cliente) y en
 * el Route Handler (servidor); el servidor es quien decide.
 */
export const nuevoMarcadorSchema = z.strictObject({
  url: z
    .string()
    .trim()
    .min(1, "Escribe o pega un enlace.")
    .max(2048, "El enlace es demasiado largo (máximo 2048 caracteres).")
    .superRefine((url, contexto) => {
      const motivo = motivoUrlNoPermitida(url);
      if (motivo) {
        contexto.addIssue({ code: "custom", message: motivo });
      }
    }),
  titulo: z
    .string()
    .trim()
    .max(300, "El título admite máximo 300 caracteres.")
    .transform((titulo) => titulo || null),
  etiquetas: z
    .array(etiquetaSchema)
    .max(MAXIMO_ETIQUETAS, `Usa máximo ${MAXIMO_ETIQUETAS} etiquetas.`)
    .refine((etiquetas) => new Set(etiquetas).size === etiquetas.length, "Hay etiquetas repetidas."),
  publico: z.boolean(),
});

export type NuevoMarcadorEntrada = z.input<typeof nuevoMarcadorSchema>;
export type NuevoMarcador = z.output<typeof nuevoMarcadorSchema>;

/** Convierte «css, Diseño  web» en ["css", "diseño", "web"] (separa por comas o espacios). */
export function separarEtiquetas(texto: string): string[] {
  return texto
    .split(/[\s,]+/)
    .map((etiqueta) => etiqueta.replace(/^#/, "").toLowerCase())
    .filter(Boolean);
}
