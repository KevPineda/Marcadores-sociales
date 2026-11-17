import { describe, expect, it } from "vitest";
import { idDesdeUrl, motivoUrlNoPermitida, normalizarUrl, sonUrlsDuplicadas } from "@/services/url";

describe("normalizarUrl y duplicados", () => {
  const casos: Array<[string, string, string, boolean]> = [
    ["parámetros utm_*", "https://web.dev/vitals?utm_source=x&utm_medium=y", "https://web.dev/vitals", true],
    ["fbclid y gclid", "https://web.dev/vitals?fbclid=abc&gclid=123", "https://web.dev/vitals", true],
    ["fragmento #", "https://web.dev/vitals#lcp", "https://web.dev/vitals", true],
    ["orden de parámetros", "https://ejemplo.com/b?z=1&a=2", "https://ejemplo.com/b?a=2&z=1", true],
    ["mayúsculas en el host", "https://EJEMPLO.com/Ruta", "https://ejemplo.com/Ruta", true],
    ["puerto por defecto", "https://ejemplo.com:443/a", "https://ejemplo.com/a", true],
    ["barra final", "https://ejemplo.com/docs/", "https://ejemplo.com/docs", true],
    ["parámetros con significado distintos", "https://ejemplo.com/p?id=1", "https://ejemplo.com/p?id=2", false],
    ["mayúsculas en la ruta importan", "https://ejemplo.com/Docs", "https://ejemplo.com/docs", false],
    ["http y https son distintos", "http://ejemplo.com/a", "https://ejemplo.com/a", false],
  ];

  it.each(casos)("%s", (_, a, b, duplicadas) => {
    expect(sonUrlsDuplicadas(a, b)).toBe(duplicadas);
  });

  it("conserva parámetros útiles y quita solo los de seguimiento", () => {
    expect(normalizarUrl("https://ejemplo.com/buscar?q=css&utm_campaign=x#arriba")).toBe(
      "https://ejemplo.com/buscar?q=css",
    );
  });

  it("criterio 4: un enlace repetido con utm_* se detecta como duplicado", () => {
    expect(
      sonUrlsDuplicadas("https://zod.dev/?utm_source=boletin&utm_medium=email", "https://zod.dev/"),
    ).toBe(true);
  });

  it("un texto que no es URL nunca es duplicado", () => {
    expect(sonUrlsDuplicadas("no es url", "no es url")).toBe(false);
  });

  it("el id es el mismo para URLs duplicadas (evita duplicados en Firestore)", async () => {
    const a = await idDesdeUrl(normalizarUrl("https://web.dev/vitals?utm_source=x"));
    const b = await idDesdeUrl(normalizarUrl("https://web.dev/vitals#lcp"));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("motivoUrlNoPermitida (SSRF)", () => {
  it.each([
    ["criterio 1: metadatos de la nube", "http://169.254.169.254/"],
    ["metadatos en decimal", "http://2852039166/"],
    ["metadatos en hexadecimal", "http://0xa9fea9fe/"],
    ["loopback", "http://127.0.0.1:8080/admin"],
    ["loopback abreviado", "http://127.1/"],
    ["loopback en octal", "http://0177.0.0.1/"],
    ["localhost", "http://localhost:3000/"],
    ["subdominio de localhost", "http://api.localhost/"],
    ["0.0.0.0", "http://0.0.0.0/"],
    ["red privada 10/8", "http://10.0.0.5/"],
    ["red privada 172.16/12", "http://172.20.1.1/"],
    ["red privada 192.168/16", "https://192.168.1.1/"],
    ["CGNAT 100.64/10", "http://100.64.0.1/"],
    ["IPv6 loopback", "http://[::1]/"],
    ["IPv6 local de enlace", "http://[fe80::1]/"],
    ["IPv6 única local", "http://[fd00::1]/"],
    ["IPv4 mapeada en IPv6", "http://[::ffff:127.0.0.1]/"],
    ["IPv4 mapeada a metadatos", "http://[::ffff:169.254.169.254]/"],
    ["dominio .internal", "http://metadata.google.internal/"],
    ["dominio .local", "http://impresora.local/"],
    ["host sin dominio", "http://intranet/"],
  ])("bloquea %s (%s)", (_, url) => {
    expect(motivoUrlNoPermitida(url)).toMatch(/internas o locales/);
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://ejemplo.com/archivo"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
  ])("bloquea el esquema %s", (_, url) => {
    expect(motivoUrlNoPermitida(url)).toMatch(/http:\/\/ o https:\/\//);
  });

  it("bloquea credenciales en la URL", () => {
    expect(motivoUrlNoPermitida("https://usuario:clave@ejemplo.com/")).toMatch(/usuario ni contraseña/);
  });

  it("pide una URL completa si el texto no es URL", () => {
    expect(motivoUrlNoPermitida("ejemplo.com")).toMatch(/dirección web completa/);
  });

  it.each([
    "https://developer.mozilla.org/es/docs/Web",
    "http://ejemplo.com/",
    "https://172.32.0.1/",
    "https://8.8.8.8/",
    "https://[2606:4700:4700::1111]/",
  ])("permite la URL pública %s", (url) => {
    expect(motivoUrlNoPermitida(url)).toBeNull();
  });
});
