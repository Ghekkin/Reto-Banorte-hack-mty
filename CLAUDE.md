# Reto Banorte — Hack Monterrey 2026 — guía del repositorio para agentes

Proyecto de 36 horas (arrancó 2026-09-11 20:00). Reto oficial: **"Interfaces que la IA
construye en tiempo real"**: que el modelo no solo conteste, sino que arme la pantalla
que resuelve el problema financiero de quien pregunta. Tres piezas no negociables:
**LLM** al centro, **MCP** para datos y acciones, **A2UI** para transmitir la interfaz.
El ciclo se cierra: lo que la persona toca regresa al agente y cambia la experiencia.
Caso de uso libre dentro de servicios financieros; al menos **un flujo accionable con
cambio real**; componentes y datos **propios**. Todo en `docs/reto/contexto-del-reto.md`
y la rúbrica en `docs/reto/rubrica-y-entregables.md`.

Somos cuatro personas trabajando a la vez sobre `main`, desde donde sea. Todo lo que
alguien necesita para retomar el trabajo está en el repo: `docs/tablero.md` dice quién
está en qué, `docs/bitacora/` dice dónde se quedó cada quien. Lee `docs/README.md`
antes de tocar nada.

## Arranque

El primer commit del repo salió el **viernes 2026-09-11 a las 22:08, hora de
Monterrey**, después de la hora de arranque del reto (20:00). Todo lo anterior se
preparó sin commitear a propósito; por eso el historial empieza con la base completa
en un solo commit.

**Zona horaria: todas las horas del repo son de Monterrey (UTC-6).** El servidor donde
corren las sesiones está en UTC+2; los scripts fuerzan `TZ=America/Monterrey`. Cuando
escribas una hora a mano en un doc o en la bitácora, usa la de Monterrey. El plan hora
por hora está en `docs/equipo/roadmap.md`.

## Al abrir una sesión

El hook `SessionStart` hace `git pull` y muestra el tablero. Si dice que no hay
identidad, **invoca la skill `inicio` antes de cualquier tarea**: pregunta nombre y rol,
los guarda en `.sesion` (ignorado por git) y actualiza tu fila del tablero. Sin eso, los
commits no dicen quién los hizo. Al irte, skill `cerrar`.

## Reglas que no se negocian

1. **Todo se documenta, y en dos niveles.** Cada feature, flujo o algoritmo tiene un
   documento en `docs/` con una parte en lenguaje natural que entienda cualquiera
   (un juez, un compañero que llega a las 3 am) y una parte técnica con archivos,
   funciones y schemas. Ver `docs/como-funciona/README.md`. Un cambio que deja un doc
   mintiendo es un cambio incompleto.
2. **Un bug encontrado nunca se ignora, y siempre va a GitHub.** Si te topas con un
   fallo que no es parte de tu tarea, lo registras en `docs/issues/` (formato en
   `docs/issues/index.md`) **y en el mismo momento lo subes con `gh issue create`** al
   repo `Ghekkin/Reto-Banorte-hack-mty`. El número que devuelve GitHub va al
   frontmatter `github:` del archivo. Un issue sin número en GitHub está a medias. No
   lo arreglas de paso sin registrarlo, no lo callas. Aplica también a bugs propios
   que decides no arreglar ahora. Autorización permanente: no se pregunta antes de
   crear el issue.
3. **Todo algoritmo se explica.** Si escribes lógica no trivial (scoring, ranking,
   reglas de negocio, heurísticas de layout, parsing), va un doc en `docs/algoritmos/`
   con la idea en palabras, los pasos, entradas/salidas, límites y dónde vive en el
   código. Ver plantilla ahí.
4. **`main` siempre arranca.** Se trabaja en `main`, sin ramas. Lo que está a medias
   va detrás de un mock, un flag o un campo opcional **antes** de terminar el turno,
   porque al terminar el turno se sube solo. La etiqueta `estable` marca el último
   commit con la demo verificada (`scripts/marcar-estable.sh`); si `main` se rompe,
   la demo se presenta desde `git checkout estable`.
5. **Commit y push son automáticos.** El hook `Stop` corre `scripts/sync.sh --auto`
   al final de cada turno: commit de lo pendiente con prefijo `[nombre/rol]`, pull
   con rebase, push. Para un commit con nombre propio, skill `guardar`. Nunca
   `--force` sobre `main`. Los commits que resuelven un issue llevan `Fixes #N`.
6. **Sin acentos en nombres de archivo**; kebab-case, en español.
7. **Las bitácoras se escriben conforme pasa.** `docs/bitacora/equipo.md` para
   decisiones e ideas del equipo; `docs/bitacora/<nombre>.md` para el hilo de cada
   quien: qué tomó, qué dejó a medias, qué tocó de otro dominio. Entradas con hora.
   Ver `docs/bitacora/README.md`.
8. **Cada quien toca solo su fila del tablero** (`docs/tablero.md`). Es lo que evita
   conflictos con cuatro personas editando a la vez.
9. **Toda la UI se construye con shadcn/ui y la paleta de Banorte.** Ningún componente
   a mano, ninguna otra librería, ningún hex suelto en un `.tsx`: se agrega con
   `npx shadcn@latest add` y se colorea con los tokens. Antes de escribir CSS o
   cualquier pantalla, invoca **`diseno-banorte`**; para agregar o depurar componentes,
   la skill **`shadcn`** (instalada desde el registro oficial).

## Roles (detalle en `docs/equipo/roles.md`)

| Rol | Dueño de |
|---|---|
| `web` | `packages/catalogo/` (los componentes A2UI propios) y la cara visible de `apps/web` |
| `mcp` | `apps/mcp/` y datos sintéticos: tools de lectura y de acción, estado mutable |
| `contrato` | El agente (`apps/web/src/lib/agente/`), la capa A2UI (renderer, `catalogo.json`), `packages/schemas/`; arbitra cuando front y back se cruzan |
| `demo` | Guion, pitch, `README.md`, doc técnica (arquitectura y trade-offs), deploy, issues, premios laterales |

Un rol es responsabilidad, no territorio: **cualquiera toca cualquier archivo**. Si es
dominio ajeno: pull antes, cambio chico, commit separado con el dominio en el mensaje,
línea en tu bitácora. Un cambio de schema no está terminado hasta que el mock de la
tool y el componente cambiaron también, en el mismo commit; si no puedes terminarlo,
el campo nuevo es opcional.

## Decisiones de arquitectura (resumen; detalle en `docs/decisiones/`)

- **Todo en TypeScript**: Next.js para el host de la UI generativa, servidor MCP en TS
  con `@modelcontextprotocol/sdk`, schemas compartidos con Zod. ADR 0001.
- **A2UI real (v0.9.1) con catálogo propio y renderer propio** (`packages/a2ui`, ~200
  líneas, validado con los JSON Schema oficiales): el agente emite
  `createSurface`/`updateComponents`/`updateDataModel` restringido a nuestro catálogo y
  recibe los `action` de la UI. Sin `@a2ui/react`. ADR 0003 + 0008.
- **Python solo detrás de una tool, nunca en el contrato tool → UI.** Si hace falta ML
  pesado, va en un FastAPI mínimo que llama una tool MCP, con mock/fallback en TS.
  Ningún flujo de la demo puede tener a Python como única ruta. ADR 0002.
- **Contrato primero, mock primero.** Cada tool MCP nace con su schema Zod y una
  implementación mock con datos plausibles. La UI y el agente se desarrollan contra el
  mock; el "real" se conecta después si hay tiempo.
- **Premios laterales nunca en la ruta crítica de la demo.** `docs/reto/premios-objetivo.md`.

## Mapa del repositorio (se actualiza conforme se construya)

| Ruta | Qué es | Estado |
|---|---|---|
| `README.md` | Entregable 02: qué es y cómo se corre (comandos reales cuando exista el scaffold) | existe |
| `docs/` | Toda la documentación. Índice en `docs/README.md` | existe |
| `docs/reto/` | Contexto oficial, rúbrica y entregables, premios, transcripción del video | existe |
| `docs/tablero.md` | Quién está en qué, bloqueos, siguiente | existe |
| `docs/equipo/roadmap.md` | El plan hora por hora y rol por rol; manda sobre las horas del ADR 0004 | existe |
| `docs/bitacora/` | Bitácora de equipo y una por persona | existe |
| `db/` | Datos sintéticos: 22 CSV (fuente), `schema.sql`, `cargar.sql`, `reiniciar.sql` (ADR 0007) | existe |
| `scripts/` | `sesion-inicio.sh` (hook de inicio), `sync.sh` (commit+pull+push), `marcar-estable.sh` | existe |
| `.env.example` | Todas las variables de entorno con comentario; hoy solo `DATABASE_URL` (Postgres en Coolify) | existe |
| `.claude/settings.json` | Hooks `SessionStart` y `Stop`, permisos para git/gh/scripts | existe |
| `.claude/skills/` | Skills del repo (tabla abajo) | existe |
| `.agents/skills/` | Skills oficiales de shadcn/ui instaladas con `pnpm dlx skills add shadcn/ui`; enlazadas desde `.claude/skills/`. `skills-lock.json` fija la versión | existe |
| `apps/web/` | Host Next.js: chat con el agente y render de interfaces generadas | pendiente |
| `apps/mcp/` | Servidor MCP en TS (Streamable HTTP), tools del dominio financiero | pendiente |
| `packages/a2ui/` | Renderer A2UI propio: reducer, bindings, árbol, registro, validación con los schemas oficiales (ADR 0008) | pendiente |
| `packages/catalogo/` | Catálogo A2UI propio: schema + componente React + `.jsonl` de ejemplo por componente | pendiente |
| `packages/schemas/` | Schemas Zod de las tools MCP | pendiente |
| `services/ml/` | (opcional) FastAPI mínimo si hay ML pesado | no existe, ver ADR 0002 |

Cuando crees una carpeta nueva, agrégala aquí en el mismo commit.

## Comandos habituales

```bash
scripts/sync.sh "mensaje"      # commit con nombre + pull --rebase + push (lo automático usa --auto)
scripts/marcar-estable.sh      # tras un ensayo de demo que pasó completo
gh issue create --repo Ghekkin/Reto-Banorte-hack-mty ...   # ver docs/issues/index.md
```

Pendiente hasta que exista el scaffold: `pnpm dev`, `pnpm typecheck`, `pnpm test` y el
script único que levanta todo para la demo.

## Referencia externa: Yolani

En `/root/yolani/` hay un monorepo TS en producción con el mismo stack (Express + TS,
Next.js, dos servidores MCP con `@modelcontextprotocol/sdk`, Vercel AI SDK,
`@elevenlabs/client`). Sirve como referencia de patrones, **no se copia código de
negocio**. Lo útil:

- `mcp-tenant/src/server.ts` — servidor MCP Streamable HTTP stateless con Express.
- `mcp-tenant/src/lib/mcp-sink.ts` — cómo se registra una tool con `registerTool`,
  anotaciones (`readOnlyHint`, etc.) y log por llamada.
- `mcp-tenant/src/__tests__/` — tests con vitest de un servidor MCP.
- `docs-internal/docs/empezar-aqui/como-documentar.md` — de ahí salen nuestras reglas.

## Convenciones de desarrollo

- **Los tres pasos del reto son el criterio de "completo"**: interpretar la intención,
  generar la interfaz, ejecutar la acción y que la UI cambie con el resultado. Una
  feature sin el tercer paso es media feature.
- **Dominio en español, siempre.** Tools, schemas, componentes, campos y datos usan las
  palabras del negocio en español (`cuenta`, `movimiento`, `saldo`), nunca mezclado con
  inglés (`account`). Utilidades genéricas de código pueden ir en inglés.
- **Puertos fijos**: web 3000, mcp 3100, ml 8000. Cambiarlos toca `scripts/dev.sh`,
  `.env.example` y la skill `scaffold`.
- **`.env.example` siempre completo.** Toda variable nueva entra ahí, con comentario, en
  el mismo commit que la usa. Las llaves viven solo en `.env`.
- **Flags para lo opcional**: `FEATURE_*` en `.env`. Con el flag apagado, la demo es
  idéntica a antes. Aplica a premios laterales y a Python.
- **Mensajes de commit** con el dominio al frente cuando toques algo ajeno o el
  contrato: `contrato: ...`, `mcp: ...`, `web: ...`, `premio: ...`, `docs: ...`.
- **45 minutos atorado es el máximo.** Después: pregunta al dueño, rodea con un mock, y
  issue. Nadie se queda dos horas solo a las 3 am.
- **Sin refactors de código ajeno** y sin refactors de nada después de la hora 30.
- **"Hecho" tiene definición** (skill `probar`): typecheck en verde, tests de la tool,
  humo del MCP y los prompts del guion produciendo la interfaz esperada. Un doc solo se
  marca `construido` cuando los cuatro pasan.

## Skills disponibles

Coordinación:

| Skill | Cuándo invocarla |
|---|---|
| `inicio` | Al abrir la sesión: nombre, rol, tablero, bitácora. Antes de cualquier tarea |
| `contexto-reto` | Carga el contexto del reto y las reglas (la invoca `inicio`) |
| `guardar` | Terminaste algo con nombre y quieres subirlo ya, con mensaje real |
| `cerrar` | Te vas o cambias de rol: deja escrito dónde te quedaste y sincroniza |
| `registrar-issue` | Encontraste un bug: archivo en `docs/issues/` + `gh issue create`, siempre los dos |
| `documentar` | Terminaste un cambio: "¿qué doc quedó mintiendo?" |
| `resolver-conflicto` | `sync.sh` reportó CONFLICTO |

Construcción:

| Skill | Cuándo invocarla |
|---|---|
| `elegir-caso-de-uso` | Día 1, en cuanto den detalles: decisión en 45 min y reparto |
| `scaffold` | Crear el monorepo o agregar una app/paquete |
| `datos-mock` | Crear o tocar datos en `apps/mcp/data` |
| `tool-mcp` | Crear o modificar una tool del servidor MCP |
| `cambiar-schema` | Tocar `packages/schemas`: el cambio completo en un commit |
| `diseno-banorte` | **Antes de escribir CSS, un componente o una pantalla**: shadcn obligatorio + tokens de Banorte |
| `shadcn` | Agregar, buscar, depurar o componer componentes de shadcn/ui (oficial) |
| `ui-generativa` | Crear o modificar un componente del catálogo A2UI (encima de shadcn) |
| `agente-host` | Tocar el agente, su prompt o la conexión al MCP |
| `probar` | Antes de decir que algo está hecho |

Demo y extras:

| Skill | Cuándo invocarla |
|---|---|
| `premio-lateral` | Antes de integrar Vultr, .Tech, Tiger Data, ElevenLabs o Gemini |
| `desplegar` | Publicar o redesplegar (rol `demo`, desde `estable`) |
| `checklist-demo` | Antes de cada ensayo y del pitch; si pasa, marca `estable` |
| `pitch` | Desde la hora 24: guion hablado, preguntas de jueces, ensayos |
