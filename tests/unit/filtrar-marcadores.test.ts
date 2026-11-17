import { describe, expect, it } from "vitest";
import {
  contarEtiquetas,
  filtrarMarcadores,
  normalizarTexto,
  obtenerDominio,
} from "@/services/filtrar-marcadores";
import { MARCADORES_PRUEBA } from "../fixtures/marcadores";

/** Ids de los marcadores que devuelve el filtro. */
function idsFiltrados(q: string, etiqueta: string | null = null): string[] {
  return filtrarMarcadores(MARCADORES_PRUEBA, { q, etiqueta }).map((marcador) => marcador.id);
}

describe("normalizarTexto", () => {
  it("quita tildes, mayúsculas y espacios de los extremos", () => {
    expect(normalizarTexto("  Métricas ESENCIALES ")).toBe("metricas esenciales");
  });
});

describe("filtrarMarcadores", () => {
  it("sin búsqueda ni etiqueta devuelve todo", () => {
    expect(idsFiltrados("")).toEqual(["m1", "m2", "m3"]);
  });

  it("busca sin importar tildes ni mayúsculas", () => {
    expect(idsFiltrados("METRICAS")).toEqual(["m2"]);
  });

  it("busca en la URL y en las etiquetas", () => {
    expect(idsFiltrados("owasp")).toEqual(["m3"]);
    expect(idsFiltrados("rendimiento")).toEqual(["m2"]);
  });

  it("exige que aparezcan todas las palabras", () => {
    expect(idsFiltrados("fetch javascript")).toEqual(["m1"]);
    expect(idsFiltrados("fetch seguridad")).toEqual([]);
  });

  it("filtra por etiqueta y combina con la búsqueda", () => {
    expect(idsFiltrados("", "javascript")).toEqual(["m1", "m3"]);
    expect(idsFiltrados("ssrf", "javascript")).toEqual(["m3"]);
  });

  it("tolera descripción nula", () => {
    expect(idsFiltrados("prevencion")).toEqual(["m3"]);
  });
});

describe("contarEtiquetas", () => {
  it("cuenta y ordena de la más usada a la menos usada, luego alfabéticamente", () => {
    expect(contarEtiquetas(MARCADORES_PRUEBA)).toEqual([
      { nombre: "javascript", total: 2 },
      { nombre: "rendimiento", total: 1 },
      { nombre: "seguridad", total: 1 },
    ]);
  });
});

describe("obtenerDominio", () => {
  it("quita el prefijo www.", () => {
    expect(obtenerDominio("https://www.w3.org/WAI/")).toBe("w3.org");
  });
});
