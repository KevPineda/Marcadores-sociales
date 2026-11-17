import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { busquedaSchema, listaMarcadoresSchema, marcadorSchema } from "@/schemas/marcador";
import { crearMarcador } from "../fixtures/marcadores";

describe("marcadorSchema", () => {
  it("acepta un marcador válido", () => {
    expect(marcadorSchema.safeParse(crearMarcador()).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "ftp://servidor/archivo", "no-es-url"])("rechaza la URL %s", (url) => {
    expect(marcadorSchema.safeParse(crearMarcador({ url })).success).toBe(false);
  });

  it("rechaza campos desconocidos (modo estricto)", () => {
    expect(marcadorSchema.safeParse({ ...crearMarcador(), uid: "otro-usuario" }).success).toBe(false);
  });

  it("los datos de ejemplo cumplen el esquema", () => {
    const archivo = path.resolve(import.meta.dirname, "../../public/datos/marcadores-ejemplo.json");
    const datos: unknown = JSON.parse(readFileSync(archivo, "utf8"));
    expect(listaMarcadoresSchema.safeParse(datos).success).toBe(true);
  });
});

describe("busquedaSchema", () => {
  it("normaliza la etiqueta a minúsculas y recorta el texto", () => {
    expect(busquedaSchema.parse({ q: "  next  ", etiqueta: "React" })).toEqual({ q: "next", etiqueta: "react" });
  });

  it("rechaza búsquedas de más de 100 caracteres", () => {
    expect(busquedaSchema.safeParse({ q: "a".repeat(101), etiqueta: null }).success).toBe(false);
  });

  it("rechaza etiquetas con caracteres no permitidos", () => {
    expect(busquedaSchema.safeParse({ q: "", etiqueta: "<script>" }).success).toBe(false);
  });
});
