import { describe, expect, it } from "vitest";
import { rutaInternaSegura } from "@/lib/sesion";

describe("rutaInternaSegura (evita redirecciones abiertas tras el login)", () => {
  it("acepta rutas internas con su query", () => {
    expect(rutaInternaSegura("/guardar")).toBe("/guardar");
    expect(rutaInternaSegura("/?q=css&etiqueta=web")).toBe("/?q=css&etiqueta=web");
  });

  it.each([
    [null],
    [""],
    ["https://malicioso.example/"],
    ["//malicioso.example/"],
    ["/\\malicioso.example"],
    ["javascript:alert(1)"],
    ["/login?siguiente=/"],
  ])("devuelve / para %s", (valor) => {
    expect(rutaInternaSegura(valor)).toBe("/");
  });
});
