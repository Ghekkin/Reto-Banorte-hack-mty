# Bitácora de parlack

## 2026-09-12

> Aviso sobre las horas: las entradas de más abajo de este mismo día (05:20 a 09:45)
> están en hora del servidor (UTC+2), no de Monterrey. Réstales 8 horas. De aquí en
> adelante, hora de Monterrey como manda el repo.

### 01:20 · hecho — Backend completo: las 9 tools del MCP y el agente real

Tomé el backend entero de un jalón, que es dominio de los roles `mcp` y `contrato`
(están sin dueño en el tablero). Tres commits de dominio ajeno bien marcados, y aquí
queda qué toqué y por qué.

**`packages/schemas` (9 de 9).** Un archivo por tool con `EntradaX`/`SalidaX`. Las
acciones comparten `LlaveIdempotencia` y devuelven `aplicado` / `yaEstaba` / `mensaje`.

**`apps/mcp` (9 de 9 tools).** Lectura: `consultar_perfil`, `consultar_tarjeta`,
`consultar_movimientos`, `simular_reestructura`, `consultar_plan`, `comparar_periodos`,
`proyectar_ahorro`. Acción: `aplicar_plan_pago`, `crear_apartado`. Tres módulos nuevos en
`src/dominio/`: `finanzas.ts` (puerto a TS de `scripts/lib/finanzas.mjs`), `consultas.ts`
(lo que más de una tool necesita) y `tiempo.ts`.

Decisiones que vale la pena defender frente a un juez:

- **Una sola función decide cuánto debe alguien** (`tarjetaConEstado`). Con un plan
  aplicado, el saldo revolvente queda en **cero**, el límite se libera, el pago mínimo
  desaparece y la mora se cura. Ese es el "cambio real": dos llamadas idénticas a
  `consultar_tarjeta` contestan distinto porque los datos son otros.
- **La tasa de un plan es un dato del banco, no una fórmula.** Sale de
  `planes_reestructura.csv`; la fórmula es solo el respaldo para un plazo que nadie
  cotizó. Documentado en `docs/algoritmos/oferta-de-reestructura.md`.
- **La categoría atípica no es la más grande.** Es la que más se salió de su propio
  patrón (base de 3 meses, ≥ 40 % y ≥ $500). Señalar la renta no le sirve a nadie.
  `docs/algoritmos/categoria-atipica.md`.
- **"Hoy" no es `new Date()`.** Los CSV terminan el 2026-09-12; si el pitch se corre el
  13, "los últimos 30 días" saldrían vacíos. `hoy()` usa `MCP_HOY` o la fecha del
  movimiento más reciente. Variable nueva, ya en `.env.example`.

**Bug propio arreglado de paso:** `MCP_ESTADO=apps/mcp/estado.json` se resolvía contra el
`cwd`, y el servidor arranca con `cwd` en `apps/mcp` → el estado se escribía en
`apps/mcp/apps/mcp/estado.json`. O sea: **ninguna acción habría sobrevivido a un
reinicio**, y `reiniciar-estado` limpiaba otro archivo. Ahora se resuelve contra la raíz
del repo (`raizDelRepo()` en `datos/memoria.ts`). No abrí issue porque cayó dentro de la
tarea y quedó arreglado en el mismo commit.

**Segundo bug propio, encontrado al verificar el primero:** `pnpm reiniciar-estado`
escribía el archivo y decía "estado reiniciado", pero el servidor que ya estaba corriendo
seguía contestando desde su caché en memoria. O sea: **el reinicio antes de un ensayo no
servía de nada con el MCP arriba**. Quité la caché (el archivo pesa unos KB). Verificado en
caliente: aplico un plan → el servidor lo ve → `reiniciar-estado` en otro proceso → el
mismo servidor, sin reiniciarlo, ya dice `hayPlan: false`. Hay test.

**`apps/web/src/lib/agente` (el agente real, ya no mock).** Vercel AI SDK 5 con
`streamText`, las tools del MCP traducidas con `dynamicTool` (el schema lo publica el
MCP, así que **agregar una tool no toca el agente**), y el stream JSONL del contrato.

La decisión de diseño del turno: **entregar la interfaz también es una tool**
(`pintar_pantalla`). Con eso el reintento de un JSON inválido sale gratis —es un
resultado de tool con errores y el bucle del SDK ya sabe qué hacer—, el modelo usa un
solo mecanismo para todo, y hay **una sola puerta de salida** para A2UI. Los componentes
viajan como texto JSON dentro de la llamada porque un schema estricto de "props planas y
distintas por componente" no lo aceptan igual los dos proveedores; la validación de
verdad son cuatro capas en `armarMensajes` (estructura A2UI, catálogo, árbol con `root` e
hijos que existan, y props contra el schema Zod del componente, saltándose las
enlazadas).

Dos cosas que el agente **fuerza** y no le pide al modelo: el `usuarioId` es siempre el
del turno (Maya no puede leer los datos de otra persona ni por error del modelo), y las
tools de acción reciben la `idempotencyKey` que puso el renderer.

**Pruebas: 63 en verde, sin llave y sin red.** Lo que más me importa de ellas:

- `finanzas.spec.ts` recalcula las cuatro ofertas de Beto y las compara **campo por
  campo** contra `planes_reestructura.csv`. Si alguien cambia una fórmula, truena: la
  pantalla y los datos tienen que decir lo mismo.
- `acciones.spec.ts` prueba el ciclo completo: antes no hay plan → se aplica → la tarjeta
  queda en cero con `alerta: plan_activo` → el calendario cierra en cero → la misma llave
  dos veces aplica uno solo.
- `agente.spec.ts` corre el bucle con `MockLanguageModelV2`: tool → pantalla → stream, el
  reintento de una pantalla inválida, y el tope de pasos.
- `proveedor.spec.ts` arma el proveedor **real** de Google con las 9 tools e intercepta el
  `fetch`: las declaraciones que iban a salir no llevan `$schema` ni
  `additionalProperties` (Gemini las rechaza) y un 401 deja el turno con `error` + `fin`.
  Es lo más cerca que se puede estar de "funciona con Gemini" sin gastar una llave.

`scripts/humo.sh` ahora cubre las 9 tools y el ciclo de acción por HTTP, con
aserciones de verdad (falla con código distinto de cero). Usa `usr_carmen` para la acción
a propósito: Beto y Ana son los del guion y tienen que quedar como estaban.

**Lo que NO hice, a propósito:** no toqué `packages/catalogo`. El agente solo puede pintar
lo que exista ahí (hoy `Confirmacion` + layout), y meter los 7 schemas sin su `.tsx`
dejaría la pantalla llena de cuadros rojos de "componente desconocido". En cuanto `web`
agregue un componente, el prompt y la validación lo toman solos: los dos leen `CATALOGO`.

**Bloqueo real para el nivel 4 de `probar`:** falta una llave de modelo en el `.env`.
Sin ella el agente sirve la pantalla de ejemplo y no se puede saber si el prompt decide
bien. Es lo primero que hay que conseguir.

- **05:50 · hecho** — Verificada la carga de `db/` en el Postgres de Coolify: 22 tablas
  del esquema `banorte`, 3 690 filas, y cada tabla comparada fila a fila contra los CSV
  del repo (cero diferencias); tipos de columna iguales a `db/schema.sql`;
  `scripts/validar-datos.mjs` en verde. Issue #1 (puerto 5437) subido a GitHub y cerrado.
- **05:35 · hecho** — El 5437 no entraba desde fuera: el VPS tiene un cortafuegos
  para Docker (`yolani-docker-firewall.service`) con lista blanca de puertos. Agregado
  el 5437 al script y reiniciado el servicio. Nota en `docs/arquitectura/deploy.md`.
- **05:25 · hecho** — Coolify en el VPS (`157.173.204.174`): proyecto `reto-banorte`
  y Postgres `postgres-reto-banorte` (Postgres 17 + TimescaleDB, puerto público 5437)
  arriba y verificados desde fuera y desde la red `coolify`. Secretos en `/opt/reto/.env`
  del servidor; todo lo demás en `docs/arquitectura/deploy.md`. Token de la API de
  Coolify creado para scripts. Pendiente: apps web/mcp cuando exista el scaffold, y
  acceso de Coolify al repo privado (GitHub App o deploy key).
- **05:20 · inicio** — Tomo el rol demo. Voy por la infraestructura en Coolify:
  primero Postgres para ir subiendo datos, luego las apps.

## sáb 13 · 05:30–07:45 — Scaffold completo del monorepo

Tomé el scaffold entero (bloque 1 del roadmap, las cuatro columnas) para que los otros
tres roles se sienten y escriban código sin montar nada.

**Lo que quedó arriba y verificado**: `pnpm dev` levanta MCP (3100) y web (3000);
`pnpm typecheck` en verde en los 5 paquetes; `pnpm test` con 19 tests (15 del renderer,
4 del MCP); `pnpm humo` lista la tool y la llama de verdad; `/catalogo/v1.json` se sirve.
El ciclo completo se puede probar HOY sin llave de modelo: escribir en la barra →
`POST /api/agente` → stream JSONL → renderer → pantalla.

**Decisiones que tomé y por qué** (todas reversibles, dejo la razón por si alguien
discrepa):

- **Next 16 + React 19 + Tailwind v4 + shadcn `base-nova`** (Base UI, no Radix). Es el
  default del CLI hoy; pelearme con el CLI a esta hora no compraba nada.
- **Los tokens propios se mapean en `@theme inline`**. En Tailwind v4 el `bg-[--lienzo]`
  que decía la skill `diseno-banorte` **no funciona**. Corregí la skill: se escribe
  `bg-lienzo`, `text-exito`, `border-borde-sutil`.
- **Imports internos sin extensión**. Turbopack no mapea `.js` → `.ts`: el typecheck
  pasa y la web truena en ejecución. Me costó dos arranques; quedó escrito en
  `CLAUDE.md` y en la skill `scaffold` para que no le pase a nadie más.
- **Renderer fiel a la spec vendoreada**: las props van **planas** junto a `id` y
  `component` (no anidadas en `props`), `children` acepta lista o plantilla
  `{ componentId, path }`, y la raíz es el id `root`. Lo verifiqué contra
  `packages/a2ui/spec/v0_9_1/catalogs/basic/catalog.json` antes de escribir los tipos.
  Si hubiera inventado el formato, los 8 casos de conformidad no servirían de nada.
- **`packages/catalogo` importa las primitivas de shadcn desde `apps/web`** con el alias
  `@/components/ui/...`. Un `packages/ui` aparte duplicaba la config de shadcn sin
  comprar nada en 33 horas. Está documentado en el README del paquete.
- **El agente es un mock** que emite `ejemplos/confirmacion.jsonl` ya validado contra el
  catálogo (regla 4: lo que está a medias va detrás de un mock). Es lo primero que
  `contrato` tira a la basura.

**Lo que dejé a medias, con dueño**, en la tabla final de la skill `scaffold`: agente
real y ajv contra la spec (`contrato`), 8 tools de 9 (`mcp`), 7 componentes de 8 con su
encargo escrito en cada carpeta (`web`), origen Postgres y panel de transparencia.

**Nombre**: el usuario me dejó elegirlo y propuse Brújula; a media construcción entró el
cambio a **Maya** (la asistente real de Banorte; la propuesta es "su siguiente
generación"). El rename está aplicado en todo el scaffold. El disclaimer de
"no oficial ni afiliado" ya está en el `README.md`.

## sáb 13 · 08:00–09:00 — Deploy en Coolify con GitHub Actions

`maya-web` y `maya-mcp` están arriba en el Coolify del VPS, en el proyecto
`reto-banorte`, junto al Postgres que ya estaba. **Nadie vuelve a desplegar a mano**:
push a `main` → Actions verifica → Coolify construye y publica.

- URLs: https://maya.157.173.204.174.sslip.io y
  https://maya-mcp.157.173.204.174.sslip.io/mcp. `sslip.io` porque todavía no hay
  `.tech`: resuelve a la IP sin comprar nada y no imita a Banorte. Cambiar al dominio
  real es agregarlo en Coolify y actualizar dos variables del repo.
- Repo privado resuelto con **deploy key de solo lectura** (`coolify-maya`), no con la
  GitHub App. La privada está en `/opt/reto/llaves/maya-deploy-key`.
- **El token de Coolify que vive en GitHub NO es el root.** Creé
  `maya-github-actions` con abilities `["deploy","read"]`: dispara deploys, y da 403
  si intenta crear recursos. El root se queda en el VPS. El mismo Coolify administra
  la producción de otro proyecto del equipo; un token root dentro de un repo de
  hackathon es poder de más, y los secrets de Actions los ve cualquiera que pueda
  editar workflows.
- El workflow no solo despliega: al final **manda un prompt del guion a la URL pública
  y exige mensajes A2UI en la respuesta**. Un deploy que arranca pero no contesta
  cuenta como deploy fallido.
- Los Dockerfiles no usan `output: standalone` a propósito: la web lee `catalogo.json`
  y los `.jsonl` de ejemplo en tiempo de ejecución, y standalone los deja fuera.
  Imagen más grande a cambio de cero sorpresas a las 3 am. Ambas imágenes probadas en
  local antes de tocar Coolify.
- El MCP publicado carga los CSV desde la imagen (origen `memoria`): **no depende de
  que Postgres esté arriba**. Su `estado.json` vive en `/datos`, fuera del repo, para
  que un redeploy no lo arrastre.
- Me topé con que `/opt/reto/.env` tenía el token sin comillas y el `|` de Sanctum lo
  partía: `source` fallaba y la API respondía `Unauthenticated`. Arreglado y registrado
  como issue #2 (cerrado).

Pendiente mío: la llave de Gemini en las variables de `maya-web` está vacía, así que el
agente publicado responde con la pantalla de ejemplo. En cuanto alguien la ponga en
Coolify, la URL pública queda completa.

### 09:30 — Dos fallos del deploy que sólo aparecen bajo carga

El pipeline quedó en verde, pero encontré dos cosas que habrían mordido de madrugada:

1. **Un 502 del panel tumbaba el deploy entero.** Coolify está detrás de un proxy y
   devuelve 502 mientras construye otra cosa. Ahora `deploy.sh` reintenta 5 veces con
   espera creciente; un 4xx no se reintenta, porque un token o un uuid malos no mejoran
   solos.
2. **Peor: el deploy se daba por bueno cuando todavía estaba construyendo.** El script
   esperaba a que `/health` respondiera, y **el contenedor viejo responde igual**. El
   workflow salía en verde, el smoke test pasaba contra la versión anterior, y producción
   seguía con el commit de antes. Lo vi porque `/api/health` reportaba `9d546d5` después
   de un deploy "exitoso" de otro commit.

   Arreglado: ahora espera a que `/health` devuelva **el commit que se está publicando**
   (`SOURCE_COMMIT`, que Coolify inyecta al construir). Le agregué el campo `commit` al
   `/health` del MCP, que no lo tenía. Si un servicio no reporta commit, lo dice en el
   log en vez de mentir.

La lección para el checklist: "el workflow está en verde" no era prueba de que lo
publicado sea lo último. Ahora sí.

### 09:45 — Las variables de entorno nunca se guardaron (y el síntoma engañaba)

Tercer fallo del deploy, el más sucio de los tres: **ninguna variable de entorno se
había creado en Coolify**. La API rechaza el campo `is_build_time` con
`Validation failed`, y yo había mandado la respuesta a `/dev/null`, así que los ocho
POST fallaron en silencio y yo di por hecho que estaban puestas.

El síntoma no apuntaba ahí: el `catalogId` salía con `localhost` (parecía que mi
arreglo del mock no se había desplegado, pero sí estaba en el commit publicado) y el
`/mcp` público respondía **406 en vez de 401 sin token** — o sea, `MCP_TOKEN` vacío,
o sea **el MCP publicado estaba abierto**. Nadie lo habría notado hasta que un juez
se conectara sin token.

Y al recrearlas me equivoqué otra vez: vi cada clave repetida y las tomé por
duplicados, cuando en realidad **Coolify crea un par por variable** (producción +
preview). Borré las de producción y dejé las de preview, que no se inyectan al
contenedor: el redeploy salió "bien" y las variables seguían sin existir. Se ve en el
campo `is_preview` del objeto, que no miré la primera vez.

Las tres trampas quedaron escritas en `deploy.md`. Reglas nuevas: después de tocar
variables por API, leer la lista **con `is_preview`**, no sólo los nombres; comprobar
con `docker exec … env` que llegaron al contenedor; y nunca mandar a `/dev/null` la
respuesta de algo que estás afirmando que quedó hecho.
