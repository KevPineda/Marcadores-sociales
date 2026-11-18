import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioLogin } from "@/components/FormularioLogin";
import { rutaInternaSegura } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Entra para guardar y compartir tus marcadores.",
  robots: { index: false },
};

/** Lee ?siguiente= (dato de la petición) y solo acepta rutas internas: evita redirecciones abiertas. */
async function FormularioConDestino({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { siguiente } = await searchParams;
  return <FormularioLogin siguiente={rutaInternaSegura(Array.isArray(siguiente) ? siguiente[0] : siguiente)} />;
}

/** Página de inicio de sesión y registro. */
export default function PaginaLogin({ searchParams }: PageProps<"/login">): React.JSX.Element {
  return (
    <>
      <h1>Marcadores sociales</h1>
      <p className="subtitulo">Guarda enlaces con vista previa automática y compártelos en tu colección pública.</p>
      <Suspense fallback={null}>
        <FormularioConDestino searchParams={searchParams} />
      </Suspense>
    </>
  );
}
