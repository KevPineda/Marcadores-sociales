import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Lee una variable de entorno obligatoria del servidor. */
function variableObligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example).`);
  }
  return valor;
}

/** Inicializa el Admin SDK una sola vez (las funciones de Vercel reutilizan el módulo). */
function obtenerApp(): App {
  const existente = getApps()[0];
  if (existente) {
    return existente;
  }
  return initializeApp({
    credential: cert({
      projectId: variableObligatoria("FIREBASE_PROJECT_ID"),
      clientEmail: variableObligatoria("FIREBASE_CLIENT_EMAIL"),
      // En Vercel la clave llega con "\n" literales: se convierten a saltos de línea.
      privateKey: variableObligatoria("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

/** Firebase Authentication (Admin). */
export function obtenerAuth(): Auth {
  return getAuth(obtenerApp());
}

/** Firestore (Admin). Solo lo usan los repositorios. */
export function obtenerFirestore(): Firestore {
  return getFirestore(obtenerApp());
}
