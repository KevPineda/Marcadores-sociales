import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TarjetaMarcador } from "@/components/TarjetaMarcador";
import { listarNombresPerfiles, obtenerMarcadoresPublicos, obtenerPerfilPublico } from "@/lib/datos-ejemplo";
import { nombrePerfilSchema } from "@/schemas/marcador";

type Props = PageProps<"/u/[nombre]">;

/** Prerenderiza los perfiles conocidos. */
export function generateStaticParams(): Array<{ nombre: string }> {
  return listarNombresPerfiles().map((nombre) => ({ nombre }));
}

/** Título y descripción del perfil público. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nombre } = await params;
  const perfil = nombrePerfilSchema.safeParse(nombre).success ? await obtenerPerfilPublico(nombre) : null;
  if (!perfil) {
    return { title: "Perfil no encontrado" };
  }
  return {
    title: `${perfil.nombreVisible} (@${perfil.nombre})`,
    description: `Enlaces públicos guardados por @${perfil.nombre}.`,
  };
}

/** Colección pública de una persona: Server Component sin JavaScript de cliente. */
export default async function PaginaPerfil({ params }: Props): Promise<React.JSX.Element> {
  const { nombre } = await params;
  if (!nombrePerfilSchema.safeParse(nombre).success) {
    notFound();
  }
  const perfil = await obtenerPerfilPublico(nombre);
  if (!perfil) {
    notFound();
  }
  const marcadores = await obtenerMarcadoresPublicos(nombre);

  return (
    <>
      <h1>{perfil.nombreVisible}</h1>
      <p className="subtitulo">
        @{perfil.nombre} · {marcadores.length} {marcadores.length === 1 ? "enlace público" : "enlaces públicos"}
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
