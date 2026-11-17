import { z } from "zod";

// Mensajes de error de Zod en español para cliente y servidor (los esquemas propios ya traen los suyos).
z.config(z.locales.es());

/** Etiqueta: minúsculas, números, guiones y tildes; máximo 30 caracteres. */
export const etiquetaSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9áéíóúüñ-]{1,30}$/, "La etiqueta solo admite letras, números y guiones (máximo 30).");

/** Marcador tal como lo entrega la fuente de datos. */
export const marcadorSchema = z.strictObject({
  id: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
  titulo: z.string().min(1).max(300),
  descripcion: z.string().max(1000).nullable(),
  imagenUrl: z
    .string()
    .regex(/^(\/|https:\/\/)/, "La imagen debe ser una ruta local o una URL https.")
    .nullable(),
  etiquetas: z.array(etiquetaSchema).max(20),
  publico: z.boolean(),
  estado: z.enum(["ok", "roto"]),
  creadoEn: z.iso.datetime(),
});

export const listaMarcadoresSchema = z.array(marcadorSchema);

export type Marcador = z.infer<typeof marcadorSchema>;

/** Criterios de búsqueda de la lista (vienen de la URL o del formulario). */
export const busquedaSchema = z.strictObject({
  q: z.string().trim().max(100, "La búsqueda admite máximo 100 caracteres."),
  etiqueta: etiquetaSchema.nullable(),
});

export type Busqueda = z.infer<typeof busquedaSchema>;

/** Nombre público de un perfil (/u/[nombre]): minúsculas, números, guion y guion bajo. */
export const nombrePerfilSchema = z.string().regex(/^[a-z0-9_-]{3,30}$/, "Nombre de perfil no válido.");
