import type { Metadata } from "next";
import { PanelPerfil } from "@/components/PanelPerfil";

export const metadata: Metadata = {
  title: "Mi perfil público",
  description: "Elige tu nombre público y comparte tu colección.",
};

/** Página para elegir el nombre de la colección pública. */
export default function PaginaPerfil(): React.JSX.Element {
  return (
    <>
      <h1>Mi perfil público</h1>
      <PanelPerfil />
    </>
  );
}
