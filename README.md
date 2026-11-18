# 49 · Marcadores sociales con vista previa

Guarda enlaces con etiquetas y vista previa automática (título, descripción, imagen) y compártelos.

**Producción:** https://marcadores-sociales.vercel.app

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
La forma más rápida es el script `scripts/configurar-entorno.mjs` (ver *Configurar Firebase*), que llena `.env.local` sin mostrar ningún secreto.

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
├── proxy.ts        # redirige a /login sin cookie (comodidad, no seguridad)
├── hooks/          # useDebounce, useCargarMarcadores
├── schemas/        # esquemas Zod compartidos por cliente y servidor
├── services/       # reglas de negocio puras (filtrado, etiquetas)
├── repositories/   # acceso a Firestore (Hito 3)
└── lib/            # Firebase (cliente y admin), auth, cliente de la API, http, errores
tests/              # unit · components · api · integration
ia/                 # configuración de IA: evidencias, pruebas y bitácora
bruno/              # colección de solicitudes (Hito 3)
calidad/            # evidencias de calidad (ver CALIDAD.md)
scripts/            # configurar-entorno.mjs
```

## Estado por hito

- [x] **Hito 1:** lista de marcadores de ejemplo con tarjetas de vista previa, búsqueda y filtro por etiqueta; carga con `fetch` validada con Zod; estados de carga, vacío, error y reintento; configuración de IA.
- [x] **Hito 2:** rutas `/guardar`, `/etiquetas/[etiqueta]` y `/u/[nombre]`; formulario controlado validado con el esquema Zod compartido; normalización de URL, detección de duplicados y validación SSRF con pruebas. Los enlaces nuevos se guardan temporalmente en `localStorage` hasta el Hito 3.
- [x] **Hito 3:** API REST por capas (Route Handler → servicio → repositorio) con Firestore, sesión por cookie HttpOnly o Bearer, extracción Open Graph segura (SSRF, tiempo, tamaño y redirecciones), importar/exportar HTML de navegador, revisión de enlaces rotos con Vercel Cron, `openapi.yaml`, colección Bruno y pruebas de API e integración.
- [x] **Hito 4:** inicio de sesión y registro con Firebase Auth (cookie HttpOnly, el navegador no guarda tokens), `proxy.ts`, interfaz conectada a la API (cargar más, borrado optimista con `useOptimistic`, perfil público), colección pública leída de Firestore, cabeceras de seguridad (CSP, nosniff, Referrer-Policy, HSTS), evidencias de calidad en [`CALIDAD.md`](CALIDAD.md) y despliegue en Vercel con Firestore.

## Rutas

| Ruta                    | Contenido                                                      |
|-------------------------|----------------------------------------------------------------|
| `/login`                | Iniciar sesión o crear cuenta (correo y contraseña)            |
| `/`                     | Mis marcadores: búsqueda, filtro por etiqueta (`?q=&etiqueta=`) |
| `/guardar`              | Guardar un enlace                                              |
| `/etiquetas/[etiqueta]` | Marcadores de una etiqueta                                     |
| `/perfil`               | Elegir mi nombre público                                       |
| `/u/[nombre]`           | Colección pública (sin sesión)                                 |

`/`, `/guardar`, `/perfil` y `/etiquetas/*` piden sesión: `proxy.ts` redirige a `/login` si no hay cookie, y la API verifica la cookie en cada petición.

**Limitaciones conocidas:**

- La búsqueda de texto filtra en el navegador los marcadores ya cargados (100 por página, con «Cargar más»).
- El límite de frecuencia es en memoria (por instancia de Vercel); la protección fuerte es una regla del Firewall de Vercel.
- Con Cache Components, una etiqueta o un perfil inexistente muestra la página 404 pero responde `200` con `<meta name="robots" content="noindex">`, porque el estado HTTP ya se envió al empezar el streaming (ver `node_modules/next/dist/docs/01-app/02-guides/streaming.md`, sección *Status codes*).

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

1. En la consola de Firebase: **Authentication → Correo electrónico/contraseña** habilitado.
2. Cree Firestore y despliegue las reglas (niegan todo acceso directo) y los índices:

   ```bash
   npx firebase-tools login
   npx firebase-tools firestore:databases:create "(default)" --location=nam5 --project <id>
   npx firebase-tools deploy --only firestore --project <id>
   ```

3. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.** Guarde el JSON en la raíz como `firebase-adminsdk.json` (Git lo ignora) y ejecute:

   ```bash
   npx vercel link                                                    # una vez
   node scripts/configurar-entorno.mjs --cuenta firebase-adminsdk.json --vercel
   ```

   El script obtiene la configuración web con la CLI de Firebase, genera `CRON_SECRET`, escribe `.env.local` y sube las variables a Vercel (*production*) **sin imprimir ningún valor**. Después **borre el JSON**.

### Desplegar

Vercel está conectado al repositorio: cada `git push` a `main` despliega a producción. También se puede desplegar a mano con `npx vercel deploy --prod`. El cron diario (`vercel.json`) llama a `/api/cron/revisar-enlaces` con `Authorization: Bearer $CRON_SECRET`.

### Probar con Bruno

1. Abra la carpeta `bruno/` en [Bruno](https://www.usebruno.com/) y elija el entorno `local`.
2. En el entorno, complete las variables secretas `firebaseApiKey` (la `NEXT_PUBLIC_FIREBASE_API_KEY`), `correo`, `clave` (un usuario de prueba) y `cronSecret`. Bruno no las guarda en Git.
3. Ejecute primero **1 Autenticacion → Obtener idToken**; el resto de la colección usa ese token.

## Configuración de IA

Ver [`ia/README.md`](ia/README.md) y las reglas del proyecto en [`AGENTS.md`](AGENTS.md).
