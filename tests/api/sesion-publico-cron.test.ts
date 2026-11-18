// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as POST_SESION, DELETE as DELETE_SESION } from "@/app/api/auth/sesion/route";
import { GET as GET_YO } from "@/app/api/auth/yo/route";
import { GET as GET_CRON, POST as POST_CRON } from "@/app/api/cron/revisar-enlaces/route";
import { POST as POST_PERFIL } from "@/app/api/perfil/route";
import { GET as GET_PUBLICO } from "@/app/api/u/[nombre]/marcadores/route";
import { reiniciarLimites } from "@/lib/limite-frecuencia";
import { crearMarcador } from "../fixtures/marcadores";
import { ADMIN, ANA, authFalso, BASE, contexto, peticion, reiniciarFalsos, sembrar } from "./falsos";

vi.mock("@/lib/firebase-admin", async () => {
  const { authFalso: falso } = await import("./falsos");
  return { obtenerAuth: () => falso, obtenerFirestore: () => ({}) };
});
vi.mock("@/repositories/marcadores", async () => (await import("./falsos")).repositorioMarcadoresFalso);
vi.mock("@/repositories/perfiles", async () => (await import("./falsos")).repositorioPerfilesFalso);

beforeEach(() => {
  reiniciarFalsos();
  reiniciarLimites();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/sesion", () => {
  it("crea la cookie HttpOnly, Secure y SameSite=Lax (204)", async () => {
    const respuesta = await POST_SESION(
      peticion("POST", "/api/auth/sesion", { cuerpo: { idToken: ANA.token }, origen: BASE }),
      undefined,
    );

    expect(respuesta.status).toBe(204);
    const cookie = respuesta.headers.get("Set-Cookie") ?? "";
    expect(cookie).toMatch(/^sesion=cookie-nueva;/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("rechaza un inicio de sesión que no es reciente (401)", async () => {
    authFalso.verifyIdToken.mockResolvedValueOnce({
      uid: ANA.uid,
      sub: ANA.uid,
      email: ANA.correo,
      auth_time: Math.floor(Date.now() / 1000) - 3600,
    });
    const respuesta = await POST_SESION(
      peticion("POST", "/api/auth/sesion", { cuerpo: { idToken: ANA.token }, origen: BASE }),
      undefined,
    );
    expect(respuesta.status).toBe(401);
    expect(authFalso.createSessionCookie).not.toHaveBeenCalled();
  });

  it("sin idToken responde 400", async () => {
    const respuesta = await POST_SESION(peticion("POST", "/api/auth/sesion", { cuerpo: {}, origen: BASE }), undefined);
    expect(respuesta.status).toBe(400);
  });

  it("limita la frecuencia: el intento 11 en un minuto responde 429 con Retry-After", async () => {
    let respuesta = new Response();
    for (let intento = 0; intento < 11; intento++) {
      respuesta = await POST_SESION(peticion("POST", "/api/auth/sesion", { cuerpo: {}, origen: BASE }), undefined);
    }
    expect(respuesta.status).toBe(429);
    expect(Number(respuesta.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("DELETE borra la cookie y revoca la sesión", async () => {
    const respuesta = await DELETE_SESION(
      peticion("DELETE", "/api/auth/sesion", { cookie: ANA.cookie, origen: BASE }),
      undefined,
    );
    expect(respuesta.status).toBe(204);
    expect(respuesta.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(authFalso.revokeRefreshTokens).toHaveBeenCalledWith(ANA.uid);
  });
});

describe("GET /api/auth/yo", () => {
  it("devuelve el usuario de la sesión", async () => {
    const respuesta = await GET_YO(peticion("GET", "/api/auth/yo", { cookie: ANA.cookie }), undefined);
    expect(await respuesta.json()).toEqual({ usuario: { uid: ANA.uid, correo: ANA.correo, rol: "usuario" } });
  });

  it("sin sesión responde 401", async () => {
    expect((await GET_YO(peticion("GET", "/api/auth/yo"), undefined)).status).toBe(401);
  });
});

describe("GET /api/u/:nombre/marcadores (público)", () => {
  it("devuelve solo los públicos, con caché compartida", async () => {
    sembrar(ANA.uid, crearMarcador({ id: "p".repeat(64), titulo: "Público", publico: true }));
    sembrar(ANA.uid, crearMarcador({ id: "q".repeat(64), titulo: "Privado", publico: false }));

    const respuesta = await GET_PUBLICO(peticion("GET", "/api/u/ana/marcadores"), contexto({ nombre: "ana" }));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Cache-Control")).toContain("s-maxage=60");
    const { items } = await respuesta.json();
    expect(items.map((m: { titulo: string }) => m.titulo)).toEqual(["Público"]);
  });

  it("un perfil inexistente responde 404", async () => {
    const respuesta = await GET_PUBLICO(peticion("GET", "/api/u/nadie/marcadores"), contexto({ nombre: "nadie" }));
    expect(respuesta.status).toBe(404);
  });
});

describe("POST /api/perfil", () => {
  it("un nombre ya ocupado responde 409", async () => {
    const respuesta = await POST_PERFIL(
      peticion("POST", "/api/perfil", { token: ANA.token, cuerpo: { nombre: "ana" } }),
      undefined,
    );
    expect(respuesta.status).toBe(409);
  });

  it("un nombre con caracteres no permitidos responde 400", async () => {
    const respuesta = await POST_PERFIL(
      peticion("POST", "/api/perfil", { token: ANA.token, cuerpo: { nombre: "Ana!" } }),
      undefined,
    );
    expect(respuesta.status).toBe(400);
  });
});

describe("GET /api/cron/revisar-enlaces", () => {
  it("sin el secreto correcto responde 401", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
    const sinSecreto = await GET_CRON(peticion("GET", "/api/cron/revisar-enlaces"), undefined);
    const otroSecreto = await GET_CRON(
      peticion("GET", "/api/cron/revisar-enlaces", { cabeceras: { Authorization: "Bearer otro" } }),
      undefined,
    );
    expect([sinSecreto.status, otroSecreto.status]).toEqual([401, 401]);
  });

  it("si CRON_SECRET no está configurado, nunca autoriza", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const respuesta = await GET_CRON(
      peticion("GET", "/api/cron/revisar-enlaces", { cabeceras: { Authorization: "Bearer " } }),
      undefined,
    );
    expect(respuesta.status).toBe(401);
  });

  it("con el secreto correcto revisa y responde el resumen", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
    const respuesta = await GET_CRON(
      peticion("GET", "/api/cron/revisar-enlaces", { cabeceras: { Authorization: "Bearer secreto-de-prueba" } }),
      undefined,
    );
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ revisados: 0, rotos: 0 });
  });
});

describe("POST /api/cron/revisar-enlaces (revisión manual, solo admin)", () => {
  it("sin sesión responde 401", async () => {
    const respuesta = await POST_CRON(peticion("POST", "/api/cron/revisar-enlaces", { origen: BASE }), undefined);
    expect(respuesta.status).toBe(401);
  });

  it("un usuario normal recibe 403", async () => {
    const respuesta = await POST_CRON(
      peticion("POST", "/api/cron/revisar-enlaces", { cookie: ANA.cookie, origen: BASE }),
      undefined,
    );
    expect(respuesta.status).toBe(403);
    expect(await respuesta.json()).toEqual({ error: "Solo un administrador puede hacer esto." });
  });

  it("una cuenta admin ejecuta la revisión", async () => {
    const respuesta = await POST_CRON(
      peticion("POST", "/api/cron/revisar-enlaces", { cookie: ADMIN.cookie, origen: BASE }),
      undefined,
    );
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ revisados: 0, rotos: 0 });
  });

  it("GET /api/auth/yo informa el rol", async () => {
    const respuesta = await GET_YO(peticion("GET", "/api/auth/yo", { cookie: ADMIN.cookie }), undefined);
    expect((await respuesta.json()).usuario.rol).toBe("admin");
  });
});
