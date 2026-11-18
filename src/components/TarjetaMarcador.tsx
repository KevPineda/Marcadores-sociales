import Image from "next/image";
import Link from "next/link";
import type { Marcador } from "@/schemas/marcador";
import { obtenerDominio } from "@/services/filtrar-marcadores";
import styles from "./TarjetaMarcador.module.css";

const formatoFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

type Props = {
  marcador: Marcador;
  /** Si se indica, la tarjeta muestra el botón «Eliminar» (solo en mis marcadores). */
  onEliminar?: (marcador: Marcador) => void;
};

/** Tarjeta con la vista previa de un marcador. Título y descripción se muestran como texto. */
export function TarjetaMarcador({ marcador, onEliminar }: Props): React.JSX.Element {
  const dominio = obtenerDominio(marcador.url);
  const idTitulo = `titulo-${marcador.id}`;

  return (
    <article className={styles.tarjeta} aria-labelledby={idTitulo}>
      <div className={styles.imagen}>
        {marcador.imagenUrl ? (
          <Image
            src={marcador.imagenUrl}
            alt=""
            unoptimized
            width={1200}
            height={630}
            sizes="(min-width: 64rem) 33vw, (min-width: 48rem) 50vw, 100vw"
          />
        ) : (
          <span className={styles.sinImagen} aria-hidden="true">
            {dominio.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className={styles.cuerpo}>
        <h3 id={idTitulo} className={styles.titulo}>
          <a href={marcador.url} target="_blank" rel="noopener noreferrer">
            {marcador.titulo}
            <span className="visualmente-oculto"> (abre en una pestaña nueva)</span>
          </a>
        </h3>
        <p className={styles.dominio}>{dominio}</p>

        {marcador.descripcion && <p className={styles.descripcion}>{marcador.descripcion}</p>}

        {marcador.etiquetas.length > 0 && (
          <ul className={styles.etiquetas} aria-label="Etiquetas">
            {marcador.etiquetas.map((etiqueta) => (
              <li key={etiqueta}>
                <Link href={`/etiquetas/${encodeURIComponent(etiqueta)}`} className={styles.etiqueta}>
                  #{etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <footer className={styles.pie}>
          <time dateTime={marcador.creadoEn}>Guardado el {formatoFecha.format(new Date(marcador.creadoEn))}</time>
          <span className={styles.insignias}>
            {!marcador.publico && <span className={styles.insignia}>🔒 Privado</span>}
            {marcador.estado === "roto" && (
              <span className={`${styles.insignia} ${styles.roto}`}>⚠ Enlace roto</span>
            )}
          </span>
          {onEliminar && (
            <button type="button" className={styles.eliminar} onClick={() => onEliminar(marcador)}>
              Eliminar<span className="visualmente-oculto"> «{marcador.titulo}»</span>
            </button>
          )}
        </footer>
      </div>
    </article>
  );
}
