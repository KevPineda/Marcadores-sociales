import { z } from "zod";

/** Datos del formulario de inicio de sesión / registro. */
export const loginSchema = z.object({
  correo: z.email("Escribe un correo válido, por ejemplo nombre@dominio.com."),
  clave: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").max(128),
});

export type DatosLogin = z.infer<typeof loginSchema>;

/** Mensajes en español para los códigos de error de Firebase Auth. */
const MENSAJES_FIREBASE: Record<string, string> = {
  "auth/invalid-credential": "El correo o la contraseña no son correctos.",
  "auth/wrong-password": "El correo o la contraseña no son correctos.",
  "auth/user-not-found": "El correo o la contraseña no son correctos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo. Inicia sesión.",
  "auth/weak-password": "La contraseña es muy débil: usa al menos 6 caracteres.",
  "auth/invalid-email": "Escribe un correo válido.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  "auth/network-request-failed": "No hay conexión. Revisa tu red e inténtalo de nuevo.",
  "auth/operation-not-allowed": "El inicio de sesión con correo no está habilitado en Firebase.",
};

/** Traduce un error de Firebase Auth (por su `code`) a un mensaje para la persona. */
export function mensajeErrorAuth(error: unknown): string {
  const codigo = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return MENSAJES_FIREBASE[codigo] ?? "No pudimos iniciar sesión. Inténtalo de nuevo.";
}
