import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/** robots.txt: se indexan el login y las colecciones públicas; nunca la API ni las páginas privadas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/login", "/u/"], disallow: ["/api/", "/guardar", "/perfil", "/etiquetas/"] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
