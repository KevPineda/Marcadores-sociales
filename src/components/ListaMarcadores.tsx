"use client";

import { useEffect, useMemo, useState } from "react";
import { BuscadorMarcadores } from "@/components/BuscadorMarcadores";
import { EsqueletoTarjetas } from "@/components/EsqueletoTarjetas";
import { FiltroEtiquetas } from "@/components/FiltroEtiquetas";
import { TarjetaMarcador } from "@/components/TarjetaMarcador";
import { useCargarMarcadores } from "@/hooks/useCargarMarcadores";
import { useDebounce } from "@/hooks/useDebounce";
import { busquedaSchema, type Busqueda, type Marcador } from "@/schemas/marcador";
import { contarEtiquetas, filtrarMarcadores } from "@/services/filtrar-marcadores";
import styles from "./ListaMarcadores.module.css";

type Props = { busquedaInicial: Busqueda };

/** Lista vacía estable (evita recalcular los useMemo mientras carga). */
const SIN_MARCADORES: Marcador[] = [];

/** Devuelve el mensaje de validación del texto de búsqueda, o null si es válido. */
function validarTexto(texto: string): string | null {
  const validacion = busquedaSchema.shape.q.safeParse(texto);
  return validacion.success ? null : (validacion.error.issues[0]?.message ?? "Búsqueda no válida.");
}

/** Refleja la búsqueda en la URL (?q=&etiqueta=) sin recargar la página. */
function sincronizarUrl(busqueda: Busqueda): void {
  const parametros = new URLSearchParams(window.location.search);
  if (busqueda.q) {
    parametros.set("q", busqueda.q);
  } else {
    parametros.delete("q");
  }
  if (busqueda.etiqueta) {
    parametros.set("etiqueta", busqueda.etiqueta);
  } else {
    parametros.delete("etiqueta");
  }
  const consulta = parametros.toString();
  window.history.replaceState(null, "", consulta ? `?${consulta}` : window.location.pathname);
}

/** Texto del contador de resultados que se anuncia a lectores de pantalla. */
function textoResultados(visibles: number, total: number): string {
  if (visibles === total) {
    return `${total} ${total === 1 ? "marcador" : "marcadores"}`;
  }
  return `${visibles} de ${total} marcadores coinciden con la búsqueda`;
}

/** Lista de marcadores con búsqueda, filtro por etiqueta y estados de carga, vacío y error. */
export function ListaMarcadores({ busquedaInicial }: Props): React.JSX.Element {
  const carga = useCargarMarcadores();
  const [texto, setTexto] = useState(busquedaInicial.q);
  const [etiqueta, setEtiqueta] = useState(busquedaInicial.etiqueta);
  const textoDiferido = useDebounce(texto);

  const errorTexto = validarTexto(texto);
  const busqueda: Busqueda = { q: validarTexto(textoDiferido) ? "" : textoDiferido.trim(), etiqueta };

  useEffect(() => {
    sincronizarUrl({ q: busqueda.q, etiqueta: busqueda.etiqueta });
  }, [busqueda.q, busqueda.etiqueta]);

  const marcadores = carga.estado === "listo" ? carga.marcadores : SIN_MARCADORES;
  const etiquetas = useMemo(() => contarEtiquetas(marcadores), [marcadores]);
  const visibles = useMemo(
    () => filtrarMarcadores(marcadores, { q: busqueda.q, etiqueta: busqueda.etiqueta }),
    [marcadores, busqueda.q, busqueda.etiqueta],
  );
  const hayFiltros = busqueda.q !== "" || busqueda.etiqueta !== null;

  /** Quita la búsqueda y la etiqueta seleccionada. */
  function limpiarFiltros(): void {
    setTexto("");
    setEtiqueta(null);
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.controles}>
        <BuscadorMarcadores valor={texto} error={errorTexto} onCambiar={setTexto} />
        {carga.estado === "listo" && etiquetas.length > 0 && (
          <FiltroEtiquetas etiquetas={etiquetas} seleccionada={etiqueta} onSeleccionar={setEtiqueta} />
        )}
      </div>

      <section aria-labelledby="titulo-resultados" className={styles.resultados}>
        <h2 id="titulo-resultados">Resultados</h2>

        {carga.estado === "cargando" && <EsqueletoTarjetas />}

        {carga.estado === "error" && (
          <div role="alert" className={styles.aviso}>
            <p className={styles.avisoTitulo}>No pudimos cargar tus marcadores.</p>
            <p>{carga.mensaje}</p>
            <button type="button" className="boton" onClick={carga.reintentar}>
              Reintentar
            </button>
          </div>
        )}

        {carga.estado === "listo" && (
          <>
            <p role="status" className={styles.contador}>
              {textoResultados(visibles.length, marcadores.length)}
            </p>

            {visibles.length === 0 ? (
              <div className={styles.aviso}>
                {marcadores.length === 0 ? (
                  <p className={styles.avisoTitulo}>Aún no tienes marcadores guardados.</p>
                ) : (
                  <>
                    <p className={styles.avisoTitulo}>Ningún marcador coincide con la búsqueda.</p>
                    <p>Prueba con otras palabras o quita el filtro de etiqueta.</p>
                  </>
                )}
                {hayFiltros && (
                  <button type="button" className="boton" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <ul className="rejilla-tarjetas">
                {visibles.map((marcador) => (
                  <li key={marcador.id}>
                    <TarjetaMarcador marcador={marcador} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
