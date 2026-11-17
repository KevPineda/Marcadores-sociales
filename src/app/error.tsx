"use client";

type Props = { error: unknown; retry: () => void };

/** Límite de error de la ruta: mensaje genérico y reintento (sin detalles internos). */
export default function ErrorRuta({ retry }: Props): React.JSX.Element {
  return (
    <div role="alert" className="aviso-pagina">
      <h1>Algo salió mal</h1>
      <p>No pudimos mostrar esta página. Intenta de nuevo en unos segundos.</p>
      <button type="button" className="boton" onClick={() => retry()}>
        Reintentar
      </button>
    </div>
  );
}
