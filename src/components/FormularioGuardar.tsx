"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { z } from "zod";
import { CampoTexto } from "@/components/CampoTexto";
import { usePuedeLeerPortapapeles } from "@/hooks/usePuedeLeerPortapapeles";
import { ErrorApiCliente, guardarMarcador, irAlLogin } from "@/lib/api-cliente";
import type { Marcador } from "@/schemas/marcador";
import { MAXIMO_ETIQUETAS, nuevoMarcadorSchema, separarEtiquetas } from "@/schemas/nuevo-marcador";
import { motivoUrlNoPermitida, normalizarUrl } from "@/services/url";
import styles from "./FormularioGuardar.module.css";

type Valores = { url: string; titulo: string; etiquetas: string; publico: boolean };
type Campo = "url" | "titulo" | "etiquetas";
type Errores = Partial<Record<Campo, string>>;

const VALORES_INICIALES: Valores = { url: "", titulo: "", etiquetas: "", publico: false };
const ORDEN_CAMPOS: Campo[] = ["url", "titulo", "etiquetas"];

/** Agrupa los errores de Zod por campo (el primero de cada uno). */
function erroresPorCampo(error: z.ZodError): Errores {
  const errores: Errores = {};
  for (const issue of error.issues) {
    const campo = issue.path[0];
    if ((campo === "url" || campo === "titulo" || campo === "etiquetas") && !errores[campo]) {
      errores[campo] = issue.message;
    }
  }
  return errores;
}

/** Errores por campo a partir de los `detalles` de un 400 de la API. */
function erroresDeApi(error: ErrorApiCliente): Errores {
  const errores: Errores = {};
  for (const { campo, mensaje } of error.detalles) {
    const raiz = campo.split(".")[0];
    if ((raiz === "url" || raiz === "titulo" || raiz === "etiquetas") && !errores[raiz]) {
      errores[raiz] = mensaje;
    }
  }
  return errores;
}

/** URL normalizada para mostrarla como vista previa, o null si no aplica. */
function vistaPreviaUrl(url: string): string | null {
  if (!url.trim() || motivoUrlNoPermitida(url)) {
    return null;
  }
  const normalizada = normalizarUrl(url);
  return normalizada === new URL(url.trim()).toString() ? null : normalizada;
}

/** Formulario controlado para guardar un enlace, validado con el mismo esquema que usará la API. */
export function FormularioGuardar(): React.JSX.Element {
  const id = useId();
  const puedePegar = usePuedeLeerPortapapeles();
  const [valores, setValores] = useState<Valores>(VALORES_INICIALES);
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [guardado, setGuardado] = useState<Marcador | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refExito = useRef<HTMLDivElement>(null);

  const idCampo = (campo: Campo): string => `${id}-${campo}`;
  const vistaPrevia = vistaPreviaUrl(valores.url);

  /** Actualiza un valor y limpia el error de ese campo. */
  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]): void {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  /** Muestra los errores y lleva el foco al primer campo inválido. */
  function mostrarErrores(nuevos: Errores): void {
    setErrores(nuevos);
    const total = Object.values(nuevos).filter(Boolean).length;
    setAviso(`Revisa ${total === 1 ? "1 campo" : `${total} campos`} del formulario.`);
    const primero = ORDEN_CAMPOS.find((campo) => nuevos[campo]);
    if (primero) {
      document.getElementById(idCampo(primero))?.focus();
    }
  }

  /** Pega el enlace desde el portapapeles (pide permiso solo al pulsar el botón). */
  async function pegarEnlace(): Promise<void> {
    try {
      const texto = await navigator.clipboard.readText();
      actualizar("url", texto.trim());
      setAviso("Enlace pegado desde el portapapeles.");
    } catch {
      setAviso("No pudimos leer el portapapeles. Pega el enlace con Ctrl+V o escríbelo.");
    }
    document.getElementById(idCampo("url"))?.focus();
  }

  /** Traduce el error de la API a errores de campo o a un aviso. */
  function mostrarErrorApi(error: unknown): void {
    if (!(error instanceof ErrorApiCliente)) {
      setAviso("Ocurrió un error inesperado. Inténtalo de nuevo.");
      return;
    }
    if (error.status === 401) {
      irAlLogin();
      return;
    }
    if (error.status === 409) {
      mostrarErrores({ url: "Ya guardaste este enlace." });
      return;
    }
    const porCampo = erroresDeApi(error);
    if (Object.keys(porCampo).length > 0) {
      mostrarErrores(porCampo);
      return;
    }
    setAviso(error.message);
  }

  /** Valida en el navegador y envía a la API (que valida de nuevo, revisa duplicados y saca la vista previa). */
  async function enviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setGuardado(null);

    const validacion = nuevoMarcadorSchema.safeParse({
      url: valores.url,
      titulo: valores.titulo,
      etiquetas: separarEtiquetas(valores.etiquetas),
      publico: valores.publico,
    });
    if (!validacion.success) {
      mostrarErrores(erroresPorCampo(validacion.error));
      return;
    }

    setEnviando(true);
    setAviso("Guardando y obteniendo la vista previa…");
    try {
      const marcador = await guardarMarcador(validacion.data);
      setValores(VALORES_INICIALES);
      setErrores({});
      setAviso("");
      setGuardado(marcador);
      requestAnimationFrame(() => refExito.current?.focus());
    } catch (error) {
      mostrarErrorApi(error);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {guardado && (
        <div ref={refExito} tabIndex={-1} role="status" className={styles.exito}>
          <p className={styles.exitoTitulo}>✓ Enlace guardado: «{guardado.titulo}».</p>
          {guardado.estado === "roto" && <p>⚠ No pudimos abrir la página; quedó marcada como enlace roto.</p>}
          <Link href="/">Ver mis marcadores</Link>
        </div>
      )}

      <p className="visualmente-oculto" aria-live="polite">
        {aviso}
      </p>

      <CampoTexto
        id={idCampo("url")}
        etiqueta="Enlace"
        ayuda="Dirección completa que empiece por http:// o https://."
        error={errores.url}
        type="url"
        inputMode="url"
        name="url"
        autoComplete="url"
        placeholder="https://"
        value={valores.url}
        onChange={(evento) => actualizar("url", evento.target.value)}
        required
      >
        {puedePegar && (
          <button type="button" className={styles.botonSecundario} onClick={pegarEnlace}>
            Pegar enlace
          </button>
        )}
        {vistaPrevia && (
          <p className={styles.vistaPrevia}>
            Se guardará sin parámetros de seguimiento: <code>{vistaPrevia}</code>
          </p>
        )}
      </CampoTexto>

      <CampoTexto
        id={idCampo("titulo")}
        etiqueta="Título (opcional)"
        ayuda="Si lo dejas vacío, se usará el título de la vista previa del sitio."
        error={errores.titulo}
        name="titulo"
        autoComplete="off"
        value={valores.titulo}
        onChange={(evento) => actualizar("titulo", evento.target.value)}
      />

      <CampoTexto
        id={idCampo("etiquetas")}
        etiqueta="Etiquetas (opcional)"
        ayuda={`Separadas por comas o espacios, máximo ${MAXIMO_ETIQUETAS}. Ejemplo: css, diseño`}
        error={errores.etiquetas}
        name="etiquetas"
        autoComplete="off"
        value={valores.etiquetas}
        onChange={(evento) => actualizar("etiquetas", evento.target.value)}
      />

      <fieldset className={styles.grupo}>
        <legend className={styles.leyenda}>Visibilidad</legend>
        <label className={styles.opcion}>
          <input
            type="radio"
            name="visibilidad"
            checked={!valores.publico}
            onChange={() => actualizar("publico", false)}
          />
          Privado: solo tú lo ves
        </label>
        <label className={styles.opcion}>
          <input
            type="radio"
            name="visibilidad"
            checked={valores.publico}
            onChange={() => actualizar("publico", true)}
          />
          Público: aparece en tu colección pública
        </label>
      </fieldset>

      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar enlace"}
      </button>
    </form>
  );
}
