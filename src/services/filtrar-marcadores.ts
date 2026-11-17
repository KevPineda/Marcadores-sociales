import type { Busqueda, Marcador } from "@/schemas/marcador";

export type EtiquetaConConteo = { nombre: string; total: number };

/** Pasa a minúsculas y quita tildes para comparar textos. */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Filtra por etiqueta y por palabras (todas deben aparecer en título, descripción, URL o etiquetas). */
export function filtrarMarcadores(marcadores: Marcador[], busqueda: Busqueda): Marcador[] {
  const palabras = normalizarTexto(busqueda.q).split(/\s+/).filter(Boolean);
  const resultado: Marcador[] = [];

  for (const marcador of marcadores) {
    if (busqueda.etiqueta && !marcador.etiquetas.includes(busqueda.etiqueta)) {
      continue;
    }
    const texto = normalizarTexto(
      [marcador.titulo, marcador.descripcion ?? "", marcador.url, ...marcador.etiquetas].join(" "),
    );
    if (palabras.every((palabra) => texto.includes(palabra))) {
      resultado.push(marcador);
    }
  }

  return resultado;
}

/** Cuenta cuántos marcadores tiene cada etiqueta, de la más usada a la menos usada. */
export function contarEtiquetas(marcadores: Marcador[]): EtiquetaConConteo[] {
  const conteo = new Map<string, number>();
  for (const marcador of marcadores) {
    for (const etiqueta of marcador.etiquetas) {
      conteo.set(etiqueta, (conteo.get(etiqueta) ?? 0) + 1);
    }
  }

  const etiquetas: EtiquetaConConteo[] = [];
  for (const [nombre, total] of conteo) {
    etiquetas.push({ nombre, total });
  }
  return etiquetas.sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
}

/** Devuelve el dominio legible de una URL (sin «www.»). */
export function obtenerDominio(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
