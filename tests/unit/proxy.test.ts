// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

describe("proxy.ts", () => {
  it("sin cookie redirige a /login conservando la ruta pedida", () => {
    const respuesta = proxy(new NextRequest("https://marcadores.example/guardar?x=1"));
    expect(respuesta.status).toBe(307);
    const destino = new URL(respuesta.headers.get("location") ?? "");
    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("siguiente")).toBe("/guardar?x=1");
  });

  it("con cookie de sesión deja pasar (la verificación real la hace la API)", () => {
    const peticion = new NextRequest("https://marcadores.example/", { headers: { cookie: "sesion=abc" } });
    expect(proxy(peticion).headers.get("location")).toBeNull();
  });

  it("no se aplica a la API, al login ni a las colecciones públicas", () => {
    expect(config.matcher).not.toContain("/api/:path*");
    expect(config.matcher.some((ruta) => ruta.startsWith("/login") || ruta.startsWith("/u"))).toBe(false);
  });
});
