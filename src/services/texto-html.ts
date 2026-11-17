const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodifica las entidades HTML más comunes (&amp;, &#39;, &#x2F;…). El resultado sigue siendo texto no confiable. */
export function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original, entidad: string) => {
    if (entidad[0] === "#") {
      const codigo = entidad[1].toLowerCase() === "x" ? parseInt(entidad.slice(2), 16) : parseInt(entidad.slice(1), 10);
      return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : original;
    }
    return ENTIDADES[entidad.toLowerCase()] ?? original;
  });
}

/** Escapa texto para insertarlo en HTML (contenido y atributos entre comillas dobles). */
export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Decodifica, quita etiquetas, colapsa espacios y recorta; null si queda vacío. */
export function limpiarTexto(texto: string | undefined, maximo: number): string | null {
  if (!texto) {
    return null;
  }
  const limpio = decodificarEntidades(texto.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return limpio ? limpio.slice(0, maximo) : null;
}
