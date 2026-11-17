/** Parámetros de seguimiento que no cambian el contenido de la página. */
const PARAMETROS_SEGUIMIENTO = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "yclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
]);

/** Nombres de host que siempre apuntan a la red interna. */
const HOSTS_INTERNOS = new Set(["localhost", "metadata.google.internal", "metadata"]);

/** Sufijos de dominio reservados para redes internas. */
const SUFIJOS_INTERNOS = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

/** Rangos IPv4 no públicos: [primera dirección, longitud del prefijo]. */
const RANGOS_IPV4_PRIVADOS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

/** Indica si un parámetro de la URL es de seguimiento. */
function esParametroSeguimiento(nombre: string): boolean {
  const minuscula = nombre.toLowerCase();
  return minuscula.startsWith("utm_") || PARAMETROS_SEGUIMIENTO.has(minuscula);
}

/**
 * Normaliza una URL para guardarla y comparar duplicados: quita parámetros de
 * seguimiento y el fragmento, ordena los parámetros y quita la barra final.
 * Lanza TypeError si el texto no es una URL.
 */
export function normalizarUrl(texto: string): string {
  const url = new URL(texto.trim());
  url.hash = "";

  const parametros: Array<[string, string]> = [];
  for (const [nombre, valor] of url.searchParams) {
    if (!esParametroSeguimiento(nombre)) {
      parametros.push([nombre, valor]);
    }
  }
  parametros.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  url.search = new URLSearchParams(parametros).toString();

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

/** Indica si dos URLs apuntan al mismo recurso una vez normalizadas. */
export function sonUrlsDuplicadas(a: string, b: string): boolean {
  try {
    return normalizarUrl(a) === normalizarUrl(b);
  } catch {
    return false;
  }
}

/** Id del documento: SHA-256 (hex) de la URL normalizada; evita duplicados en Firestore. */
export async function idDesdeUrl(urlNormalizada: string): Promise<string> {
  const bytes = new TextEncoder().encode(urlNormalizada);
  const resumen = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(resumen), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Convierte una IPv4 en texto a número, o null si no es una IPv4. */
function ipv4ANumero(ip: string): number | null {
  const partes = ip.split(".");
  if (partes.length !== 4) {
    return null;
  }
  let numero = 0;
  for (const parte of partes) {
    if (!/^\d{1,3}$/.test(parte) || Number(parte) > 255) {
      return null;
    }
    numero = numero * 256 + Number(parte);
  }
  return numero;
}

/** Indica si una IPv4 pertenece a un rango no público. */
export function esIpv4Privada(ip: string): boolean {
  const numero = ipv4ANumero(ip);
  if (numero === null) {
    return false;
  }
  for (const [inicio, prefijo] of RANGOS_IPV4_PRIVADOS) {
    const tamano = 2 ** (32 - prefijo);
    const base = ipv4ANumero(inicio) ?? 0;
    if (numero >= base && numero < base + tamano) {
      return true;
    }
  }
  return numero === 0xffffffff;
}

/** Indica si una IPv6 (sin corchetes) es local, privada o mapea una IPv4 privada. */
export function esIpv6Privada(ip: string): boolean {
  const minuscula = ip.toLowerCase();
  if (minuscula === "::" || minuscula === "::1") {
    return true;
  }
  if (/^f[cd][0-9a-f]{0,2}:/.test(minuscula) || /^fe[89ab][0-9a-f]?:/.test(minuscula)) {
    return true;
  }
  // IPv4 mapeada (::ffff:a.b.c.d o ::ffff:7f00:1, como la deja el parser de URL).
  const mapeada = /^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/.exec(minuscula);
  if (mapeada) {
    if (mapeada[1]) {
      return esIpv4Privada(mapeada[1]);
    }
    const alto = parseInt(mapeada[2], 16);
    const bajo = parseInt(mapeada[3], 16);
    return esIpv4Privada(`${alto >> 8}.${alto & 255}.${bajo >> 8}.${bajo & 255}`);
  }
  return false;
}

/** Indica si un nombre de host apunta a la red interna (por nombre o IP literal). */
export function esHostInterno(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) {
    return esIpv6Privada(host.slice(1, -1));
  }
  if (ipv4ANumero(host) !== null) {
    return esIpv4Privada(host);
  }
  if (!host.includes(".")) {
    return true;
  }
  return HOSTS_INTERNOS.has(host) || SUFIJOS_INTERNOS.some((sufijo) => host.endsWith(sufijo));
}

/**
 * Protección SSRF (primera capa, sin DNS): devuelve el motivo por el que la URL
 * no se permite, o null si es una URL http/https hacia un host público.
 * El servidor repite la comprobación con las IPs resueltas antes de descargar.
 */
export function motivoUrlNoPermitida(texto: string): string | null {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    return "Escribe una dirección web completa, por ejemplo https://ejemplo.com.";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Solo se permiten enlaces que empiecen por http:// o https://.";
  }
  if (url.username || url.password) {
    return "El enlace no puede incluir usuario ni contraseña.";
  }
  if (esHostInterno(url.hostname)) {
    return "No se permiten enlaces a direcciones internas o locales.";
  }
  return null;
}
