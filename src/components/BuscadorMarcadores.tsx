"use client";

import { useId } from "react";
import styles from "./BuscadorMarcadores.module.css";

type Props = {
  valor: string;
  error: string | null;
  onCambiar: (valor: string) => void;
};

/** Campo de búsqueda accesible; el error se muestra junto al campo y se anuncia. */
export function BuscadorMarcadores({ valor, error, onCambiar }: Props): React.JSX.Element {
  const idCampo = useId();
  const idAyuda = useId();
  const idError = useId();

  return (
    <form role="search" className={styles.buscador} onSubmit={(evento) => evento.preventDefault()}>
      <label htmlFor={idCampo} className={styles.etiqueta}>
        Buscar marcadores
      </label>
      <input
        id={idCampo}
        type="search"
        name="q"
        className={styles.campo}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${idAyuda} ${idError}` : idAyuda}
        autoComplete="off"
        spellCheck={false}
      />
      <p id={idAyuda} className={styles.ayuda}>
        Busca en el título, la descripción, el enlace y las etiquetas.
      </p>
      <p id={idError} className={styles.error} aria-live="polite">
        {error}
      </p>
    </form>
  );
}
