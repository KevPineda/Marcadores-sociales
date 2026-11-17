import styles from "./EsqueletoTarjetas.module.css";

type Props = { cantidad?: number };

/** Esqueleto de carga con la misma forma de las tarjetas (evita saltos de diseño). */
export function EsqueletoTarjetas({ cantidad = 6 }: Props): React.JSX.Element {
  return (
    <div role="status">
      <span className="visualmente-oculto">Cargando marcadores…</span>
      <ul className="rejilla-tarjetas" aria-hidden="true">
        {Array.from({ length: cantidad }, (_, indice) => (
          <li key={indice} className={styles.tarjeta}>
            <div className={styles.imagen} />
            <div className={styles.linea} />
            <div className={`${styles.linea} ${styles.corta}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
