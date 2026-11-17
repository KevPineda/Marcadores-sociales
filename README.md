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
- [x] **Hito 3:** API REST por capas (Route Handler → servicio → repositorio) con Firestore, sesión por cookie HttpOnly o Bearer, extracción Open Graph segura (SSRF, tiempo, tamaño y redirecciones), importar/exportar HTML de navegador, revisión de enlaces rotos con Vercel Cron, `openapi.yaml`, colección Bruno y pruebas de API e integración.
- [ ] **Hito 4:** Firebase Auth, seguridad, evidencias de calidad y despliegue en Vercel.

## Rutas

| Ruta                    | Contenido                                                      |
|-------------------------|----------------------------------------------------------------|
| `/`                     | Mis marcadores: búsqueda, filtro por etiqueta (`?q=&etiqueta=`) |
| `/guardar`              | Guardar un enlace                                              |
| `/etiquetas/[etiqueta]` | Marcadores de una etiqueta                                     |
| `/u/[nombre]`           | Colección pública (ejemplo: `/u/demo`)                         |

**Limitaciones conocidas:**

- La interfaz aún usa los datos de ejemplo y `localStorage`; se conecta a la API con el inicio de sesión (Hito 4).
- El límite de frecuencia es en memoria (por instancia de Vercel); la protección fuerte es una regla del Firewall de Vercel.
- con Cache Components, una etiqueta o un perfil inexistente muestra la página 404 pero responde `200` con `<meta name="robots" content="noindex">`, porque el estado HTTP ya se envió al empezar el streaming (ver `node_modules/next/dist/docs/01-app/02-guides/streaming.md`, sección *Status codes*).

## API REST

Documentación completa en [`openapi.yaml`](openapi.yaml) (ábrala en https://editor.swagger.io o con la extensión *OpenAPI* de VS Code).

| Método y ruta                         | Qué hace                                   | Sesión |
|---------------------------------------|--------------------------------------------|--------|
| `POST /api/auth/sesion`               | Crea la cookie de sesión desde un idToken  | —      |
| `DELETE /api/auth/sesion`             | Cierra la sesión                           | —      |
| `GET /api/auth/yo`                    | Usuario actual                             | Sí     |
| `GET /api/marcadores`                 | Mis marcadores (`?limite=&cursor=&etiqueta=`) | Sí  |
| `POST /api/marcadores`                | Guarda un enlace con vista previa          | Sí     |
| `GET/PATCH/DELETE /api/marcadores/:id`| Ver, editar o borrar uno propio            | Sí     |
| `GET /api/marcadores/exportar`        | Descarga HTML de navegador                 | Sí     |
| `POST /api/marcadores/importar`       | Importa HTML de navegador (multipart)      | Sí     |
| `GET/POST /api/perfil`                | Mi nombre público / elegir uno             | Sí     |
| `GET /api/u/:nombre/marcadores`       | Colección pública                          | No     |
| `GET /api/cron/revisar-enlaces`       | Revisa enlaces rotos (Vercel Cron)         | `CRON_SECRET` |

### Configurar Firebase

1. En la consola de Firebase: **Authentication → Email/Password** habilitado y **Firestore** en modo producción.
2. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.** Copie `project_id`, `client_email` y `private_key` a `.env.local` y **borre el JSON descargado** (nunca lo guarde en el proyecto).
3. Despliegue las reglas (niegan todo) y los índices:

   ```bash
   npx firebase-tools login
   npx firebase-tools use --add          # elija su proyecto
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

### Probar con Bruno

1. Abra la carpeta `bruno/` en [Bruno](https://www.usebruno.com/) y elija el entorno `local`.
2. En el entorno, complete las variables secretas `firebaseApiKey` (la `NEXT_PUBLIC_FIREBASE_API_KEY`), `correo`, `clave` (un usuario de prueba) y `cronSecret`. Bruno no las guarda en Git.
3. Ejecute primero **1 Autenticacion → Obtener idToken**; el resto de la colección usa ese token.

## Configuración de IA

Ver [`ia/README.md`](ia/README.md) y las reglas del proyecto en [`AGENTS.md`](AGENTS.md).
