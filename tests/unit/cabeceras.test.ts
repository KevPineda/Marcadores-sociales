// @vitest-environment node
import { describe, expect, it } from "vitest";
import configuracion, { CABECERAS_SEGURIDAD } from "../../next.config";

describe("cabeceras de seguridad", () => {
  it("se aplican a todas las rutas", async () => {
    const reglas = await configuracion.headers?.();
    expect(reglas?.[0]?.source).toBe("/:path*");
  });

  it("incluyen nosniff, Referrer-Policy y una CSP que bloquea iframes y objetos", () => {
    const porNombre = Object.fromEntries(CABECERAS_SEGURIDAD.map(({ key, value }) => [key, value]));
    expect(porNombre["X-Content-Type-Options"]).toBe("nosniff");
    expect(porNombre["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(porNombre["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(porNombre["Content-Security-Policy"]).toContain("object-src 'none'");
  });
});
