import { z } from "zod";
import { etiquetaSchema, nombrePerfilSchema } from "@/schemas/marcador";
import { listaEtiquetasSchema, tituloSchema } from "@/schemas/nuevo-marcador";

/** Id de un marcador: SHA-256 en hexadecimal de la URL normalizada. */
export const idMarcadorSchema = z.string().regex(/^[0-9a-f]{64}$/, "El id no es válido.");

/** Paginación por cursor: ?limite=20&cursor=<id> (limite máximo 100). */
export const paginacionSchema = z.object({
  limite: z.coerce
    .number()
    .int("El límite debe ser un número entero.")
    .min(1, "El límite mínimo es 1.")
    .max(100, "El límite máximo es 100.")
    .default(20),
  cursor: idMarcadorSchema.optional(),
});

export type Paginacion = z.infer<typeof paginacionSchema>;

/** Consulta de la lista privada: paginación y filtro opcional por etiqueta. */
export const consultaMarcadoresSchema = paginacionSchema.extend({
  etiqueta: etiquetaSchema.optional(),
});

export type ConsultaMarcadores = z.infer<typeof consultaMarcadoresSchema>;

/** PATCH /api/marcadores/:id — solo campos editables; al menos uno. */
export const actualizarMarcadorSchema = z
  .strictObject({
    titulo: tituloSchema.min(1, "El título no puede quedar vacío.").optional(),
    etiquetas: listaEtiquetasSchema.optional(),
    publico: z.boolean().optional(),
  })
  .refine((cambios) => Object.keys(cambios).length > 0, "Envía al menos un campo para actualizar.");

export type CambiosMarcador = z.infer<typeof actualizarMarcadorSchema>;

/** POST /api/auth/sesion */
export const crearSesionSchema = z.strictObject({
  idToken: z.string().min(1, "Falta el idToken.").max(4096),
});

/** POST /api/perfil */
export const crearPerfilSchema = z.strictObject({ nombre: nombrePerfilSchema });

/** Respuesta paginada. */
export type Pagina<T> = { items: T[]; siguienteCursor: string | null };
