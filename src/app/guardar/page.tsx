import type { Metadata } from "next";
import { FormularioGuardar } from "@/components/FormularioGuardar";

export const metadata: Metadata = {
  title: "Guardar un enlace",
  description: "Guarda un enlace con etiquetas y vista previa automática.",
};

/** Página para guardar un enlace nuevo. */
export default function PaginaGuardar(): React.JSX.Element {
  return (
    <>
      <h1>Guardar un enlace</h1>
      <FormularioGuardar />
    </>
  );
}
