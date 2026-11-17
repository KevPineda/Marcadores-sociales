// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET as GET_UNO, PATCH } from "@/app/api/marcadores/[id]/route";
import { GET, POST } from "@/app/api/marcadores/route";
import { reiniciarLimites } from "@/lib/limite-frecuencia";
import { crearMarcador } from "../fixtures/marcadores";
import { ANA, BETO, contexto, peticion, reiniciarFalsos, sembrar } from "./falsos";

vi.mock("@/lib/firebase-admin", async () => {
  const { authFalso } = await import("./falsos");
  return { obtenerAuth: () => authFalso, obtenerFirestore: () => ({}) };
});
vi.mock("@/repositories/marcadores", async () => (await import("./falsos")).repositorioMarcadoresFalso);

const ID_ANA = "a".repeat(64);
const MARCADOR_ANA = crearMarcador({ id: ID_ANA, titulo: "Privado de Ana", publico: false });

beforeEach(() => {
  reiniciarFalsos();
  reiniciarLimites();
  sembrar(ANA.uid, MARCADOR_ANA);
});

describe("Autenticación (401)", () => {
  it("sin sesión responde 401 con el formato de error común", async () => {
    const respuesta = await GET(peticion("GET", "/api/marcadores"), undefined);

    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ error: "Inicia sesión para continuar." });
    expect(respuesta.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("un token inválido responde 401", async () => {
    const respuesta = await GET(peticion("GET", "/api/marcadores", { token: "inventado" }), undefined);
    expect(respuesta.status).toBe(401);
  });

  it("acepta la cookie de sesión y responde la lista sin caché", async () => {
    const respuesta = await GET(peticion("GET", "/api/marcadores", { cookie: ANA.cookie }), undefined);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ items: [MARCADOR_ANA], siguienteCursor: null });
  });
});

describe("Validación (400, 415)", () => {
  it("criterio 1: una URL a la red interna responde 400 con detalle en el campo url", async () => {
    const respuesta = await POST(
      peticion("POST", "/api/marcadores", { token: ANA.token, cuerpo: { url: "http://169.254.169.254/" } }),
      undefined,
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.detalles).toContainEqual({
      campo: "url",
      mensaje: "No se permiten enlaces a direcciones internas o locales.",
    });
  });

  it("rechaza campos desconocidos como uid o estado (mass assignment)", async () => {
    const respuesta = await POST(
      peticion("POST", "/api/marcadores", {
        token: ANA.token,
        cuerpo: { url: "https://zod.dev/", uid: BETO.uid, estado: "ok" },
      }),
      undefined,
    );
    expect(respuesta.status).toBe(400);
  });

  it("un límite mayor a 100 responde 400", async () => {
    const respuesta = await GET(peticion("GET", "/api/marcadores?limite=500", { token: ANA.token }), undefined);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).detalles[0].campo).toBe("limite");
  });

  it("un cuerpo que no es JSON responde 415", async () => {
    const respuesta = await POST(
      peticion("POST", "/api/marcadores", {
        token: ANA.token,
        cuerpo: "url=https://zod.dev",
        cabeceras: { "Content-Type": "text/plain" },
      }),
      undefined,
    );
    expect(respuesta.status).toBe(415);
  });
});

describe("Autorización (403, 404)", () => {
  it("un Origin ajeno en una petición que modifica datos responde 403 (CSRF)", async () => {
    const respuesta = await DELETE(
      peticion("DELETE", `/api/marcadores/${ID_ANA}`, { cookie: ANA.cookie, origen: "https://malicioso.example" }),
      contexto({ id: ID_ANA }),
    );

    expect(respuesta.status).toBe(403);
    expect(await GET_UNO(peticion("GET", `/api/marcadores/${ID_ANA}`, { token: ANA.token }), contexto({ id: ID_ANA })))
      .toHaveProperty("status", 200);
  });

  it("con cookie y sin Origin no se permite modificar (403)", async () => {
    const respuesta = await DELETE(
      peticion("DELETE", `/api/marcadores/${ID_ANA}`, { cookie: ANA.cookie }),
      contexto({ id: ID_ANA }),
    );
    expect(respuesta.status).toBe(403);
  });

  it("Beto no puede leer, editar ni borrar un marcador de Ana (404, no revela que existe)", async () => {
    const leer = await GET_UNO(peticion("GET", `/api/marcadores/${ID_ANA}`, { token: BETO.token }), contexto({ id: ID_ANA }));
    const editar = await PATCH(
      peticion("PATCH", `/api/marcadores/${ID_ANA}`, { token: BETO.token, cuerpo: { publico: true } }),
      contexto({ id: ID_ANA }),
    );
    const borrar = await DELETE(
      peticion("DELETE", `/api/marcadores/${ID_ANA}`, { token: BETO.token }),
      contexto({ id: ID_ANA }),
    );

    expect([leer.status, editar.status, borrar.status]).toEqual([404, 404, 404]);
  });

  it("un id mal formado responde 404", async () => {
    const respuesta = await GET_UNO(
      peticion("GET", "/api/marcadores/../../otro", { token: ANA.token }),
      contexto({ id: "../../otro" }),
    );
    expect(respuesta.status).toBe(404);
  });
});

describe("Edición y borrado propios", () => {
  it("Ana edita su marcador y luego lo borra (200 y 204)", async () => {
    const editar = await PATCH(
      peticion("PATCH", `/api/marcadores/${ID_ANA}`, { token: ANA.token, cuerpo: { publico: true, etiquetas: ["css"] } }),
      contexto({ id: ID_ANA }),
    );
    expect(editar.status).toBe(200);
    expect(await editar.json()).toMatchObject({ publico: true, etiquetas: ["css"] });

    const borrar = await DELETE(peticion("DELETE", `/api/marcadores/${ID_ANA}`, { token: ANA.token }), contexto({ id: ID_ANA }));
    expect(borrar.status).toBe(204);
  });

  it("un PATCH vacío responde 400", async () => {
    const respuesta = await PATCH(
      peticion("PATCH", `/api/marcadores/${ID_ANA}`, { token: ANA.token, cuerpo: {} }),
      contexto({ id: ID_ANA }),
    );
    expect(respuesta.status).toBe(400);
  });
});
