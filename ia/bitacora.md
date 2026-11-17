# Bitácora de IA

Una entrada por cada uso relevante de la IA. **Decisión** = qué se aceptó, qué se cambió y qué se descartó.

| Fecha      | Propósito                                         | Evidencia                                   | Validación                                         | Decisión                                                    |
|------------|---------------------------------------------------|---------------------------------------------|----------------------------------------------------|-------------------------------------------------------------|
| 2026-11-17 | Crear esqueleto Next.js y configuración de IA     | `AGENTS.md`, `.claude/`, `ia/pruebas/`      | `npm run check`: lint, tipos y 23 pruebas en verde | Aceptado; revisar y ajustar las reglas de `AGENTS.md`       |
| 2026-11-17 | Hito 1: lista con tarjetas, búsqueda, filtro por etiqueta y estados de interfaz | `src/components/ListaMarcadores.tsx`, `tests/` | `npm run check` (51 pruebas) y `npm run build` en verde; HTML revisado (`lang`, un `<h1>`, salto al contenido) | Aceptado; corregido a mano: limpieza de Testing Library entre pruebas y título de la página |
| 2026-11-17 | Hito 2: rutas, formulario de guardar, normalización de URL, duplicados y SSRF | `src/services/url.ts`, `src/components/FormularioGuardar.tsx`, `tests/unit/url.test.ts` | `npm run check` (109 pruebas) y `npm run build` en verde; rutas revisadas con el servidor de producción | Aceptado; corregido: limpieza de `localStorage` rompía las pruebas de `ia/` (entorno node) y `typecheck` necesitaba `next typegen` |
