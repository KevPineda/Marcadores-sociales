"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CampoTexto } from "@/components/CampoTexto";
import { crearMiPerfil, ErrorApiCliente, irAlLogin, obtenerMiPerfil } from "@/lib/api-cliente";
import { nombrePerfilSchema } from "@/schemas/marcador";
import styles from "./FormularioGuardar.module.css";

type Estado =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | { estado: "listo"; nombre: string | null };

/** Muestra mi colección pública o el formulario para elegir mi nombre público. */
export function PanelPerfil(): React.JSX.Element {
  const id = useId();
  const [estado, setEstado] = useState<Estado>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    obtenerMiPerfil()
      .then((perfil) => setEstado({ estado: "listo", nombre: perfil.nombre }))
      .catch((causa: unknown) => {
        if (causa instanceof ErrorApiCliente && causa.status === 401) {
          irAlLogin();
        }
        setEstado({ estado: "error", mensaje: causa instanceof Error ? causa.message : "Error inesperado." });
      });
  }, [intento]);

  /** Valida y reserva el nombre público (409 si ya está ocupado). */
  async function enviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const validacion = nombrePerfilSchema.safeParse(nombre.trim().toLowerCase());
    if (!validacion.success) {
      setError(validacion.error.issues[0]?.message);
      document.getElementById(`${id}-nombre`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      const perfil = await crearMiPerfil(validacion.data);
      setEstado({ estado: "listo", nombre: perfil.nombre });
    } catch (causa) {
      setError(
        causa instanceof ErrorApiCliente && causa.status === 409
          ? "Ese nombre ya está ocupado. Prueba con otro."
          : causa instanceof Error
            ? causa.message
            : "Error inesperado.",
      );
      document.getElementById(`${id}-nombre`)?.focus();
    } finally {
      setEnviando(false);
    }
  }

  if (estado.estado === "cargando") {
    return <p role="status">Cargando tu perfil…</p>;
  }

  if (estado.estado === "error") {
    return (
      <div role="alert">
        <p>No pudimos cargar tu perfil. {estado.mensaje}</p>
        <button type="button" className="boton" onClick={() => setIntento((anterior) => anterior + 1)}>
          Reintentar
        </button>
      </div>
    );
  }

  if (estado.nombre) {
    return (
      <div role="status">
        <p>
          Tu colección pública: <Link href={`/u/${estado.nombre}`}>/u/{estado.nombre}</Link>
        </p>
        <p>Ahí aparecen los marcadores que guardes como «Público». Comparte ese enlace con quien quieras.</p>
      </div>
    );
  }

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      <p>Elige un nombre público para compartir tus marcadores públicos en /u/tu-nombre.</p>
      <CampoTexto
        id={`${id}-nombre`}
        etiqueta="Nombre público"
        ayuda="De 3 a 30 caracteres: minúsculas, números, guion o guion bajo."
        name="nombre"
        autoComplete="username"
        value={nombre}
        error={error}
        onChange={(evento) => {
          setNombre(evento.target.value);
          setError(undefined);
        }}
        required
      />
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? "Guardando…" : "Crear mi colección pública"}
      </button>
    </form>
  );
}
