"use client";

import { useCallback, useEffect, useState } from "react";
import { leerMarcadoresLocales } from "@/lib/almacen-local";
import { cargarMarcadores, ErrorCarga } from "@/lib/cargar-marcadores";
import type { Marcador } from "@/schemas/marcador";

type EstadoCarga =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | { estado: "listo"; marcadores: Marcador[] };

export type ResultadoCarga = EstadoCarga & { reintentar: () => void };

const MENSAJE_INESPERADO = "Ocurrió un error inesperado al cargar los marcadores.";

/** Suma los marcadores guardados en este navegador y ordena del más reciente al más antiguo. */
function combinarConLocales(remotos: Marcador[]): Marcador[] {
  const porId = new Map<string, Marcador>();
  for (const marcador of [...leerMarcadoresLocales(), ...remotos]) {
    if (!porId.has(marcador.id)) {
      porId.set(marcador.id, marcador);
    }
  }
  return [...porId.values()].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

/** Carga los marcadores al montar y expone el estado de la carga y un reintento. */
export function useCargarMarcadores(): ResultadoCarga {
  const [intento, setIntento] = useState(0);
  const [carga, setCarga] = useState<EstadoCarga>({ estado: "cargando" });

  useEffect(() => {
    const controlador = new AbortController();
    cargarMarcadores(controlador.signal)
      .then((marcadores) => setCarga({ estado: "listo", marcadores: combinarConLocales(marcadores) }))
      .catch((error: unknown) => {
        if (controlador.signal.aborted) {
          return;
        }
        setCarga({ estado: "error", mensaje: error instanceof ErrorCarga ? error.message : MENSAJE_INESPERADO });
      });
    return () => controlador.abort();
  }, [intento]);

  const reintentar = useCallback(() => {
    setCarga({ estado: "cargando" });
    setIntento((anterior) => anterior + 1);
  }, []);

  return { ...carga, reintentar };
}
