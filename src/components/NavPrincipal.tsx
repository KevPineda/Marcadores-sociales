"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cerrarSesion } from "@/lib/api-cliente";
import styles from "./NavPrincipal.module.css";

const ENLACES = [
  { href: "/", texto: "Mis marcadores" },
  { href: "/guardar", texto: "Guardar" },
  { href: "/perfil", texto: "Mi perfil" },
] as const;

/** Navegación principal; marca la página actual con aria-current. */
export function NavPrincipal(): React.JSX.Element {
  const rutaActual = usePathname();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  /** Borra la cookie de sesión en el servidor y vuelve al login. */
  async function salir(): Promise<void> {
    setSaliendo(true);
    try {
      await cerrarSesion();
    } finally {
      router.replace("/login");
      router.refresh();
      setSaliendo(false);
    }
  }

  if (rutaActual === "/login" || rutaActual.startsWith("/u/")) {
    return (
      <nav aria-label="Principal">
        <ul className={styles.lista}>
          <li>
            <Link href="/" className={styles.enlace}>
              {rutaActual === "/login" ? "Inicio" : "Mis marcadores"}
            </Link>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Principal">
      <ul className={styles.lista}>
        {ENLACES.map(({ href, texto }) => (
          <li key={href}>
            <Link href={href} className={styles.enlace} aria-current={rutaActual === href ? "page" : undefined}>
              {texto}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className={styles.salir} onClick={salir} disabled={saliendo}>
            {saliendo ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </li>
      </ul>
    </nav>
  );
}
