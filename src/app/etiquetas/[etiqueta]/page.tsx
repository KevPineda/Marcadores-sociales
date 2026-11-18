import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTarjetas } from "@/components/EsqueletoTarjetas";
import { ListaMarcadores } from "@/components/ListaMarcadores";
import { etiquetaSchema } from "@/schemas/marcador";

type Props = PageProps<"/etiquetas/[etiqueta]">;

/** Decodifica y valida la etiqueta de la URL; null si no es válida. */
function leerEtiqueta(valor: string): string | null {
  let texto = valor;
  try {
    texto = decodeURIComponent(valor);
  } catch {
    return null;
  }
  const validacion = etiquetaSchema.safeParse(texto);
  return validacion.success ? validacion.data : null;
}

/** Título de la pestaña con la etiqueta. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etiqueta = leerEtiqueta((await params).etiqueta);
  return { title: etiqueta ? `#${etiqueta}` : "Etiqueta no válida" };
}

/** Lee la etiqueta de la URL (dato de la petición, por eso va dentro de Suspense). */
async function ContenidoEtiqueta({ params }: { params: Props["params"] }): Promise<React.JSX.Element> {
  const etiqueta = leerEtiqueta((await params).etiqueta);
  if (!etiqueta) {
    notFound();
  }

  return (
    <>
      <h1>Marcadores con #{etiqueta}</h1>
      <p className="volver">
        <Link href="/">← Todos mis marcadores</Link>
      </p>
      <ListaMarcadores busquedaInicial={{ q: "", etiqueta }} etiquetaFija={etiqueta} />
    </>
  );
}

/** Marcadores de una etiqueta. */
export default function PaginaEtiqueta({ params }: Props): React.JSX.Element {
  return (
    <Suspense fallback={<EsqueletoTarjetas />}>
      <ContenidoEtiqueta params={params} />
    </Suspense>
  );
}
