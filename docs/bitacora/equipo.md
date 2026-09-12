# Bitácora del equipo

Entradas con fecha y hora, las más recientes **arriba**. Se escribe conforme pasa,
no al final. La bitácora personal de cada quien está al lado (`<nombre>.md`, ver
`README.md`). Tres tipos de entrada:

- **decisión** — algo que se acordó y por qué (si es grande, también va a `decisiones/`)
- **hecho** — algo que quedó funcionando (o que se rompió)
- **idea** — algo que se pensó y no se hizo, para no perderlo

Esta bitácora es la fuente para el pitch: "esto lo decidimos a la hora 4 porque...".

---

## 2026-09-12

- **07:30 · decisión** — Roadmap de las horas restantes en `docs/equipo/roadmap.md`,
  re-baseado a H11: cortes en H14 (A2UI), H16 (`dev.sh`), **H22 (fase 1)**, H26 (ensayo),
  H32 (congelación), H35 (último ensayo). Turnos de sueño: nunca `contrato` y `mcp` a la
  vez. Colisión de ADR resuelta: Postgres pasa a **0007**; el 0006 (JSON) queda
  reemplazado. `db/` entra al mapa del `CLAUDE.md`.

- **07:15 · decisión** — Identidad visual: forma flotante sobre lienzo gris `#F2F2F3`
  (sidebar y tarjetas `rounded-2xl` con `shadow-sm`, rejilla bento, barra de
  conversación fija abajo, una tarjeta héroe con degradado rojo por pantalla). Par de
  gráficas oscuro `#1C1719` + rojo. Las superficies del agente se pintan dentro de la
  rejilla, con transición de 150 ms. Todo en la skill `diseno-banorte`.

- **06:55 · decisión** — Toda la UI con **shadcn/ui** (regla 9 del `CLAUDE.md`) y la
  **paleta de Banorte** sacada de `Ghekkin/Open-innovation-hack-mty`: rojo `#EC0029`,
  claro `#FF3355`, oscuro `#C00020`, grises `#F5F5F5`/`#C7C9C9`/`#6A6867`. Skills
  oficiales de shadcn instaladas (`pnpm dlx skills add shadcn/ui` → `.agents/skills/`,
  enlazadas en `.claude/skills/`, versión fijada en `skills-lock.json`). Nueva skill
  `diseno-banorte` con tokens OKLCH listos para `globals.css` y el mapa de qué
  componente de shadcn usar para cada caso.

- **06:40 · decisión** — Contrato agente↔cliente escrito (`arquitectura/contrato-agente-cliente.md`):
  `POST /api/agente`, stream JSONL con líneas `a2ui`/`texto`/`razon`/`tool`/`error`,
  convención de acciones (mutación = nombre de tool, `ver_*`, `elegir_*`), selección
  de usuario por URL. ADR 0006: estado del MCP en JSON; TimescaleDB detrás de flag
  después de la hora 18.

- **06:20 · decisión** — Modelo (ADR 0005): Gemini 3.8 Flash principal por costo
  (~$40 el hack), latencia y premio; Claude Sonnet 5 cableado como respaldo con
  `MODELO=claude`. Opus descartado por precio. Facturación en Google desde la hora 1.

- **05:50 · decisión** — Caso de uso (ADR 0004): los tres primeros candidatos como un
  solo viaje —reestructura de tarjeta, gasto por categoría, meta de ahorro— en orden
  estricto (fase 1 completa a la hora 10, 2 a la 18, 3 a la 24, congelación 30). Dos
  usuarios demo; 8 componentes compartidos; 2 tools de acción. Ana obtiene el caso 3
  como respuesta adaptativa a la misma pregunta de Beto.

- **05:25 · decisión** — El producto vive en el VPS del equipo, administrado con
  Coolify (proyecto `reto-banorte`), no en una VM nueva de Vultr por ahora. Ya está
  arriba un Postgres 17 con TimescaleDB, público en `157.173.204.174:5437` para que
  cualquiera cargue datos desde su máquina; el password está en el panel de Coolify y
  en `/opt/reto/.env` del servidor. Detalle y pendientes en
  `docs/arquitectura/deploy.md`. Vultr queda como premio lateral, no como ruta crítica.

- **05:30 · hecho** — `docs/reto/casos-de-uso.md`: cinco candidatos puntuados contra
  la rúbrica con flujo, componentes y tools; recomendación: reestructura de tarjeta
  como flujo principal + gasto por categoría como segunda intención, adaptabilidad con
  dos usuarios. Insumo del ADR 0004, no decisión.

- **05:10 · hecho** — Video de explicación transcrito (`docs/reto/transcripcion-video.md`).
  Novedades: registro de equipos y mentores en el stand de Banorte; el jurado preguntará
  por qué el stack y la arquitectura. Sin fechas límite ni créditos en el video.

- **04:45 · decisión** — Con la presentación oficial en mano: el reto exige LLM + MCP +
  **A2UI** y un flujo accionable con cambio real. Adoptamos A2UI v0.9.1 con catálogo
  propio y `@a2ui/react` (ADR 0003); el campo `tipo` se vuelve el `component` del
  catálogo. Nuevo `packages/catalogo`. Rúbrica y entregables en
  `docs/reto/rubrica-y-entregables.md`; trade-offs en `docs/arquitectura/trade-offs.md`;
  `README.md` raíz como entregable 02. Skills `ui-generativa`, `agente-host`,
  `tool-mcp`, `cambiar-schema`, `elegir-caso-de-uso`, `scaffold`, `probar`,
  `checklist-demo`, `pitch` y `datos-mock` reescritas o ajustadas. Roles: `web` es
  dueño del catálogo; `contrato` del agente y la capa A2UI.

- **04:08 · hecho** — Primer commit y push del repo, ya pasada la hora de arranque. Sube
  la base completa: `CLAUDE.md`, 19 documentos, 19 skills y los 3 scripts de sesión.
  `CLAUDE.md` deja de anunciar la regla de las 20:00 y la registra como hecho.

## 2026-09-11

- **09:30 · hecho** — Diez skills nuevas para el ciclo completo: `elegir-caso-de-uso`,
  `scaffold`, `datos-mock`, `agente-host`, `cambiar-schema`, `probar`,
  `resolver-conflicto`, `premio-lateral`, `desplegar`, `pitch`. `CLAUDE.md` gana
  "Convenciones de desarrollo" y la definición de hecho. El conector de Yolani queda
  fuera de este repo (`disableClaudeAiConnectors`).

- **08:40 · decisión** — El primer commit sale hoy a las **20:00**, no antes. Un commit
  local hecho a las 08:24 se deshizo con `git reset --soft` (archivos intactos) para que
  el historial empiece a la hora del reto. `.claude/settings.json` se copia a las 20:00.
- **08:35 · hecho** — `gh auth setup-git` conecta `gh` como credencial de `git`; sin
  eso, `fetch`/`push` por HTTPS fallaban con "could not read Username". Los scripts ya
  distinguen ese caso de "sin red".

- **00:30 · decisión** — Cuatro roles (`web`, `mcp`, `contrato`, `demo`) como
  responsabilidad, no territorio: cualquiera toca cualquier archivo con las reglas de
  `docs/equipo/roles.md`. Tablero con una fila por rol; bitácora personal por persona.
- **00:30 · decisión** — Commit y push automáticos al final de cada turno (hook
  `Stop` → `scripts/sync.sh --auto`), con prefijo `[nombre/rol]`. Reemplaza la regla
  de "sin push sin pedir". `main` siempre arranca; la etiqueta `estable` marca la
  última demo verificada.
- **00:30 · hecho** — Ritual de sesión: hook `SessionStart` hace pull y muestra el
  tablero; skill `inicio` pregunta nombre y rol; skill `cerrar` deja todo escrito y
  sube. Premios laterales analizados en `docs/reto/premios-objetivo.md`.

## 2026-09-10

- **23:05 · decisión** — Todo issue se registra en dos lugares y en el mismo momento:
  archivo en `docs/issues/` y `gh issue create` en `Ghekkin/Reto-Banorte-hack-mty`.
  Crear issues en GitHub queda autorizado de forma permanente; `git push` sigue
  requiriendo que el usuario lo pida.

- **22:40 · decisión** — Stack todo en TypeScript (ADR 0001). Python solo detrás de
  una tool con mock en TS (ADR 0002).
- **22:40 · decisión** — Reglas del repo: documentación en dos niveles, issues
  obligatorios, algoritmos explicados, `main` siempre demostrable, sin push sin pedir.
- **22:40 · hecho** — Creados `CLAUDE.md`, estructura de `docs/` y skills del repo.
  Sin código todavía; el reto empieza mañana y faltan los detalles oficiales.
