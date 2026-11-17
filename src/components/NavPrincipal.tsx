"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavPrincipal.module.css";

const ENLACES = [{ href: "/", texto: "Mis marcadores" }] as const;

/** Navegación principal; marca la página actual con aria-current. */
export function NavPrincipal(): React.JSX.Element {
  const rutaActual = usePathname();

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
      </ul>
    </nav>
  );
}
