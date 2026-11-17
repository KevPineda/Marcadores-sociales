# 49 · Marcadores sociales con vista previa

Guarda enlaces con etiquetas y vista previa automática (título, descripción, imagen) y compártelos.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules · Zod · Firebase (Auth + Firestore vía Admin SDK) · Vitest · Vercel.

## Requisitos

- Node.js 24 y npm 11
- En Windows, ejecute los comandos de npm desde PowerShell (las dependencias nativas quedan compiladas para Windows).

## Puesta en marcha

```bash
npm install
copy .env.example .env.local   # PowerShell/CMD (en bash: cp .env.example .env.local)
npm run dev                    # http://localhost:3000
```

Complete `.env.local` con la configuración de Firebase (ver comentarios en `.env.example`). **Nunca** lo suba a Git.
En el Hito 1 la aplicación funciona sin variables de entorno: usa los datos de ejemplo de `public/datos/marcadores-ejemplo.json`.

## Scripts

| Comando             | Qué hace                                  |
|---------------------|-------------------------------------------|
| `npm run dev`       | Servidor de desarrollo                    |
| `npm run build`     | Build de producción                       |
| `npm start`         | Sirve el build de producción              |
| `npm run lint`      | ESLint sin advertencias permitidas        |
| `npm run typecheck` | Verificación de tipos                     |
| `npm test`          | Todas las pruebas (Vitest)                |
| `npm run test:ia`   | Pruebas de la configuración de IA         |
| `npm run check`     | lint + typecheck + test                   |

## Estructura

```text
src/
├── app/            # rutas, layout, loading, error, not-found
├── components/     # UI reutilizable (cada uno con su .module.css)
├── hooks/          # useDebounce, useCargarMarcadores
├── schemas/        # esquemas Zod compartidos por cliente y servidor
├── services/       # reglas de negocio puras (filtrado, etiquetas)
├── repositories/   # acceso a Firestore (Hito 3)
└── lib/            # carga de datos, Firebase, utilidades
tests/              # unit · components · api · integration
ia/                 # configuración de IA: evidencias, pruebas y bitácora
bruno/              # colección de solicitudes (Hito 3)
calidad/            # evidencias de calidad (Hito 4)
```

## Estado por hito

- [x] **Hito 1:** lista de marcadores de ejemplo con tarjetas de vista previa, búsqueda y filtro por etiqueta; carga con `fetch` validada con Zod; estados de carga, vacío, error y reintento; configuración de IA.
- [x] **Hito 2:** rutas `/guardar`, `/etiquetas/[etiqueta]` y `/u/[nombre]`; formulario controlado validado con el esquema Zod compartido; normalización de URL, detección de duplicados y validación SSRF con pruebas. Los enlaces nuevos se guardan temporalmente en `localStorage` hasta el Hito 3.
- [ ] **Hito 3:** API REST por capas con Firestore, `openapi.yaml` y colección Bruno.
- [ ] **Hito 4:** Firebase Auth, seguridad, evidencias de calidad y despliegue en Vercel.

## Rutas

| Ruta                    | Contenido                                                      |
|-------------------------|----------------------------------------------------------------|
| `/`                     | Mis marcadores: búsqueda, filtro por etiqueta (`?q=&etiqueta=`) |
| `/guardar`              | Guardar un enlace                                              |
| `/etiquetas/[etiqueta]` | Marcadores de una etiqueta                                     |
| `/u/[nombre]`           | Colección pública (ejemplo: `/u/demo`)                         |

**Limitación conocida:** con Cache Components, una etiqueta o un perfil inexistente muestra la página 404 pero responde `200` con `<meta name="robots" content="noindex">`, porque el estado HTTP ya se envió al empezar el streaming (ver `node_modules/next/dist/docs/01-app/02-guides/streaming.md`, sección *Status codes*).

## Configuración de IA

Ver [`ia/README.md`](ia/README.md) y las reglas del proyecto en [`AGENTS.md`](AGENTS.md).
