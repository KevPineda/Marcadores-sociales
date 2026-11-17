"use client";

import type { EtiquetaConConteo } from "@/services/filtrar-marcadores";
import styles from "./FiltroEtiquetas.module.css";

type Props = {
  etiquetas: EtiquetaConConteo[];
  seleccionada: string | null;
  onSeleccionar: (etiqueta: string | null) => void;
};

/** Grupo de botones para filtrar por etiqueta; el activo se indica con aria-pressed (no solo color). */
export function FiltroEtiquetas({ etiquetas, seleccionada, onSeleccionar }: Props): React.JSX.Element {
  return (
    <fieldset className={styles.grupo}>
      <legend className={styles.leyenda}>Filtrar por etiqueta</legend>
      <ul className={styles.lista}>
        <li>
          <button
            type="button"
            className={styles.boton}
            aria-pressed={seleccionada === null}
            onClick={() => onSeleccionar(null)}
          >
            Todas
          </button>
        </li>
        {etiquetas.map(({ nombre, total }) => (
          <li key={nombre}>
            <button
              type="button"
              className={styles.boton}
              aria-pressed={seleccionada === nombre}
              onClick={() => onSeleccionar(seleccionada === nombre ? null : nombre)}
            >
              #{nombre} <span className={styles.total}>({total})</span>
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
