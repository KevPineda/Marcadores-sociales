"use client";

import { useId, useState } from "react";
import { CampoTexto } from "@/components/CampoTexto";
import { crearSesion, ErrorApiCliente } from "@/lib/api-cliente";
import { loginSchema, mensajeErrorAuth } from "@/schemas/login";
import styles from "./FormularioLogin.module.css";

type Modo = "entrar" | "registrar";
type Errores = { correo?: string; clave?: string };

type Props = {
  /** Ruta interna (ya validada) a la que se vuelve al entrar. */
  siguiente: string;
};

/**
 * Inicio de sesión y registro con Firebase Auth (correo y contraseña).
 * El idToken se cambia por una cookie HttpOnly en /api/auth/sesion y luego se cierra
 * la sesión del SDK: el navegador no guarda tokens accesibles desde JavaScript.
 * El SDK de Firebase se carga solo al enviar (import dinámico) para no bloquear la carga de la página.
 */
export function FormularioLogin({ siguiente }: Props): React.JSX.Element {
  const id = useId();
  const [modo, setModo] = useState<Modo>("entrar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const registrar = modo === "registrar";

  /** Valida, autentica con Firebase y crea la cookie de sesión. */
  async function enviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    const validacion = loginSchema.safeParse({ correo, clave });
    if (!validacion.success) {
      const nuevos: Errores = {};
      for (const issue of validacion.error.issues) {
        const campo = issue.path[0];
        if ((campo === "correo" || campo === "clave") && !nuevos[campo]) {
          nuevos[campo] = issue.message;
        }
      }
      setErrores(nuevos);
      setAviso("Revisa los campos marcados.");
      document.getElementById(`${id}-${nuevos.correo ? "correo" : "clave"}`)?.focus();
      return;
    }

    setErrores({});
    setEnviando(true);
    setAviso(registrar ? "Creando tu cuenta…" : "Iniciando sesión…");
    try {
      const [{ createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut }, { obtenerAuthCliente }] =
        await Promise.all([import("firebase/auth"), import("@/lib/firebase-cliente")]);
      const auth = obtenerAuthCliente();
      const { correo: email, clave: password } = validacion.data;
      const credencial = registrar
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      await crearSesion(await credencial.user.getIdToken());
      await signOut(auth);
      window.location.assign(siguiente);
    } catch (error) {
      setAviso(error instanceof ErrorApiCliente ? error.message : mensajeErrorAuth(error));
      setEnviando(false);
    }
  }

  /** Cambia entre «Iniciar sesión» y «Crear cuenta». */
  function cambiarModo(): void {
    setModo(registrar ? "entrar" : "registrar");
    setErrores({});
    setAviso("");
  }

  return (
    <div className={styles.contenedor}>
      <form className={styles.formulario} onSubmit={enviar} noValidate aria-labelledby={`${id}-titulo`}>
        <h2 id={`${id}-titulo`}>{registrar ? "Crear cuenta" : "Iniciar sesión"}</h2>

        <p role="status" aria-live="polite" className={styles.aviso}>
          {aviso}
        </p>

        <CampoTexto
          id={`${id}-correo`}
          etiqueta="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={correo}
          error={errores.correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          required
        />
        <CampoTexto
          id={`${id}-clave`}
          etiqueta="Contraseña"
          ayuda={registrar ? "Mínimo 6 caracteres." : undefined}
          type="password"
          name="password"
          autoComplete={registrar ? "new-password" : "current-password"}
          value={clave}
          error={errores.clave}
          onChange={(evento) => setClave(evento.target.value)}
          required
        />

        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "Un momento…" : registrar ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <p className={styles.cambio}>
        {registrar ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
        <button type="button" className={styles.enlace} onClick={cambiarModo}>
          {registrar ? "Inicia sesión" : "Crea una"}
        </button>
      </p>
    </div>
  );
}
