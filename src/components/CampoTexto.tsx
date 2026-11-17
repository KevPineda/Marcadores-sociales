import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./CampoTexto.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-describedby" | "aria-invalid"> & {
  id: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Contenido extra bajo el campo (botones, vistas previas). */
  children?: ReactNode;
};

/** Campo de texto con etiqueta, ayuda y error asociados al input (aria-describedby). */
export function CampoTexto({ id, etiqueta, ayuda, error, children, ...atributos }: Props): React.JSX.Element {
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const descripciones = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(" ");

  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
      </label>
      {ayuda && (
        <p id={idAyuda} className={styles.ayuda}>
          {ayuda}
        </p>
      )}
      <input
        id={id}
        className={styles.control}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripciones || undefined}
        {...atributos}
      />
      {error && (
        <p id={idError} className={styles.error}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
