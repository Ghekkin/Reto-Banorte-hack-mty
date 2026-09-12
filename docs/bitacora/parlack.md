# Bitácora de parlack

## 2026-09-12

### 04:10 · hecho — Los 7 componentes que faltaban y lo demás de la lista del A2UI

Lo que quedaba de "¿qué falta para el A2UI?", cerrado:

- **Los 7 componentes del catálogo** (`9d5351e`): `ResumenTarjeta`, `PlanDePago`,
  `Calendario`, `GastoPorCategoria`, `DetalleCategoria`, `SimuladorMeta`, `MetaActiva`.
  Sobre shadcn, cero hex, tres estados, props alineadas con las tools. Cada uno con su
  `.jsonl` validado contra los schemas oficiales y una prueba nueva que **pinta** cada
  ejemplo con `react-dom/server` (`render.spec.tsx`): un componente que truena al recibir
  sus props no lo detecta ningún schema. La `Confirmacion` de referencia usaba divs a mano
  para el skeleton; ahora usa el de shadcn. Doc en `docs/como-funciona/catalogo.md`.
- **Ejemplos en el prompt** como few-shot, solo los que usan componentes que existen.
- **`mensajeClienteAServidor()`** en a2ui: nuestra acción envuelta como manda
  `client_to_server.json` pasa el validador oficial sin un error (test).
- Frontera de error por componente, canal `VALIDATION_FAILED` de ida y vuelta y
  `GET /api/agente` con capacidades: los empecé yo y los terminó y commiteó la otra sesión
  (`0568d25`), incluida una prueba en DOM real de la frontera. Bien.
- **Panel de transparencia: NO lo hice.** Lo tenía escrito y lo descarté: es frontend del
  producto, y el frontend lo está rediseñando otra sesión. Los datos que necesita ya están
  en el stream y `usarAgente` los guarda en `transparencia` (las líneas `tool`, `a2ui`,
  `error` y `fin` con pasos y ms); armar el panel es leer ese arreglo. Queda para `web`.
  De paso: el placeholder del lienzo (`components/maya/lienzo.tsx`) dice que los
  componentes del catálogo "se conectan en el siguiente paso", y eso ya no es cierto
  desde `9d5351e`: los 8 existen. Es una línea de texto, de `web`.

Decisiones de diseño de los componentes que vale la pena defender: la **selección del plazo
y la posición del slider viven en el componente** (estado de interfaz), y solo la
confirmación viaja al agente; ir por cada clic sería un turno por toque. El `SimuladorMeta`
recalcula la fecha localmente con la misma aritmética que `proyectar_ahorro` (división sin
rendimiento) para que el slider se sienta; el número autoritativo vuelve de la tool.


> Aviso sobre las horas: las entradas de más abajo de este mismo día (05:20 a 09:45)
> están en hora del servidor (UTC+2), no de Monterrey. Réstales 8 horas. De aquí en
> adelante, hora de Monterrey como manda el repo.

### 03:55 — Conflicto con el rediseño de la interfaz al subir lo anterior

`sync.sh` reportó CONFLICTO: el rediseño movió la shell (`components/shell/lienzo.tsx` →
`components/maya/lienzo.tsx`, `app/page.tsx` → `app/(app)/...` con `consola-maya.tsx`,
`usar-agente` → `lib/agente/`). Dominio `web`, así que ganó GitHub: borré mis dos archivos
viejos y reapliqué solo la prop `alFallar` en el lienzo nuevo y en la consola. Git detectó
el rename de `usar-agente.ts` solo.

Trampa al verificar: `pnpm typecheck` de `web` falló por `.next/types/validator.ts`, un
archivo **generado** que aún apuntaba a la página vieja. No es código de nadie: `npx next
typegen` lo regenera. Para que no le pase al siguiente, el script `typecheck` de `web`
ahora corre `next typegen` antes de `tsc`.

### 03:40 · hecho — El ciclo de error A2UI cerrado y una frontera de error por componente

Retomé el árbol con cambios sin commitear de la sesión anterior (el canal
`VALIDATION_FAILED` conectado al agente, `GET /api/agente` con `server_capabilities`,
rechazo con 400 de un cliente que declare otro catálogo, y `FronteraDeError` en
`Superficie`). Lo primero fue comprobar que `main` siguiera arrancando antes de que el
hook lo subiera solo: **no arrancaba**. Dos cosas:

- `@types/react-dom` se había agregado a `packages/catalogo`, pero el test que importa
  `react-dom/server` vive en `packages/a2ui`. El typecheck del paquete fallaba. Ahora
  `react-dom` y sus tipos son devDependencies de `a2ui`.
- El test de la frontera de error usaba `renderToStaticMarkup` y **no puede pasar así**:
  React no ejecuta error boundaries en render de servidor, el error se propaga tal cual.
  El componente estaba bien; la prueba estaba mal planteada. Lo moví a su propio archivo
  (`frontera-de-error.test.tsx`) con `happy-dom` + `createRoot` + `act`, que es un DOM de
  verdad. Sí metí una dependencia de pruebas a las 3 am, al contrario de lo que dije a las
  02:10: sin ella la frontera se quedaba sin prueba, y es justo lo que evita que un
  componente roto tumbe la pantalla en la demo.

Resultado: typecheck en verde en los 5 paquetes, 222 pruebas (112 a2ui, 42 catálogo,
42 mcp, 26 web). Docs al día: `contrato-agente-cliente.md` (campos `error` y
`clientCapabilities`, el `GET`, quién dispara el turno), `renderer-a2ui.md` (el canal ya
no está "medio conectado"; sección nueva de la frontera), y las cifras del mapa en
`CLAUDE.md`, que decían 1 de 8 componentes cuando ya son 8 de 8.

**Lo que NO hice:** no probé el ciclo de error con llave de modelo real (que el agente
efectivamente repinte sin el componente al recibir `error`). El prompt lo pide en
`historial.ts`; falta verlo en la página viva. Va junto con el guion.

### 01:45 · hecho — El motor A2UI terminado: ajv contra la spec y los 76 casos oficiales

Cerré el último pendiente de `contrato` (`packages/a2ui`), que es dominio ajeno otra vez.
El tablero decía "falta ajv contra `spec/v0_9_1/json/` y los 8 casos de conformidad" y eso
es justo lo que faltaba para que el resto del equipo pueda trabajar sin tocar el motor.

**El hallazgo que lo hizo fácil.** `server_to_client.json` referencia los componentes con
`catalog.json#/$defs/anyComponent`: una ref **relativa y sin resolver**, contra un archivo
que no existe en la spec. O sea que la especificación deja un hueco con forma de catálogo y
quien compila los schemas decide qué entra ahí. Registrando el catálogo básico oficial
corren los 76 casos de conformidad; registrando el nuestro, el mismo validador oficial
valida `Confirmacion`. Un validador, dos catálogos, cero reglas escritas a mano. Por eso
`catalogo.json` ahora se genera con la forma de un catálogo A2UI real.

**Lo que costó trabajo de verdad no fue validar, fue el mensaje de error.** El schema es un
`oneOf` de los cuatro verbos y cada componente es otro `oneOf` sobre los 18 del catálogo:
un `variant` mal escrito da **81 errores** (lo medí). Para un modelo que tiene que
corregirse en el paso siguiente, eso es ruido. La salida fue no entrar por arriba: el JSON
ya dice qué es, así que se valida contra el `$defs` del verbo que trae y contra el schema
del componente que dice ser. Mismos schemas oficiales, leídos más adentro. Para conformidad
hay otro validador que sí entra por arriba y no recorta nada.

**Tres cosas que encontré de paso y arreglé:**

- `ancho` no hacía nada. La prop existía en `comunes.ts` y la rejilla bento buscaba
  `[data-ancho=amplio]`, pero nadie ponía el atributo: ningún componente lo spreadeaba.
  Lo puse en el renderer (`Superficie.tsx`), que es donde debe estar — si cada autor de
  componente tiene que acordarse, el séptimo se olvida. Igual con `weight` (flex-grow) y
  `accessibility` (aria), que estaban en la lista de llaves reservadas y no se usaban.
- `updateDataModel` **sin** `value` debe borrar la llave según la spec, y nosotros
  escribíamos `undefined`. Y `path` es opcional. Arreglados los dos, con prueba.
- El `catalogId` del catálogo publicado salía con `localhost`. Ahora el route lo reescribe
  con `URL_CATALOGO` al servirlo, y el archivo del repo se genera siempre con la URL de
  desarrollo para que el CI pueda exigir que no cambie (si el generador leyera la variable
  de entorno, el diff del CI fallaría según quién lo corra).

**La pieza que le sirve al equipo** son las 12 pruebas nuevas de `packages/catalogo`: si
alguien agrega un componente y olvida registrarlo, regenerar el catálogo o escribir su
`.jsonl`, falla ahí con el mensaje de qué falta. El motor ya no es algo que haya que
entender para trabajar: es algo que te dice qué te falta.

**Choque de sesiones.** Trabajando a la vez en el mismo árbol, la otra sesión y yo
escribimos `componentesVisibles` las dos. Lo vi al compilar (`Multiple exports with the
same name`), quité el mío, y la otra sesión acabó reconciliando las dos versiones. Lección:
con dos sesiones en el mismo checkout, antes de escribir una función nueva conviene
`grep` del nombre. No basta con `git pull`, porque el trabajo del otro aún no está
commiteado.

**Lo que NO hice:** el canal de error de vuelta (`VALIDATION_FAILED` de
`client_to_server.json`) quedó a medias a propósito: `<Superficie alFallar>` lo emite, pero
nadie lo escucha todavía. Conectarlo al agente le permitiría corregirse en el mismo turno,
y es la mejor respuesta a "¿y si el modelo se equivoca?". Queda anotado, no empezado.

**02:10 — corregido lo que la auditoría de la otra sesión encontró en eso mismo:** yo
llamaba `alFallar` **durante el render**, y quien lo escuche con un `setState` habría
entrado en bucle. Ahora sale en un `useEffect` y cada fallo se avisa una sola vez por vida
del componente, así que un reintento que falla igual tampoco cicla. Dejar una trampa justo
debajo de lo que estoy recomendando como siguiente paso no tenía sentido. El render no
tiene prueba unitaria (no hay testing-library en el paquete y no la voy a meter a las 2 am);
se verificó con la página viva.

### 01:55 · hecho — Auditoría del backend, el MCP y el A2UI: 12 huecos cerrados

Pasada con ojos frescos sobre todo lo que existe, archivo por archivo. Lo que se
encontró y se arregló, con prueba cada uno (`auditoria.spec.ts` en el MCP y `cortes del
turno` / `esquemaPeticion` en el agente):

**Agente**
- **El timeout no se reportaba como timeout.** El AI SDK no lanza al abortar: emite una
  parte `abort` y cierra el stream. Sin ese `case`, un turno de 30 s salía como "el
  modelo no entregó pantalla". Lo comprobé con un mock que respeta el `abortSignal`.
- **Cerrar la pestaña no cortaba nada**: el turno seguía llamando tools (y podía aplicar
  una acción) para nadie. `route.ts` pasa `request.signal` y se combina con el timeout.
- **La petición no se validaba**: `mensajes` ausente tronaba dentro del stream. Ahora
  `esquemaPeticion` (Zod) devuelve 400 con detalle, con topes y `usuarioId` con patrón.
- **MCP caído se reportaba como error del modelo**; ahora `codigo: "tool"` con la URL.
- **Un proveedor caído producía dos errores** (el suyo y "no entregó pantalla"); ahora uno.
- `datosJson` aceptaba `null`, un arreglo o un texto como data model; y con `"null"` el
  modelo recibía una lista de errores **vacía**. Ahora exige objeto y siempre dice por qué.
- La regla "un solo `heroe` por pantalla" estaba en el prompt y en ningún validador.
- `revisarArbol` duplicaba lo que `validar.ts` ya sabía hacer (`arbolCompleto`).

**MCP**
- `consultar_tarjeta` con el id de una **tarjeta de débito** la devolvía como de crédito
  (límite 0, tasa 0 → "saludable"). Se rechaza con motivo.
- El plan era por persona, no por tarjeta: `aplicar_plan_pago` rechazaba una segunda
  tarjeta. Ahora `planAplicado(usuarioId, tarjetaId)`.
- La escritura del estado no era atómica: ahora temporal + `rename`.
- `comparar_periodos` sin `periodo` tomaba el **mes en curso a medias** (12 días contra
  meses completos: todo "bajaba"). Default: el último mes cerrado.
- `sumarMeses` con meses negativos daba un mes negativo; `MCP_HOY` con un typo se usaba
  tal cual; `desde > hasta` devolvía vacío en silencio; `crear_apartado` aceptaba una
  `cuentaOrigenId` **de otra persona**. Los cuatro, cerrados. Dos helpers muertos, fuera.

**A2UI (obra de la otra sesión, ya en `main`)**: revisé `esquema.ts`, `validar.ts`,
`procesar.ts`, `bindings.ts`, `Superficie.tsx` y la conformidad. Sólido. Un riesgo que
no toqué por ser suyo y estar en vuelo: `Superficie` llama `alFallar` **durante el
render**; si quien lo escuche hace `setState` con una referencia nueva, se cicla. Hoy
nadie lo escucha (a propósito), así que no muerde; que lo tenga en cuenta quien lo conecte.

**Nota de historia:** los cambios de esta auditoría entraron en `b2a19f8` (el commit de
la otra sesión sobre el motor A2UI): su hook `Stop` hace `git add -A` y barrió mi árbol
de trabajo a medio camino. El contenido es el descrito aquí; el mensaje de ese commit no
lo menciona. 189 pruebas en verde.

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
