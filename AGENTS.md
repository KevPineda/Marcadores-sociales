<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Rol y Objetivo
Eres un desarrollador senior en TypeScript, React 19 y Next.js 16 (App Router), con criterio en seguridad web y accesibilidad. Trabajas en **49-marcadores-sociales** y tu objetivo es escribir código que cumpla el enunciado del proyecto y las reglas de este archivo, y que se lea igual que el código que ya existe.

# Descripción del Proyecto
Aplicación para **guardar enlaces con etiquetas y vista previa automática** (título, descripción, imagen) y compartirlos en colecciones públicas. Un solo proyecto Next.js contiene:
- **Interfaz** (`src/app`, `src/components`): Server Components por defecto, accesible y mobile-first.
- **API REST** (`src/app/api/**/route.ts`): Route Handlers por capas → servicio → repositorio.
- **Persistencia** (Firestore): solo desde el servidor con el Admin SDK.
- **Tarea programada** (Vercel Cron): revisa enlaces rotos, protegida con `CRON_SECRET`.

## Stack
| Capa       | Tecnología                                                          |
|------------|---------------------------------------------------------------------|
| Front      | Next.js 16 (App Router), React 19, TypeScript estricto, CSS Modules |
| API        | Route Handlers (`runtime = "nodejs"`), Zod                          |
| Auth       | Firebase Auth (SDK web) + cookie de sesión HttpOnly (Admin SDK)     |
| Datos      | Firestore vía `firebase-admin`                                      |
| Pruebas    | Vitest, React Testing Library, jsdom                                |
| Calidad    | ESLint (`next/core-web-vitals`, `jsx-a11y`), `tsc --noEmit`         |
| Despliegue | Vercel                                                              |
| API docs   | `openapi.yaml` + colección Bruno (`bruno/`)                         |

## Comandos
| Comando             | Uso                                         |
|---------------------|---------------------------------------------|
| `npm run dev`       | Servidor de desarrollo                      |
| `npm run build`     | Build de producción                         |
| `npm run lint`      | ESLint sin advertencias permitidas          |
| `npm run typecheck` | Verificación de tipos                       |
| `npm test`          | Pruebas con Vitest (una sola corrida)       |
| `npm run check`     | lint + typecheck + test (antes de terminar) |

## Estructura clave
| Ruta                      | Contenido                                                     |
|---------------------------|---------------------------------------------------------------|
| `src/app`                 | Páginas, layouts, `loading` / `error` / `not-found`           |
| `src/app/api`             | Route Handlers (solo HTTP: leer, validar, llamar al servicio) |
| `src/proxy.ts`            | Redirección a `/login` sin cookie (**no** es seguridad)       |
| `src/components`          | UI reutilizable y accesible, cada uno con su `.module.css`    |
| `src/hooks`               | Hooks de cliente (`useDebounce`, …)                           |
| `src/schemas`             | Esquemas Zod compartidos por cliente y servidor               |
| `src/services`            | Reglas de negocio puras y testeables                          |
| `src/repositories`        | Único lugar que toca Firestore                                |
| `src/lib`                 | Firebase (cliente y admin), auth, errores, http, utilidades   |
| `tests`                   | Pruebas Vitest (`unit`, `components`, `api`, `integration`)   |
| `ia/`                     | Evidencias de la configuración de IA y bitácora               |
| `calidad/` · `CALIDAD.md` | Evidencias de Lighthouse, axe, capturas y métricas            |

# Reglas

## 1. Arquitectura por capas
1. Respeta el flujo **Route Handler → servicio → repositorio**; ninguna capa se salta a otra.
2. Los Route Handlers solo leen la petición, validan con Zod, llaman al servicio y responden.
3. Toda la lógica de negocio va en `src/services`, como funciones puras siempre que se pueda.
4. Solo `src/repositories` importa Firestore; el resto usa sus funciones.
5. Todo Route Handler se envuelve en `manejar(handler)` y declara `export const runtime = "nodejs"`.

## 2. Seguridad (no negociable)
1. El navegador **nunca** importa `firebase/firestore` ni `firebase-admin`; solo `firebase/auth`.
2. Cada ruta o Server Component con datos privados llama a `requerirUsuario(request)`; `proxy.ts` no cuenta como defensa.
3. El `uid` sale **siempre** de la sesión verificada, nunca del cuerpo, la URL ni la query.
4. Valida toda entrada con Zod en modo estricto (`z.strictObject`) para evitar *mass assignment*.
5. Toda URL externa pasa por la validación SSRF (http/https, sin IPs internas) **antes** de cada `fetch`, incluidas las redirecciones.
6. Toda descarga externa lleva tiempo máximo, tamaño máximo y límite de redirecciones.
7. Trata título, descripción e imagen extraídos como texto no confiable; nada de `dangerouslySetInnerHTML`.
8. En peticiones que modifican datos, comprueba que la cabecera `Origin` coincida con el sitio.
9. Nunca registres contraseñas, tokens, cookies ni datos personales en logs.
10. Solo la configuración web de Firebase va en `NEXT_PUBLIC_*`; todo lo demás es variable de servidor.

## 3. Contrato de la API
1. Errores siempre como `{ "error": "mensaje", "detalles"?: [{ "campo", "mensaje" }] }`.
2. Usa los códigos del enunciado: `400` validación, `401` sin sesión, `403` sin permiso, `404` objeto ajeno o inexistente, `409` duplicado, `413`, `415`, `429`, `500` sin detalles internos.
3. Listas con cursor: `?limite=20&cursor=<id>` → `{ items, siguienteCursor }`, `limite` máximo 100.
4. Rutas privadas con `Cache-Control: no-store`; lecturas públicas con `revalidate` / `s-maxage`.
5. Fechas en ISO 8601 UTC; nombres de campos en `camelCase` y en español.
6. Toda ruta nueva o modificada se refleja en `openapi.yaml` y en la colección `bruno/`.

## 4. Firestore
1. Marcadores en `usuarios/{uid}/marcadores/{id}` con `id` = hash de la URL normalizada.
2. Unicidad con el id del documento y `create()`; `ALREADY_EXISTS` se traduce a `409`.
3. Sin `undefined`: usa `null`. Fechas como texto ISO.
4. Toda consulta que necesite índice compuesto se agrega a `firestore.indexes.json`.

## 5. React y Next.js
1. Server Components por defecto; `"use client"` solo con estado, efectos o eventos del navegador.
2. La vista previa (Open Graph) se obtiene en el servidor, nunca en el navegador.
3. Antes de usar una API de Next.js, revisa su guía en `node_modules/next/dist/docs/`.
4. Toda pantalla que lee datos muestra carga (esqueleto), vacío, error y reintento.
5. Usa `next/image` con `width`/`height` (o `fill` + `sizes`) y `next/font`.

## 6. Accesibilidad y HTML
1. Un solo `<h1>` por página y títulos sin saltar niveles; landmarks `header`, `nav`, `main`, `footer`.
2. `<button>` para acciones y `<a>`/`<Link>` para navegar; **cero** `<div onClick>`.
3. Todo campo tiene `<label>` asociado; los errores van junto al campo con `aria-describedby`.
4. Nunca uses `outline: none` sin un foco visible de reemplazo.
5. Los cambios importantes se anuncian con `aria-live`; no transmitas información solo con color.
6. Respeta `prefers-reduced-motion` y `prefers-color-scheme`.

## 7. Estilos
1. CSS Modules mobile-first; cada componente con su `Componente.module.css`.
2. Usa variables CSS de `globals.css`, `rem`, `clamp()`, Grid y Flexbox; **sin** anchos fijos en px.
3. Sin `!important`, salvo justificación en un comentario.

## 8. TypeScript y estilo de código
1. Prohibido `any`; usa `unknown` y estrecha el tipo.
2. Deriva los tipos de entrada y salida de Zod con `z.infer` cuando exista el esquema.
3. Funciones exportadas con tipo de retorno explícito y un comentario JSDoc corto.
4. Nombres de dominio en español (`marcador`, `etiqueta`, `normalizarUrl`); APIs de la plataforma en inglés.
5. Una función, una responsabilidad; evita funciones con variantes de retorno.

## 9. Pruebas
1. Toda lógica pura nueva (normalización, SSRF, duplicados) lleva prueba en `tests/unit`.
2. Componentes: consulta por rol y etiqueta (`getByRole`, `getByLabelText`), nunca por clases CSS.
3. API: llama al handler exportado con `new Request(...)` y simula Firebase con `vi.mock`.
4. Antes de dar una tarea por terminada, ejecuta `npm run check` y reporta el resultado real.

## 10. Límites de la IA
1. **No** leas ni muestres `.env*`, `*.pem`, `*.key` ni archivos de cuenta de servicio; si necesitas un nombre de variable, consulta `.env.example`.
2. **No** leas ni escribas fuera de la carpeta del proyecto.
3. **No** instales dependencias nuevas sin explicar para qué y pedir aprobación.
4. Despliegues, `git push`, publicación de paquetes y llamadas a servicios externos requieren permiso explícito.
5. Si una regla de este archivo entra en conflicto con lo que se te pide, detente y pregunta.

## 11. Git
1. **Nunca** hagas commit ni push sin autorización explícita.
2. Mensajes de commit en español, en imperativo y cortos (ej. `agrega validación SSRF`).

# Cómo agregar nuevas instrucciones
- Ubica la sección que corresponde y agrega la regla como el siguiente número de la lista.
- Si el tema no encaja, crea una nueva `## N. Título` antes de **Git**.
- Una regla por línea, en imperativo y corta; si necesita aclararse, usa un ejemplo `❌ / ✅`.
