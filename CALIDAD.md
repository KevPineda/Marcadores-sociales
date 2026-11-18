# Evidencias de calidad

**URL de producción:** https://marcadores-sociales.vercel.app · Mediciones del 2026-11-18 (sección 14 del enunciado).
Los informes completos están en [`calidad/`](calidad/) (ábralos en el navegador: `*.report.html`).

## 1. Rendimiento y Core Web Vitals (Lighthouse 12, `/login`, producción)

| Corrida                 | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP   | LCP   | CLS | TBT      |
|-------------------------|:-----------:|:-------------:|:----------------:|:---:|-------|-------|:---:|----------|
| Móvil 1                 | 76          | 100           | 96               | 100 | 1,0 s | 2,2 s | 0   | 1 080 ms |
| Móvil 2                 | 62          | 100           | 96               | 100 | 0,9 s | 3,0 s | 0   | 2 900 ms |
| Móvil 3                 | 79          | 100           | 96               | 100 | 1,0 s | 2,0 s | 0   | 910 ms   |
| Escritorio              | 97          | 100           | 96               | 100*| 0,3 s | 0,6 s | 0   | 140 ms   |

\* El SEO de escritorio se midió antes de quitar el `noindex` del login (daba 60 solo por eso); en móvil ya da 100.

- **Cumple:** Accesibilidad 100, SEO 100, Buenas prácticas 96 (≥ 95), **CLS = 0**, LCP ≤ 2,5 s en 2 de 3 corridas, peso total **258 KiB** (≤ 1 MB).
- **No cumple aún:** Rendimiento móvil ≥ 90. La causa es el **TBT** (JavaScript de React/Next en un móvil simulado); varía mucho entre corridas porque Lighthouse simula la CPU lenta sobre el equipo local. Medido antes en el mismo equipo con menos carga: **89**.
- **Mejora aplicada:** el SDK de Firebase Auth se carga solo al enviar el formulario (`import()` dinámico). Rendimiento móvil pasó de **68 → 89** y escritorio de **83 → 97** (misma página, mismo equipo).
- **Pendiente:** medir con PageSpeed Insights (servidores de Google, más estable) y medir **INP** interactuando en un teléfono real.
- Buenas prácticas 96: Lighthouse advierte que la CSP usa `'unsafe-inline'` en `script-src` (lo necesita Next.js sin nonces). Mejora posible: CSP con *nonce* desde `proxy.ts`.

## 2. Verificación automática

| Herramienta                    | Resultado                                  |
|--------------------------------|--------------------------------------------|
| `npm run lint` (ESLint + jsx-a11y) | 0 errores, 0 advertencias (`--max-warnings=0`) |
| `npm run typecheck`            | Sin errores                                |
| `npm test` (Vitest)            | **224 pruebas** en 22 archivos, todas pasan |
| `npm run build`                | Build de producción correcto               |

Pruebas por tipo: unitarias (URL/SSRF, normalización, metadatos, Netscape, http, proxy, cabeceras, redirección segura), componentes (lista, formulario, login, panel de cuenta), API (los 4 criterios de aceptación, 401/403/404/409/413/415/429) e integración.

## 3. Prueba de extremo a extremo en producción

Ejecutada contra https://marcadores-sociales.vercel.app con un usuario temporal (luego borrado):

| Paso                                         | Resultado |
|----------------------------------------------|-----------|
| Crear cookie de sesión                       | `204`, cookie `HttpOnly; Secure; SameSite=Lax` |
| Guardar `https://nextjs.org/docs?utm_source=…` | `201`, título «Next.js Docs», con imagen, URL sin `utm_*` |
| Guardar el mismo enlace con otro `utm_*`     | `409` (duplicado) |
| Guardar `http://169.254.169.254/…` (SSRF)    | `400` |
| Filtrar por etiqueta (índice compuesto)      | `200` |
| Crear perfil y ver `/u/[nombre]` sin sesión  | `201` y `200`, muestra el marcador público |
| Borrar marcador / cerrar sesión              | `204` / `204` |
| Usar la cookie después de cerrar sesión      | `401` (tokens revocados) |
| `POST` con `Origin` ajeno                    | `403` (CSRF) |
| Rutas privadas sin cookie                    | `307` a `/login?siguiente=…` |

## 4. Seguridad (cabeceras en producción)

`Content-Security-Policy` (sin iframes ni `object`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Strict-Transport-Security`; sin `X-Powered-By`. HTTPS en Vercel.

## 5. Accesibilidad, responsive y HTML

- Automático: Lighthouse Accesibilidad **100**; ESLint `jsx-a11y` sin advertencias; pruebas de componentes por rol y etiqueta.
- Implementado: «Saltar al contenido», un `<h1>` por página, landmarks, foco visible, errores junto al campo con `aria-describedby` y `aria-live`, `autocomplete` en el login (admite gestor de contraseñas y pegar), `prefers-color-scheme` y `prefers-reduced-motion`, objetivos táctiles ≥ 2,75 rem (44 px).
- **Pendiente de evidencia manual** (capturas en `calidad/`): recorrido solo con teclado, una pasada con NVDA, axe DevTools, y capturas a 360 / 768 / 1024 px y zoom 200 %.
