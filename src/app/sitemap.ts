import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/sitio";

/** sitemap.xml con las páginas públicas fijas. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${URL_SITIO}/login`, changeFrequency: "monthly", priority: 1 }];
}
