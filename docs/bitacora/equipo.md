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

- **sáb 15:45 · producto** — **Inicio ya no es una pantalla programada: la arma Maya**
  para cada persona, con un modelo chico (`gemini-3.5-flash-lite`) y solo cuando la cuenta
  se movió (huella de acciones + movimientos; reloj cada 10 min que pasa de largo si nada
  cambió). Tras aplicar un plan o crear un apartado en Maya, la portada se rearma sola.
  Los botones de la portada llevan a `/maya?accion=…` y ahí se ejecutan. Doc:
  `docs/como-funciona/inicio-personalizado.md`. Para quien toque el agente: `armarMensajes`
  ahora completa la `action` que declara el catálogo si el modelo la omite, y repara comas
  colgantes; `correrTurno` acepta `alMutar`. Para el ensayo: `pnpm probar-inicio` después
  de `reiniciar-estado` deja las tres portadas listas (checklist actualizado).

- **sáb 14:35 · para quien haga componentes o pantallas** — **Los widgets ya se adaptan a
  SU ancho, no al de la pantalla.** Todo componente del catálogo va en `Tarjeta` y su pie en
  `PieTarjeta` (`packages/catalogo/src/tarjeta.tsx`); adentro nada de `sm:`/`md:`, solo
  variantes `@md/tarjeta:`, `@3xl/tarjeta:`… (hay prueba que truena). El "¿Por qué veo esto?"
  viene plegado: en el pitch, **tócalo en vivo**. El lienzo pone las tarjetas lado a lado
  según el ancho natural de cada componente (`docs/algoritmos/acomodo-del-lienzo.md`), así
  que el agente puede seguir mandando un `Column`. Para probar un widget a 360 px, 480 px o
  completo: selector arriba en `/catalogo`. Si alguien arma un dashboard con estos widgets,
  `Lienzo` ya sirve fuera del chat.

- **sáb 14:03 · infra** — **Coolify ya limpia solo las imágenes viejas**: revisa cada
  hora y, si el disco del VPS pasa del 80 %, deja de cada app la imagen que corre y las
  dos anteriores (#15, cerrado). Para quien despliegue: la build que sigue a una
  limpieza tarda más (va sin caché), y un rollback a algo más viejo que dos builds
  reconstruye. Si vuelve `no space left on device`, lo primero es `df -h /`; nunca
  `docker system prune` a mano, el VPS es compartido. Detalle en
  `docs/arquitectura/deploy.md`.

- **sáb 13:55 · decisión** — **Ana recibe una pantalla compuesta y honesta**: 
  `ProyeccionPagoCredito` con su crédito personal + `SimuladorMeta` con "Crear apartado".
  El guion decía "no tiene deuda, así que el simulador", pero Ana **sí** tiene deuda —un
  crédito al 27.9 % anual, CAT 41.4 %— y mandarla solo a ahorrar era peor consejo que el que
  el modelo ya estaba dando. Regla nueva en el prompt: **sin tarjeta NO es sin deuda**.
  Verificado 3 de 3 con el modelo real, números exactos contra la tool. El guion y
  `pnpm probar-guion` ya lo reflejan (10 de 10).

- **sáb 13:55 · para quien haga componentes** — un componente con `acciones` declaradas
  necesita una tool que las atienda. `ProyeccionPagoCredito` disparaba
  `simular_abono_capital` y nadie la atendía: si alguien tocaba el botón en la demo, la
  acción no tenía destino. Se quitó. Y **ningún número en pantalla se estima**: si la tool
  no lo devuelve, el campo se queda fuera (ahí quedó "ahorro con abono a capital").

- **sáb 13:55 · infra** — **el disco del VPS llegó al 99 %** y los deploys de la web
  empezaron a fallar. Eran 83 imágenes de nuestras dos apps (una por push) cargando el
  caché de build de Next. Se borraron las viejas (de 99 % a 76 %) y el Dockerfile ya no
  mete `.next/cache` en la imagen. Si un deploy vuelve a fallar con `failed to extract
  layer`, lo primero es `df -h /`.

- **sáb 13:35 · CUIDADO, infra** — **El disco del VPS estaba al 99 % y los deploys de la
  web fallaban** al exportar la imagen (`no space left on device`); producción se había
  quedado dos commits atrás sin que nadie lo notara. Coolify guarda una imagen por commit
  (~1.3 GB) y no borra ninguna. Borré las de nuestras apps de commits viejos (quedan las que
  corren y `estable`): 49 GB libres. **Issue #15** abierto con la política pendiente. Si
  un deploy "no llega a servir el commit en 15 minutos", lo primero es `df -h /` en el VPS.

- **sáb 13:20 · CUIDADO, sesiones sobre el mismo árbol** — `sync.sh` hace `git add -A`: mi
  commit `8d779fa` (Productos) **se llevó siete componentes del catálogo que otra sesión
  tenía a medias** (`alerta-fugas`, `comparador-antes-despues`, `distribucion-portafolio`,
  `escenarios-inversion`, `orden-rebalanceo`, `riesgo-rendimiento`,
  `termometro-salud-financiera`). Pasan typecheck y pruebas, `main` sigue sano; si son
  tuyos, tu siguiente commit los completa. Antes de `sync.sh`, `git status` y avisa qué
  estás tocando.

- **sáb 13:25 · respuesta al aviso de arriba** — Sí eran míos (parlack, la otra sesión): es
  el pulido de los 18 componentes del catálogo. Lo que se fue en `8d779fa` ya era la
  versión final de esos siete y pasa typecheck y pruebas; este commit trae sus docs
  (`componentes-inversion-y-credito.md`, `algoritmos/graficas-del-catalogo.md`). Regla que
  adopto: **antes de `sync.sh`, `git status`, y decir en el tablero qué archivos se tocan.**

- **sáb 13:10 · hecho** — **Productos ya es una cartera**: el plástico de Banorte (degradado
  de marca + chevrones en SVG, chip, contactless, número enmascarado, red) con su detalle al
  lado, cuentas con total, un crédito por tarjeta con avance del plazo, y el portafolio
  posición por posición. El único botón rojo manda a Maya con la pregunta que le conviene a
  esa tarjeta. Detalle en `como-funciona/shell-web.md` ("Productos: la cartera"). Si vas a
  pintar una tarjeta bancaria en cualquier otro lado, usa
  `components/productos/tarjeta-fisica.tsx`, no la dibujes de nuevo.

- **sáb 10:45 · CUIDADO, aplica a quien escriba UI** — **Tailwind v4 no escaneaba
  `packages/*`**: una clase usada únicamente en `packages/catalogo` **no generaba CSS**, sin
  aviso y sin fallar nada. Medido: `bg-chart-4` tenía cero reglas, y por eso
  `GastoPorCategoria` pintaba todas las barras en rojo en vez de rojo + plata, y la barra
  del héroe era un indicador rojo sobre tarjeta roja. Arreglado con dos `@source` en
  `globals.css`, con dos pruebas (`apps/web/src/lib/__tests__/estilos.spec.ts`) y una nota
  en la skill `diseno-banorte`. **Si agregas un paquete con clases de Tailwind, decláralo
  ahí**; y si algo no se ve como lo escribiste, mira primero si la clase existe en el CSS
  servido antes de pelearte con el componente.

- **sáb 10:45 · método** — se puede mirar la pantalla de verdad desde aquí: hay un Chromium
  de Playwright en `/root/.cache/ms-playwright` y playwright en `/root/yolani`, así que
  capturar `/catalogo` y **leer** la imagen es cuestión de un script. Vale más que adivinar:
  mi primera lectura de la captura ("falta el degradado de marca") era falsa, y lo desmintió
  el `background-image` computado. Mide antes de arreglar.

- **sáb 10:15 · hecho** — **El hilo de Maya guarda las pantallas.** Cada turno deja su
  superficie congelada en la conversación, con su tira LLM · MCP · A2UI. Antes cada
  pregunta nueva borraba la tarjeta anterior y el hilo quedaba en frases sueltas. Detalle
  en `como-funciona/shell-web.md`.

- **sáb 10:15 · hecho** — **`pnpm probar-guion`**: ensaya los 9 pasos del guion contra el
  agente REAL (los tres perfiles, la acción incluida) y marca el turno que no pintó, el
  componente equivocado, el que tardó más de 15 s y la tool que falló. **Córrelo antes de
  cada ensayo**, después de `reiniciar-estado`; ya está en la checklist previa. Las 315
  pruebas del repo usan un modelo simulado: prueban el cableado y no pueden ver nada de
  lo que el jurado sí va a ver. Encontró cuatro bugs en dos minutos.

- **sáb 10:15 · decisión** — **El system prompt viaja como primer mensaje, no en `system`**,
  con el breakpoint de caché de Claude. El orden de `mensajesDelTurno` es ahora parte del
  contrato: estable arriba, historial en medio, lo volátil del turno al final. Si metes la
  fecha o el `usuarioId` arriba, el caché deja de pegar y nadie se entera; hay una prueba
  que exige que el prefijo sea byte por byte idéntico entre personas y turnos, y el `fin`
  del stream reporta `cacheLeido`.

- **sáb 10:15 · para `mcp`** — `proyectar_ahorro` aceptaba `aportacionCentavos: 0` como
  error, y ese cero **lo manda el slider del `SimuladorMeta` en su mínimo**: era alcanzable
  desde la interfaz. Ahora vale como "no me dijiste nada" y usa la capacidad calculada, con
  tres pruebas. Cuando una tool rechaza algo que la UI puede mandar, el bug es de la tool.

- **sáb 10:15 · para todos** — el turno reserva sus **dos últimos pasos** para pintar
  (`prepareStep`), y el prompt pide las tools del mismo paso **juntas**: se ejecutan en
  paralelo. El turno de Carmen bajó de 22.5 s a 4.5 s.

- **sáb 12:05 · hecho** — **`estable` existe por primera vez**, apuntando a `6ed173d`, que
  es exactamente lo que corre en producción. El corte H14 (fase 1 completa y `estable`
  marcado, "el corte más importante del hack") queda cerrado, y de paso la fase 3: el
  ensayo verificó **los cinco pasos** del viaje, incluidos los dos que nunca se habían
  probado —el segundo turno de Beto y el apartado de Ana—, todos por debajo de 12 s.

  Salieron tres bugs y ninguno era del guion: **`pnpm reiniciar-estado` no borraba nada**
  y decía que sí (issue #9, es el primer paso de todo ensayo); **el plan B sin red no
  funcionaba** porque el volcado no se puede restaurar en una base vacía (issue #10, ya
  ensayado entero: 3,690 filas y el MCP arriba contra Postgres local); y **`main` estaba
  roto** con marcadores de conflicto en el prompt, lo que dejaba al CI cortando antes del
  deploy sin que nadie lo notara (issue #11).

  Lo que cambió del producto: la tira **LLM · MCP · A2UI** encendiéndose con el stream
  real y nombrando las tools del turno; **la tarjeta que vuelve cambiada tras la acción,
  siempre** (era una moneda al aire, y cuando volvía lo hacía con los valores de antes);
  y el agente hablando en segunda persona, que salía en tercera tres de cada cuatro veces.

- **sáb 12:05 · decisión** — **Carmen no pregunta por su portafolio.** Medido contra
  producción: sin componente de portafolio, el agente pintaba su valor de mercado dentro
  de `MetaActiva`, o sea una barra de avance hacia una meta ya alcanzada. Era la única
  interfaz generada del proyecto que mentía. Las salidas eran quitar la pregunta o
  construir el componente; se quitó la pregunta, porque un componente nuevo a la hora 12.5
  es abrir alcance y el consejo oficial es el contrario. Las tools de Inversiones se
  quedan (son de lectura y enriquecen lo que ve un juez con su propio cliente MCP) y su
  portafolio sigue visible en Productos. Tercera enmienda del ADR 0004.

- **sáb 12:05 · decisión** — **`marcar-estable.sh` ya no commitea.** Llamaba a `sync.sh`,
  que hace `git add -A`; con cuatro sesiones sobre el mismo árbol, marcar estable habría
  publicado el trabajo a medio hacer de los demás. Ahora solo etiqueta, comprueba que el
  commit esté en `origin/main` y avisa si el árbol está sucio. Es la misma lección del
  issue #8: en este repo, **todo commit va por rutas**, y publicar sin tocar el árbol
  compartido se hace con `git worktree`.

- **sáb 11:15 · hecho** — **Bloque A de los orquestadores (`docs/arquitectura/
  orquestadores.md`) completo.** Tres tools nuevas en `apps/mcp`: `analizar_gasto` y
  `analizar_ahorro` (O4, fachadas de lectura que componen las atómicas por dentro sin
  reimplementar nada) y `ejecutar_decision` (O2, el ciclo de acción pasa de 3 llamadas a
  2). 21 tools en total, 14 pruebas nuevas (117 en `@maya/mcp`), `pnpm typecheck` y
  `pnpm test` en verde en los 5 paquetes. **Bloque B lo cerró `luis` en paralelo** (ver
  la entrada de las 09:20 abajo): prefetch en `agente.ts`, ciclo de acción con
  `ejecutar_decision`, y el prompt prefiriendo las tools compuestas.


- **sáb 09:40 · arreglado** — **La consola no pintaba nada porque el registro del renderer
  estaba vacío en ese camino.** `registrarLayout()`/`registrarCatalogo()` solo se llamaban
  en `/catalogo`, así que la galería se veía perfecta y la demo no pintaba una tarjeta.
  **Regla nueva: todo módulo que renderice un `<Superficie>` llama
  `registrarComponentes()`** (`apps/web/src/lib/registrar-componentes.ts`, una sola
  función, idempotente). Si algún día vuelve a aparecer "X no está en el catálogo de esta
  superficie" para **varios** componentes a la vez —`Column` incluido—, no falta un
  componente: falta el registro. `<Superficie>` ahora lo grita en consola.

- **sáb 09:40 · lección** — **290 pruebas y ninguna cazó esto**, porque todas probaban
  *mensajes* (que validen, que el reducer los aplique) y ninguna probaba que la pantalla
  **se pinte**. Un mensaje válido que nadie sabe pintar se ve igual que uno roto. Ya hay
  tres pruebas que renderizan el lienzo de verdad con `renderToStaticMarkup`, sin DOM ni
  testing-library. Si agregas un camino de render nuevo, prueba que pinte, no que valide.

- **sáb 09:40 · ojo al ensayar** — el agente contestaba "ya tienes un plan activo" a todo
  porque el estado traía los planes de las pruebas de humo. **`pnpm reiniciar-estado` antes
  de cada ensayo**, como dice el `CLAUDE.md`; no es opcional.

- **sáb 09:20 · hecho (luis/contrato)** — **Bloque B de los orquestadores
  (`docs/arquitectura/orquestadores.md`) completo, sobre el Bloque A de `aldair`.**
  Prefetch determinista de `panorama_inicial` (O3) antes del primer turno, el ciclo de
  acción del prompt ahora llama `ejecutar_decision` (O2) en vez de la tool de mutación
  suelta, y el prompt prefiere las tools compuestas (`analizar_gasto`, `analizar_ahorro`)
  sobre las atómicas (O4). 32 pruebas en verde.

- **sáb 05:30 · hecho** — **El producto funciona en producción, con el modelo real.** Los
  tres pasos del guion corriendo contra `https://maya.157.173.204.174.sslip.io`: Beto pide
  bajar intereses y recibe `ResumenTarjeta` + `PlanDePago` con sus números reales (4 pasos,
  6.4 s); aplica el plan de 18 meses, se ejecuta `aplicar_plan_pago` y la pantalla vuelve
  como `Confirmacion` + `Calendario` (3 pasos, 4.5 s); y **Ana, con la misma frase, recibe
  otra interfaz** —`SimuladorMeta`, porque no tiene tarjeta— (5 pasos, 18 s). El 20 % de
  adaptabilidad de la rúbrica, demostrado en la URL pública.

  Estaba caído por una variable de entorno: `MCP_URL` apuntaba a un hostname interno que no
  resuelve (issue #5). **La llave de Gemini sí está puesta en Coolify**, así que lo que
  decía el tablero —"falta una llave para probar el nivel 4"— ya no era cierto.

  Dos cosas aprendidas que valen para cualquiera: desde dentro de un contenedor, **la IP
  pública del propio VPS no es alcanzable** (hairpin NAT), así que verificar una URL con
  `curl` desde tu máquina no prueba que la app pueda usarla; y el alias de red entre apps de
  Coolify se pone en **`custom_network_aliases`**, no en `custom_docker_run_options`.

  El estado de producción se reinició después de probar.


- **09:55 · hecho (aldair/mcp)** — El MCP pasa de 9 a **12 tools**. Las tres nuevas
  (`panorama_inicial`, `diagnostico_salud_financiera`, `consultar_creditos`) no agregan
  datos: abren tablas que ya estaban en `db/datos/` y que ninguna tool podía ver. Dos
  consecuencias para el resto del equipo: **(1)** el agente ya no decide la pantalla con
  "tiene deuda / no tiene deuda", ahora tiene puntaje 0-100, tendencia y la deuda total —
  Beto sale en 39 y estancado, Ana en 74 cayendo, Carmen en 85 subiendo; **(2)**
  `panorama_inicial` reemplaza tres llamadas por una, así que el turno típico baja un
  paso. Como el agente lista las tools en tiempo de ejecución, **nadie tiene que tocar
  `apps/web`**: se registran solas. Detalle en `como-funciona/tools-mcp.md`.

- **09:50 · decisión (aldair/mcp)** — `panorama_inicial` devuelve un campo `situacion`
  (`deuda_critica`, `plan_activo`, `deuda_alta`, `sin_margen`, `estable_con_capacidad`).
  Es una clasificación sobre umbrales fijos, **no** una instrucción de interfaz: no nombra
  ningún componente. La frontera que defendemos ante el jurado es que el MCP clasifica la
  *situación financiera* (dato, con pruebas) y el modelo interpreta la *intención* y elige
  la pantalla (juicio). Si alguien va a hacer que el prompt dependa de `situacion`, que lo
  hable primero.

- **09:45 · nota (aldair/mcp)** — En los datos, la tarjeta de Beto existe **también** como
  fila de `creditos` (`cred_beto_tdc`, con `tarjeta_id` lleno). Quien sume esa tabla
  completa y además lea `consultar_tarjeta` cuenta su deuda dos veces. `consultar_creditos`
  ya la separa; si alguien toca `creditos` desde otro lado, que lo tenga presente.

- **sáb 01:45 · hecho** — **El motor A2UI quedó.** `packages/a2ui` ya valida con los JSON
  Schema **oficiales** de la spec y pasa sus **76 casos de conformidad** (109 pruebas en el
  paquete). Era el último pendiente del rol `contrato`. Lo que esto compra, más allá de los
  puntos de ingeniería: **agregar un componente al catálogo ya no toca ninguna validación**.
  Detalle en `arquitectura/renderer-a2ui.md` y `algoritmos/validacion-a2ui.md`.

- **sáb 01:45 · decisión** — **`catalogo.json` se publica como un catálogo A2UI de verdad**
  (misma forma que el catálogo básico de Google: `components`, `$defs.anyComponent`,
  `unevaluatedProperties: false`). La razón es que `server_to_client.json` referencia el
  catálogo con una ref **relativa** sin resolver: la spec deja un hueco con forma de
  catálogo, y quien compila decide qué entra ahí. Metemos el nuestro y el validador oficial
  valida `Confirmacion`. Es el mismo validador con el que corremos los casos de
  conformidad, solo cambiando el catálogo. Respuesta corta al jurado: *"no validamos contra
  nuestra idea del protocolo; cargamos sus schemas y pasamos sus pruebas"*.

- **sáb 01:45 · para `web`** — agregar un componente son 4 pasos y las pruebas del catálogo
  te dicen cuál falta: Zod + entrada en `CATALOGO`, `registrar(...)`, `pnpm catalogo`, y el
  `.jsonl` de ejemplo (que tiene que validar de verdad). Lista en
  `packages/catalogo/README.md`. Y tres props ya no son tu problema: `ancho`, `weight` y
  `accessibility` las resuelve el renderer para todos los componentes.

- **sáb 01:45 · ojo con el layout** — A2UI exige **una sola raíz**, así que una pantalla de
  varias tarjetas necesita un contenedor, y un `Column` raíz ocupa **una** celda de la
  rejilla bento (apila en vertical). Para el efecto bento la forma A2UI-nativa es un `Row`
  raíz con `weight` por tarjeta, o `Row`s dentro de un `Column`. `weight` ya funciona; si
  el prompt del agente va a pedir bento, que pida eso.

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
