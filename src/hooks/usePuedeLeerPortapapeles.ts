"use client";

import { useSyncExternalStore } from "react";

/** No hay nada a qué suscribirse: la capacidad del navegador no cambia. */
function suscribir(): () => void {
  return () => {};
}

/** Detección de la función: el navegador expone navigator.clipboard.readText. */
function puedeLeer(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function";
}

/** En el servidor no hay navegador: el botón no se muestra hasta hidratar. */
function puedeLeerEnServidor(): boolean {
  return false;
}

/** Indica si se puede ofrecer el botón «Pegar enlace» (mejora progresiva). */
export function usePuedeLeerPortapapeles(): boolean {
  return useSyncExternalStore(suscribir, puedeLeer, puedeLeerEnServidor);
}
