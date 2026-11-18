import type { NextConfig } from "next";

const esDesarrollo = process.env.NODE_ENV !== "production";

/**
 * Política de seguridad de contenido (CSP) básica.
 * - script/style 'unsafe-inline': Next.js inserta scripts y estilos en línea para hidratar.
 * - img-src https: las vistas previas vienen de cualquier sitio (solo https, validado en el servidor).
 * - connect-src: la API propia y los servicios de Firebase Auth.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self'",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(esDesarrollo ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** Cabeceras de seguridad para todas las rutas. */
export const CABECERAS_SEGURIDAD = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
  },
};

export default nextConfig;
