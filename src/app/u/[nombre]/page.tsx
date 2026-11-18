import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EsqueletoTarjetas } from "@/components/EsqueletoTarjetas";
import { TarjetaMarcador } from "@/components/TarjetaMarcador";
import { ErrorApi } from "@/lib/errores";
import { nombrePerfilSchema, type Marcador } from "@/schemas/marcador";
import { listarColeccionPublica } from "@/services/perfiles";

type Props = PageProps<"/u/[nombre]">;

/**
 * Marcadores públicos del perfil, en caché unos minutos (lectura pública).
 * Devuelve null si el perfil no existe.
 */
async function cargarColeccion(nombre: string): Promise<Marcador[] | null> {
  "use cache";
  cacheLife("minutes");
  try {
    return (await listarColeccionPublica(nombre, { limite: 100 })).items;
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Título de la pestaña con el nombre del perfil. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nombre } = await params;
  if (!nombrePerfilSchema.safeParse(nombre).success) {
    return { title: "Perfil no encontrado" };
  }
  return { title: `Colección de @${nombre}`, description: `Enlaces públicos guardados por @${nombre}.` };
}

/** Lee el nombre de la URL (dato de la petición) y muestra la colección. */
async function Coleccion({ params }: { params: Props["params"] }): Promise<React.JSX.Element> {
  const { nombre } = await params;
  if (!nombrePerfilSchema.safeParse(nombre).success) {
    notFound();
  }
  const marcadores = await cargarColeccion(nombre);
  if (!marcadores) {
    notFound();
  }

  return (
    <>
      <h1>Colección de @{nombre}</h1>
      <p className="subtitulo">
        {marcadores.length} {marcadores.length === 1 ? "enlace público" : "enlaces públicos"}
      </p>
      {marcadores.length === 0 ? (
        <p>Esta colección todavía no tiene enlaces públicos.</p>
      ) : (
        <section aria-labelledby="titulo-coleccion">
          <h2 id="titulo-coleccion" className="visualmente-oculto">
            Enlaces públicos
          </h2>
          <ul className="rejilla-tarjetas">
            {marcadores.map((marcador) => (
              <li key={marcador.id}>
                <TarjetaMarcador marcador={marcador} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Colección pública de una persona: Server Component, sin sesión y sin JavaScript de cliente. */
export default function PaginaColeccion({ params }: Props): React.JSX.Element {
  return (
    <Suspense fallback={<EsqueletoTarjetas />}>
      <Coleccion params={params} />
    </Suspense>
  );
}
