import { describe, expect, it } from "vitest";
import { nuevoMarcadorSchema, separarEtiquetas } from "@/schemas/nuevo-marcador";

const VALIDO = { url: "https://zod.dev/", titulo: "", etiquetas: ["typescript"], publico: false };

describe("separarEtiquetas", () => {
  it("separa por comas y espacios, quita # y pasa a minúsculas", () => {
    expect(separarEtiquetas(" CSS, #Diseño  web,,")).toEqual(["css", "diseño", "web"]);
  });
});

describe("nuevoMarcadorSchema", () => {
  it("acepta datos válidos y convierte el título vacío en null", () => {
    expect(nuevoMarcadorSchema.parse(VALIDO)).toEqual({ ...VALIDO, titulo: null });
  });

  it("rechaza campos desconocidos (mass assignment)", () => {
    const resultado = nuevoMarcadorSchema.safeParse({ ...VALIDO, uid: "otro-usuario", estado: "ok" });
    expect(resultado.success).toBe(false);
  });

  it("rechaza URLs internas con un mensaje en el campo url", () => {
    const resultado = nuevoMarcadorSchema.safeParse({ ...VALIDO, url: "http://169.254.169.254/" });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["url"]);
  });

  it("rechaza etiquetas repetidas y más de 10 etiquetas", () => {
    expect(nuevoMarcadorSchema.safeParse({ ...VALIDO, etiquetas: ["css", "css"] }).success).toBe(false);
    const once = Array.from({ length: 11 }, (_, indice) => `e${indice}`);
    expect(nuevoMarcadorSchema.safeParse({ ...VALIDO, etiquetas: once }).success).toBe(false);
  });
});
