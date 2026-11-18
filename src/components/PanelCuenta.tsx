"use client";

import { useEffect, useState } from "react";
import { ErrorApiCliente, obtenerUsuarioActual, revisarEnlacesAhora } from "@/lib/api-cliente";
import styles from "./PanelCuenta.module.css";

type Cuenta = { correo: string | null; rol: "usuario" | "admin" };

/** Datos de la cuenta y, solo para administradores, la revisión manual de enlaces rotos. */
export function PanelCuenta(): React.JSX.Element | null {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [aviso, setAviso] = useState("");
  const [revisando, setRevisando] = useState(false);

  useEffect(() => {
    obtenerUsuarioActual()
      .then(({ correo, rol }) => setCuenta({ correo, rol }))
      .catch(() => setCuenta(null));
  }, []);

  /** Ejecuta la revisión (la API vuelve a comprobar que la sesión sea de admin). */
  async function revisar(): Promise<void> {
    setRevisando(true);
    setAviso("Revisando enlaces…");
    try {
      const { revisados, rotos } = await revisarEnlacesAhora();
      setAviso(`Listo: se revisaron ${revisados} enlaces y ${rotos} están rotos.`);
    } catch (error) {
      setAviso(error instanceof ErrorApiCliente ? error.message : "No se pudo hacer la revisión.");
    } finally {
      setRevisando(false);
    }
  }

  if (!cuenta) {
    return null;
  }

  return (
    <section aria-labelledby="titulo-cuenta" className={styles.panel}>
      <h2 id="titulo-cuenta">Mi cuenta</h2>
      <p>
        {cuenta.correo} · Rol: <strong>{cuenta.rol === "admin" ? "Administrador" : "Usuario"}</strong>
      </p>
      {cuenta.rol === "admin" && (
        <>
          <p>Como administrador puedes revisar ahora los enlaces rotos de todas las colecciones (también corre a diario).</p>
          <button type="button" className="boton" onClick={revisar} disabled={revisando}>
            {revisando ? "Revisando…" : "Revisar enlaces rotos ahora"}
          </button>
        </>
      )}
      <p role="status" aria-live="polite">
        {aviso}
      </p>
    </section>
  );
}
