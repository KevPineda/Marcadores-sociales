import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoTarjetas } from "@/components/EsqueletoTarjetas";
import { ListaMarcadores } from "@/components/ListaMarcadores";
import { busquedaSchema, type Busqueda } from "@/schemas/marcador";

export const metadata: Metadata = {
  title: { absolute: "Mis marcadores · Marcadores sociales" },
  description: "Tus enlaces de estudio guardados, con vista previa, búsqueda y filtros por etiqueta.",
};

type ParametrosBusqueda = Record<string, string | string[] | undefined>;

/** Toma el primer valor de un parámetro de la URL. */
function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Valida ?q= y ?etiqueta= con Zod; si algo no es válido se ignora. */
function leerBusqueda(parametros: ParametrosBusqueda): Busqueda {
  const validacion = busquedaSchema.safeParse({
    q: primerValor(parametros.q) ?? "",
    etiqueta: primerValor(parametros.etiqueta) ?? null,
  });
  return validacion.success ? validacion.data : { q: "", etiqueta: null };
}

/** Lee los parámetros de la URL (dato de la petición, por eso va dentro de Suspense). */
async function ListaConParametros({ searchParams }: { searchParams: Promise<ParametrosBusqueda> }) {
  const busqueda = leerBusqueda(await searchParams);
  return <ListaMarcadores busquedaInicial={busqueda} />;
}

/** Página de inicio: mis marcadores. */
export default function PaginaInicio({ searchParams }: PageProps<"/">): React.JSX.Element {
  return (
    <>
      <h1>Mis marcadores</h1>
      <Suspense fallback={<EsqueletoTarjetas />}>
        <ListaConParametros searchParams={searchParams} />
      </Suspense>
    </>
  );
}
