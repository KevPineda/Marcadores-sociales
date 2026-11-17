import { vi } from "vitest";
import { errorConflicto, errorNoEncontrado } from "@/lib/errores";
import type { CambiosMarcador, ConsultaMarcadores, Paginacion } from "@/schemas/api";
import type { Marcador } from "@/schemas/marcador";

/** Dos usuarios de prueba: un idToken y una cookie de sesión válidos para cada uno. */
export const ANA = { uid: "uid-ana", correo: "ana@ejemplo.com", token: "token-ana", cookie: "cookie-ana" };
export const BETO = { uid: "uid-beto", correo: "beto@ejemplo.com", token: "token-beto", cookie: "cookie-beto" };
const USUARIOS = [ANA, BETO];

export const BASE = "http://localhost:3000";

/** Simulación de Firebase Auth (Admin SDK). */
export const authFalso = {
  verifyIdToken: vi.fn(async (token: string) => {
    const usuario = USUARIOS.find((u) => u.token === token);
    if (!usuario) {
      throw new Error("auth/argument-error");
    }
    return { uid: usuario.uid, sub: usuario.uid, email: usuario.correo, auth_time: Math.floor(Date.now() / 1000) };
  }),
  verifySessionCookie: vi.fn(async (cookie: string) => {
    const usuario = USUARIOS.find((u) => u.cookie === cookie);
    if (!usuario) {
      throw new Error("auth/session-cookie-revoked");
    }
    return { uid: usuario.uid, sub: usuario.uid, email: usuario.correo };
  }),
  createSessionCookie: vi.fn(async () => "cookie-nueva"),
  revokeRefreshTokens: vi.fn(async () => undefined),
};

/** Datos en memoria: uid → (id → marcador). */
const almacen = new Map<string, Map<string, Marcador>>();

/** Colección en memoria de un usuario. */
function de(uid: string): Map<string, Marcador> {
  if (!almacen.has(uid)) {
    almacen.set(uid, new Map());
  }
  return almacen.get(uid) as Map<string, Marcador>;
}

/** Repositorio de marcadores en memoria (mismas firmas que el real). */
export const repositorioMarcadoresFalso = {
  existeMarcador: vi.fn(async (uid: string, id: string) => de(uid).has(id)),
  obtenerMarcador: vi.fn(async (uid: string, id: string) => de(uid).get(id) ?? null),
  crearMarcador: vi.fn(async (uid: string, marcador: Marcador) => {
    if (de(uid).has(marcador.id)) {
      throw errorConflicto("Ya guardaste este enlace.");
    }
    de(uid).set(marcador.id, marcador);
  }),
  listarMarcadores: vi.fn(async (uid: string, consulta: ConsultaMarcadores) => {
    const items = [...de(uid).values()].filter((m) => !consulta.etiqueta || m.etiquetas.includes(consulta.etiqueta));
    return { items: items.slice(0, consulta.limite), siguienteCursor: null };
  }),
  listarMarcadoresPublicos: vi.fn(async (uid: string, paginacion: Paginacion) => {
    const items = [...de(uid).values()].filter((m) => m.publico);
    return { items: items.slice(0, paginacion.limite), siguienteCursor: null };
  }),
  listarTodosLosMarcadores: vi.fn(async (uid: string) => [...de(uid).values()]),
  actualizarMarcador: vi.fn(async (uid: string, id: string, cambios: CambiosMarcador) => {
    const actual = de(uid).get(id);
    if (!actual) {
      throw errorNoEncontrado("No encontramos ese marcador.");
    }
    de(uid).set(id, { ...actual, ...cambios });
  }),
  eliminarMarcador: vi.fn(async (uid: string, id: string) => {
    if (!de(uid).delete(id)) {
      throw errorNoEncontrado("No encontramos ese marcador.");
    }
  }),
  crearVariosMarcadores: vi.fn(async (uid: string, marcadores: Marcador[]) => {
    let creados = 0;
    for (const marcador of marcadores) {
      if (!de(uid).has(marcador.id)) {
        de(uid).set(marcador.id, marcador);
        creados += 1;
      }
    }
    return creados;
  }),
  listarPendientesDeRevision: vi.fn(async () => []),
  guardarRevision: vi.fn(async () => undefined),
};

/** Repositorio de perfiles en memoria: solo existe el perfil público «ana». */
export const repositorioPerfilesFalso = {
  obtenerUidDePerfil: vi.fn(async (nombre: string) => (nombre === "ana" ? ANA.uid : null)),
  obtenerNombreDeUsuario: vi.fn(async (uid: string) => (uid === ANA.uid ? "ana" : null)),
  reservarNombre: vi.fn(async (_uid: string, nombre: string) => {
    if (nombre === "ana") {
      throw errorConflicto("Ese nombre ya está en uso.");
    }
  }),
};

/** Guarda un marcador directamente en el almacén (preparar escenarios). */
export function sembrar(uid: string, marcador: Marcador): void {
  de(uid).set(marcador.id, marcador);
}

/** Vacía los datos y el historial de llamadas entre pruebas. */
export function reiniciarFalsos(): void {
  almacen.clear();
  vi.clearAllMocks();
}

type OpcionesPeticion = {
  token?: string;
  cookie?: string;
  cuerpo?: unknown;
  origen?: string;
  cabeceras?: Record<string, string>;
};

/** Crea una Request como la que recibe un Route Handler. */
export function peticion(metodo: string, ruta: string, opciones: OpcionesPeticion = {}): Request {
  const cabeceras: Record<string, string> = { ...opciones.cabeceras };
  if (opciones.token) {
    cabeceras.Authorization = `Bearer ${opciones.token}`;
  }
  if (opciones.cookie) {
    cabeceras.Cookie = `sesion=${opciones.cookie}`;
  }
  if (opciones.origen) {
    cabeceras.Origin = opciones.origen;
  }
  let cuerpo: string | undefined;
  if (opciones.cuerpo !== undefined) {
    cuerpo = JSON.stringify(opciones.cuerpo);
    cabeceras["Content-Type"] ??= "application/json";
  }
  return new Request(`${BASE}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo });
}

/** Contexto de ruta con params, como lo pasa Next.js. */
export function contexto<P>(params: P): { params: Promise<P> } {
  return { params: Promise.resolve(params) };
}
