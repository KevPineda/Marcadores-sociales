import { getApps, initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, initializeAuth, type Auth } from "firebase/auth";

/**
 * Firebase Auth en el navegador (solo `firebase/auth`; nunca Firestore).
 * Usa persistencia en memoria: el token solo se usa para crear la cookie HttpOnly
 * y no queda guardado en IndexedDB ni localStorage.
 */
export function obtenerAuthCliente(): Auth {
  const existente = getApps()[0];
  if (existente) {
    return getAuth(existente);
  }
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  return initializeAuth(app, { persistence: inMemoryPersistence });
}
