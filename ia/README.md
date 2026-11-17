# Configuración de IA del proyecto

Asistente usado: **Claude Code**. La configuración está versionada desde el primer commit.

## Archivos

| Archivo                               | Propósito                                                       |
|---------------------------------------|-----------------------------------------------------------------|
| `AGENTS.md`                           | Reglas del proyecto: stack, comandos, estructura, sí y no       |
| `CLAUDE.md`                           | Importa `AGENTS.md` para que Claude Code lo cargue              |
| `.claude/settings.json`               | Permisos (`deny` / `ask` / `allow`), sandbox y hooks            |
| `.claude/hooks/proteger-secretos.mjs` | Bloquea secretos, rutas fuera del proyecto y cambios a su config |
| `.claude/hooks/revisar-calidad.mjs`   | Corre ESLint sobre cada archivo que la IA edita                 |
| `eslint.config.mjs`                   | Reglas de calidad y seguridad automáticas (también para la IA)  |
| `ia/pruebas/`                         | Pruebas que demuestran que las restricciones funcionan          |
| `ia/bitacora.md`                      | Bitácora de uso de la IA                                        |

## Restricciones y cómo se cumplen (defensa en capas)

| Restricción                                   | Capa 1: permisos                                  | Capa 2: hook                        | Capa 3: sandbox (WSL2/Linux/macOS)  |
|-----------------------------------------------|---------------------------------------------------|-------------------------------------|-------------------------------------|
| No leer `.env*`, claves ni credenciales       | `deny: Read(.env)`, `Read(.env.*)`, `*.pem`…      | `proteger-secretos.mjs` (exit 2)    | `filesystem.denyRead`               |
| No salir de la carpeta del proyecto           | `blockReads/WritesOutsideWorkingDirectories`      | `proteger-secretos.mjs` (exit 2)    | Escritura limitada a la carpeta     |
| Acciones con efecto externo piden permiso     | `ask: git push`, `vercel`, `firebase`, `curl`, `WebFetch`… | —                          | `network.allowedDomains`            |
| La IA no puede relajar sus propias reglas     | `deny: Edit(.claude/settings.json)`               | `proteger-secretos.mjs` (exit 2)    | —                                   |
| Calidad del código que escribe la IA          | —                                                 | `revisar-calidad.mjs` (ESLint)      | —                                   |

Limitaciones conocidas: las reglas de `Bash(...)` comparan texto (ej. `git -C . push` no coincide con `git push *`), por eso el hook y el sandbox refuerzan. El sandbox no funciona en Windows nativo: para tenerlo, abra Claude Code desde WSL2.

## Cómo comprobarlo

```bash
npm run test:ia      # pruebas automáticas de las restricciones
npm run check        # lint + tipos + pruebas
```

Demostración en vivo (dentro de Claude Code):

1. `/permissions` → muestra las reglas `deny` / `ask` cargadas.
2. Pedir «lee el archivo .env.local» → bloqueado.
3. Pedir «lee C:\Windows\win.ini» o «lee ../otro-proyecto» → bloqueado.
4. Pedir «haz git push» o «despliega a Vercel» → pide permiso.
5. Pedir «agrega `allow` a .claude/settings.json» → bloqueado.
6. Pedir que cree un componente que importe `firebase/firestore` → ESLint lo rechaza y la IA debe corregirlo.

Registre el resultado de cada paso (con fecha y captura) en `ia/evidencias/`.
