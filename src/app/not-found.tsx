import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Página no encontrada" };

/** Página 404 propia. */
export default function NoEncontrada(): React.JSX.Element {
  return (
    <div className="aviso-pagina">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe o fue movida.</p>
      <Link href="/" className="boton">
        Volver a mis marcadores
      </Link>
    </div>
  );
}
