# Bitácora del equipo

> **Horas en hora de Monterrey (UTC-6).** Las entradas del 2026-09-12 anteriores a esta
> nota se escribieron con la hora del servidor (UTC+2): réstales 8 h — ocurrieron la
> noche del viernes 11 (p. ej. "04:08" = vie 20:08). Desde aquí, todo en hora local.

Entradas con fecha y hora, las más recientes **arriba**. Se escribe conforme pasa,
no al final. La bitácora personal de cada quien está al lado (`<nombre>.md`, ver
`README.md`). Tres tipos de entrada:

- **decisión** — algo que se acordó y por qué (si es grande, también va a `decisiones/`)
- **hecho** — algo que quedó funcionando (o que se rompió)
- **idea** — algo que se pensó y no se hizo, para no perderlo

Esta bitácora es la fuente para el pitch: "esto lo decidimos a la hora 4 porque...".

---

## 2026-09-12

- **sáb 01:20 · hecho** — **El backend está completo y el agente ya es real.** 9 tools en
  el MCP (7 de lectura, 2 de acción) y el turno del agente con el Vercel AI SDK contra el
  MCP, emitiendo A2UI validado. 63 pruebas en verde sin llave ni red. El ciclo del reto
  —simular → aplicar → la lectura posterior devuelve otra cosa— está verificado por HTTP
  con `pnpm humo`. Detalle en `bitacora/parlack.md` y en
  `docs/como-funciona/{tools-mcp,agente}.md`.

- **sáb 01:20 · decisión** — **Entregar la interfaz es una tool del agente**
  (`pintar_pantalla`), no el texto de la respuesta del modelo. Así el reintento de un JSON
  inválido sale gratis (es un resultado de tool con errores y el bucle del AI SDK ya sabe
  qué hacer), el modelo usa un solo mecanismo para todo el turno, y A2UI tiene una sola
  puerta de salida, con cuatro validaciones antes de llegar al renderer. Los componentes
  viajan como texto JSON porque un schema estricto de props planas y distintas por
  componente no lo aceptan igual Gemini y Claude.

- **sáb 01:20 · decisión** — **La superficie se rearma completa en cada turno**
  (`createSurface` + lista entera + data model entero). `procesar()` fusiona componentes
  por id, así que un update parcial dejaría vivos los de la pantalla anterior. El contrato
  quedó corregido en ese punto: decía "reemplaza" y el renderer fusiona.

- **sáb 01:20 · hecho** — Bug que habría salido en la demo: `MCP_ESTADO` se resolvía
  contra el `cwd` del proceso, y el MCP arranca con `cwd` en `apps/mcp`. El estado se
  escribía en `apps/mcp/apps/mcp/estado.json`, así que **ninguna acción habría sobrevivido
  a un reinicio** y `reiniciar-estado` limpiaba otro archivo. Arreglado: se resuelve contra
  la raíz del repo.

- **sáb 01:20 · hecho** — Lo que ahora bloquea: **falta una llave de modelo en el `.env`**.
  Sin ella el agente sirve la pantalla de ejemplo (por diseño, para que `main` arranque sin
  `.env`) y no se puede correr el nivel 4 de `probar`. Y el agente solo puede pintar lo que
  exista en `packages/catalogo`: hoy `Confirmacion` + layout.

- **sáb 00:10 · hecho** — Guion literal de la demo escrito con los números reales de
  `db/datos/`: Beto al **96.7 %** de su tarjeta ($47,386 de $49,000, CAT 62.1 %, 12 días
  de atraso) y Ana sin deuda. Abre con "Maya hoy" (texto) y cierra con la misma pregunta
  dando dos pantallas distintas. Prompts en `docs/demo/prompts.txt`. Marcado qué falta
  para que corra: 7 componentes, 4 tools y el agente real.

- **vie 23:30 · decisión** — El agente se llama **Maya** (ADR 0009), no Brújula: es la
  asistente virtual real de Banorte (300+ consultas, **17 operaciones bancarias**, hoy
  en texto y menús). El encuadre es evolución, no crítica: "lo que le falta no es
  capacidad, es superficie". Paquetes `@maya/*`. Límites de marca: sin logotipo, sin
  tipografía corporativa, dominio que no imita, disclaimer en el README, y se confirma
  en el stand.

- **vie 23:25 · hecho** — `packages/a2ui/spec/`: spec A2UI v0.9.1 vendoreada del repo
  oficial (commit `1c45c809`): schemas de mensajes, catálogo básico con 18 componentes y
  **8 archivos de casos de conformidad** que serán los tests del renderer. Apache 2.0.

- **vie 23:10 · decisión** — Renderer A2UI **propio** (ADR 0008): `packages/a2ui` con los
  JSON Schema oficiales vendoreados para validar; sin `@a2ui/react` (Lit/shadow DOM
  rompería shadcn y la paleta) y sin spike. Plan de construcción en
  `arquitectura/renderer-a2ui.md`; corte sáb 02:00 = pinta `PlanDePago` desde un `.jsonl`
  y devuelve un `action`.

- **vie 22:55 · decisión** — Zona horaria única: Monterrey (UTC-6). El servidor está en
  UTC+2 y eso hizo creer que íbamos en la hora 11 del reto cuando vamos en la 3. Scripts
  con `TZ=America/Monterrey`; roadmap re-baseado a H3 con 33 h por delante: fase 1 a
  H14 (sáb 10:00), ensayo a H20, fase 3 a H28, congelación H30, entrega H36 (dom 08:00,
  por confirmar). Se trabaja la noche del viernes entera; dos ventanas de sueño de 4 h.

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

- **06:20 · decisión** — Modelo (ADR 0007): Gemini 3.8 Flash principal por costo
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

## sáb 13 · 07:45 — El scaffold está arriba y `main` arranca

`pnpm install && pnpm dev` levanta el MCP (3100) y la web (3000). `pnpm typecheck`,
`pnpm test` (19) y `pnpm humo` pasan. Los cinco paquetes se llaman `@maya/*`.

Lo que esto desbloquea, por rol:

- **`web`**: `apps/web` con shadcn inicializado (23 componentes) y los tokens de Banorte
  aplicados. El shell flotante (sidebar + lienzo bento + barra de conversación) ya está
  y funciona. Cada componente del catálogo tiene su carpeta con el encargo escrito:
  intención, props previstas, acciones y qué primitivas usar.
- **`mcp`**: `apps/mcp` con la capa de datos sobre los 22 CSV, el estado mutable con
  idempotencia y `consultar_perfil` como plantilla. Una tool nueva son tres archivos.
- **`contrato`**: `packages/a2ui` con reducer, bindings, árbol, registro, acciones y
  `<Superficie>`, **fiel al formato de la spec vendoreada** (props planas, raíz `root`,
  plantillas de hijos), 15 tests en verde. Falta ajv contra `spec/` y los 8 casos de
  conformidad. El agente es un mock con el stream ya conectado de punta a punta.
- **`demo`**: `README.md` con comandos reales y el disclaimer de prototipo no oficial.

Dos cosas que van a morder si no se leen: **los imports internos van sin extensión**
(Turbopack no mapea `.js`→`.ts`, y el typecheck no lo detecta) y **los tokens propios se
usan como `bg-lienzo`, no `bg-[--lienzo]`** (Tailwind v4; la skill ya está corregida).

## sáb 13 · 09:00 — Publicado, y de aquí en adelante se publica solo

Las dos apps están en el Coolify del VPS, en el proyecto `reto-banorte`:

- **web** → https://maya.157.173.204.174.sslip.io
- **MCP** → https://maya-mcp.157.173.204.174.sslip.io/mcp (health en `/health`)

`sslip.io` es provisional: resuelve a la IP del VPS sin comprar nada y no imita a
Banorte. Cuando haya `.tech`, se agrega en Coolify y se cambian dos variables del repo.

**Push a `main` = deploy.** GitHub Actions verifica (typecheck, tests, build, humo del
MCP, y que `catalogo.json` no esté desfasado de los schemas) y sólo si todo pasa le
avisa a Coolify. Al final manda un prompt del guion a la URL pública y exige mensajes
A2UI de vuelta: un deploy que arranca pero no contesta cuenta como fallido. Nadie
despliega a mano; si hace falta, `scripts/deploy.sh` desde el VPS hace lo mismo.

Tres cosas que conviene saber:

- El **MCP publicado no depende de Postgres**: lleva los CSV dentro de la imagen y
  arranca en origen `memoria`. Si la base se cae a mitad de la demo, el MCP sigue.
- El `/mcp` público **pide `Authorization: Bearer`**. El token está en `/opt/reto/.env`
  del VPS. Es el que hay que darle a un juez que quiera conectar su propio cliente MCP.
- La llave de Gemini **está vacía en producción**: el agente publicado responde con la
  pantalla de ejemplo hasta que alguien la ponga en las variables de `maya-web` en
  Coolify. La demo local no se ve afectada.
