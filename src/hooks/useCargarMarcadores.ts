"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorApiCliente, irAlLogin, listarMisMarcadores } from "@/lib/api-cliente";
import type { Marcador } from "@/schemas/marcador";

type EstadoCarga =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | { estado: "listo"; marcadores: Marcador[]; siguienteCursor: string | null; cargandoMas: boolean };

export type ResultadoCarga = EstadoCarga & {
  reintentar: () => void;
  cargarMas: () => void;
  quitar: (id: string) => void;
};

const MENSAJE_INESPERADO = "Ocurrió un error inesperado al cargar los marcadores.";

/** Traduce el error a un mensaje para la persona; con 401 lleva al login. */
function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApiCliente) {
    if (error.status === 401) {
      irAlLogin();
    }
    return error.message;
  }
  return MENSAJE_INESPERADO;
}

/** Carga mis marcadores desde la API al montar; expone reintento, «cargar más» y quitar. */
export function useCargarMarcadores(): ResultadoCarga {
  const [intento, setIntento] = useState(0);
  const [carga, setCarga] = useState<EstadoCarga>({ estado: "cargando" });

  useEffect(() => {
    const controlador = new AbortController();
    listarMisMarcadores(null, controlador.signal)
      .then(({ items, siguienteCursor }) =>
        setCarga({ estado: "listo", marcadores: items, siguienteCursor, cargandoMas: false }),
      )
      .catch((error: unknown) => {
        if (!controlador.signal.aborted) {
          setCarga({ estado: "error", mensaje: mensajeDeError(error) });
        }
      });
    return () => controlador.abort();
  }, [intento]);

  const reintentar = useCallback(() => {
    setCarga({ estado: "cargando" });
    setIntento((anterior) => anterior + 1);
  }, []);

  const cursor = carga.estado === "listo" ? carga.siguienteCursor : null;
  const cargarMas = useCallback(() => {
    if (!cursor) {
      return;
    }
    setCarga((actual) => (actual.estado === "listo" ? { ...actual, cargandoMas: true } : actual));
    listarMisMarcadores(cursor)
      .then(({ items, siguienteCursor }) =>
        setCarga((actual) =>
          actual.estado === "listo"
            ? { estado: "listo", marcadores: [...actual.marcadores, ...items], siguienteCursor, cargandoMas: false }
            : actual,
        ),
      )
      .catch((error: unknown) => setCarga({ estado: "error", mensaje: mensajeDeError(error) }));
  }, [cursor]);

  const quitar = useCallback((id: string) => {
    setCarga((actual) =>
      actual.estado === "listo"
        ? { ...actual, marcadores: actual.marcadores.filter((marcador) => marcador.id !== id) }
        : actual,
    );
  }, []);

  return { ...carga, reintentar, cargarMas, quitar };
}
