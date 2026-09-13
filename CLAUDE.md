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
   con rebase, push. Para un commit con nombre propio, skill `guardar`. Si haces un
   commit manual, hazlo **siempre por rutas explícitas** (`git commit -- <rutas>`):
   el índice `.git/index` es compartido entre sesiones y un `git commit` a secas
   puede llevarse trabajo a medias de otro compañero. Nunca `--force` sobre `main`.
   Los commits que resuelven un issue llevan `Fixes #N`.
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
- **A2UI real (v0.9.1) con catálogo propio y motor propio** (`packages/a2ui`, ~850
  líneas, validado con los JSON Schema oficiales y sus 76 casos de conformidad): el agente emite
  `createSurface`/`updateComponents`/`updateDataModel` restringido a nuestro catálogo y
  recibe los `action` de la UI. Sin `@a2ui/react`. ADR 0003 + 0008.
- **Python solo detrás de una tool, nunca en el contrato tool → UI.** Si hace falta ML
  pesado, va en un FastAPI mínimo que llama una tool MCP, con mock/fallback en TS.
  Ningún flujo de la demo puede tener a Python como única ruta. ADR 0002.
- **Los datos salen de PostgreSQL y de ningún otro lado** (ADR 0010). No hay CSV ni
  fallback: sin `DATABASE_URL` el MCP no arranca, a propósito. El estado que las
  acciones mutan vive en `banorte.acciones_aplicadas`, con índice único sobre
  `idempotency_key`. Las pruebas usan un volcado y no tocan la base.
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
| `db/` | `schema.sql`, `reiniciar.sql` y `migraciones/`. **Los datos viven en PostgreSQL, no en el repo** (ADR 0010) | existe |
| `scripts/` | `dev.sh` (levanta web+mcp), `humo.sh`, `deploy.sh`, `migrar.mjs`, `volcar-fixture.mjs`, `restaurar.mjs`, `sesion-inicio.sh`, `sync.sh`, `marcar-estable.sh` | existe |
| `.env.example` | Todas las variables de entorno con comentario. El scaffold arranca sin llenar ninguna | existe |
| `.github/workflows/` | `ci-y-deploy.yml`: verifica todo push y despliega `main` en Coolify | existe |
| `apps/*/Dockerfile` | Imágenes de web y mcp; se construyen desde la raíz del repo | existe |
| `.claude/settings.json` | Hooks `SessionStart` y `Stop`, permisos para git/gh/scripts | existe |
| `.claude/skills/` | Skills del repo (tabla abajo) | existe |
| `.agents/skills/` | Skills oficiales de shadcn/ui instaladas con `pnpm dlx skills add shadcn/ui`; enlazadas desde `.claude/skills/`. `skills-lock.json` fija la versión | existe |
| `apps/web/` (`@maya/web`) | Host Next.js 16 + Tailwind v4 + shadcn: shell, `/api/agente` (stream JSONL), **6 rutas `/api/*` de lectura para consumidores externos** (`docs/como-funciona/api-rest-lectura.md`), `/catalogo/v1.json`, `src/lib/agente/` (agente real con el AI SDK y **las tres salidas del turno**: `pintar_pantalla`, `ajustar_pantalla`, `responder`; `docs/como-funciona/ciclo-live.md`), `src/lib/inicio/` (**la portada que arma un modelo chico**, con reloj en `instrumentation.ts`; `docs/como-funciona/inicio-personalizado.md`) | construido; 155 pruebas |
| `apps/mcp/` (`@maya/mcp`) | Servidor MCP Streamable HTTP: `/health`, `/mcp`, capa de datos sobre PostgreSQL (esquema `banorte`), estado mutable en `acciones_aplicadas` | **18 tools** (14 lectura + 4 acción), 103 pruebas |
| `packages/a2ui/` (`@maya/a2ui`) | Motor A2UI propio: `validar`, `esquema` (ajv sobre los schemas oficiales), `procesar`, `bindings`, `arbol`, `registro`, `<Superficie>`, layout (ADR 0008) | **construido**: 112 pruebas, incluidos los casos de conformidad oficiales de `spec/` |
| `packages/catalogo/` (`@maya/catalogo`) | Catálogo A2UI propio; `catalogo.json` se genera desde los schemas Zod | **21 componentes propios** + 4 de layout, 124 pruebas |
| `packages/schemas/` (`@maya/schemas`) | Schemas Zod de las tools MCP | **15 de 15** |
| `services/ml/` | (opcional) FastAPI mínimo si hay ML pesado | no existe, ver ADR 0002 |

Cuando crees una carpeta nueva, agrégala aquí en el mismo commit.

## Comandos habituales

```bash
pnpm install                   # una vez; Node 22 y pnpm 10
pnpm dev                       # levanta mcp (3100) y web (3000) y espera sus /health
pnpm typecheck                 # tsc en los 5 paquetes
pnpm test                      # vitest en los 5 paquetes
pnpm humo                      # prueba de humo del MCP (necesita `pnpm dev` corriendo)
pnpm probar-guion              # ensaya los 9 pasos del guion con el MODELO REAL (necesita llave y `pnpm dev`)
pnpm probar-inicio             # rearma las 3 portadas de Inicio con el modelo chico real y las revisa
pnpm catalogo                  # regenera packages/catalogo/catalogo.json desde los schemas
pnpm reiniciar-estado          # vacia banorte.acciones_aplicadas: ANTES de cada ensayo
pnpm datos:migrar              # aplica db/migraciones/*.sql (idempotente)
pnpm datos:fixture             # regenera el volcado que usan las pruebas, desde la base
pnpm datos:restaurar           # repuebla la base desde el volcado (--recrear la vacia antes)

scripts/deploy.sh              # dispara el deploy en Coolify y espera los /health
scripts/sync.sh "mensaje"      # commit con nombre + pull --rebase + push (lo automático usa --auto)
scripts/marcar-estable.sh      # tras un ensayo de demo que pasó completo
gh issue create --repo Ghekkin/Reto-Banorte-hack-mty ...   # ver docs/issues/index.md
```

**El producto se llama Maya**: los paquetes son `@maya/web`, `@maya/mcp`, `@maya/a2ui`,
`@maya/catalogo`, `@maya/schemas`. Es un prototipo de hackathon sobre el concepto del
asistente Maya de Banorte, **no oficial ni afiliado**; el `README.md` lo dice y el
dominio no imita a la marca.

**Los imports internos de un paquete no llevan extensión** (`from "./registro"`, no
`"./registro.js"`): Turbopack no mapea `.js` a `.ts` y la web truena en tiempo de
ejecución, no en el typecheck. Los imports de paquetes de node_modules sí la llevan
(`@modelcontextprotocol/sdk/client/index.js`), porque así los publica el paquete.

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

- **El lenguaje visual es Minimalism + Fintech UI + Material Design**, y son reglas
  verificables, no un gusto: una idea por tarjeta, un solo botón primario por pantalla, el
  monto como el elemento más grande de su tarjeta con `tabular-nums`, objetivos táctiles de
  48 px, espaciado en múltiplos de 4, y solo dos niveles de sombra. **Se construye móvil
  primero.** El detalle y el checklist están en la skill `diseno-banorte`; invócala antes de
  escribir cualquier componente o CSS.
- **Los tres pasos del reto son el criterio de "completo"**: interpretar la intención,
  generar la interfaz, ejecutar la acción y que la UI cambie con el resultado. Una
  feature sin el tercer paso es media feature.
- **Dominio en español, siempre.** Tools, schemas, componentes, campos y datos usan las
  palabras del negocio en español (`cuenta`, `movimiento`, `saldo`), nunca mezclado con
  inglés (`account`). Utilidades genéricas de código pueden ir en inglés.
- **El gestor es pnpm, solo pnpm.** Nunca `npm install` ni `yarn` en este repo: generan
  un lockfile paralelo y versiones distintas por máquina. `package-lock.json` y
  `yarn.lock` están en `.gitignore` a propósito.
- **Next 16 no es el Next que recuerdas.** Cambió APIs y convenciones respecto a la 14/15.
  Antes de escribir código de Next, lee la guía que trae el propio paquete en
  `apps/web/node_modules/next/dist/docs/`. (`create-next-app` dejaba un `AGENTS.md` en
  `apps/web` diciendo justo esto; se quitó para no tener instrucciones anidadas.)
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
