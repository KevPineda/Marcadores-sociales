import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { NavPrincipal } from "@/components/NavPrincipal";
import { URL_SITIO } from "@/lib/sitio";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--fuente-base" });

export const metadata: Metadata = {
  title: { template: "%s · Marcadores sociales", default: "Marcadores sociales" },
  description: "Guarda enlaces con etiquetas y vista previa automática, y compártelos.",
  metadataBase: new URL(URL_SITIO),
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Marcadores sociales",
    title: "Marcadores sociales",
    description: "Guarda enlaces con etiquetas y vista previa automática, y compártelos.",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

/** Layout raíz: landmarks, enlace para saltar al contenido y tipografía. */
export default function RootLayout({ children }: LayoutProps<"/">): React.JSX.Element {
  return (
    <html lang="es" className={geist.variable}>
      <body>
        <a href="#contenido" className="saltar-contenido">
          Saltar al contenido
        </a>
        <header className="cabecera">
          <div className="contenedor cabecera-interior">
            <Link href="/" className="marca">
              <span aria-hidden="true">🔖</span> Marcadores
            </Link>
            {/* La navegación lee la ruta actual (dato de la petición): se transmite aparte. */}
            <Suspense fallback={null}>
              <NavPrincipal />
            </Suspense>
          </div>
        </header>
        <main id="contenido" tabIndex={-1} className="contenedor principal">
          {children}
        </main>
        <footer className="pie-sitio">
          <div className="contenedor">
            <p>Proyecto 49 · Marcadores sociales con vista previa</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
