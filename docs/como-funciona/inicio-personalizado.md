---
verificado: 2026-09-12 15:40 (hora de Monterrey)
estado: construido
---

# El Inicio que arma Maya: una portada por persona, con un modelo chico

## Para cualquiera

Cuando abres la app de tu banco, la pantalla de inicio es la misma para todos: tu saldo,
tus tarjetas, tus últimos movimientos. Da igual que estés con la tarjeta al límite o que
te sobre dinero cada mes.

Aquí no. **Maya arma la portada de cada persona** con las mismas piezas que usa en la
conversación: a Beto, que trae la tarjeta al 96.7 % y doce días de atraso, le pone
primero la tarjeta y el plan de pago para salir de ahí; a Ana, que no tiene tarjeta pero
sí un crédito al 27.9 %, le pone ese crédito y el simulador de ahorro; a Carmen, su
portafolio y qué tan desviado está. Arriba de las tarjetas, Maya dice en dos frases qué ve
hoy y qué recomienda, y deja tres preguntas listas para seguir la conversación.

Lo hace un **modelo pequeño y barato**, no el que conversa, y lo hace **solo cuando hace
falta**: en producción, cada diez minutos revisa si la cuenta se movió (una acción,
movimientos nuevos) y si no se movió, no gasta nada. Esa revisión periódica solo corre en el
servidor publicado: una copia de desarrollo que se quedó prendida con código viejo ya no puede
reescribir las portadas que ven los demás. Cuando alguien aplica un plan o crea un apartado desde Maya,
la portada se rearma sola en segundo plano: al volver a Inicio, ya cambió. Y si la portada
todavía no está lista, se ve la pantalla programada de siempre con un aviso de que Maya la
está armando; en cuanto está, entra sola.

Los botones de la portada funcionan: tocar "Aplicar plan" en Inicio manda a la persona a
Maya con esa acción ya disparada, y ahí se ejecuta de verdad.

**Y puedes preguntarle desde ahí mismo.** La barra de abajo no es un chat: escribes "¿en
qué se me fue el dinero?", y tu pantalla de inicio **se borra y se vuelve a armar** para
contestar eso, con tarjetas, como un pizarrón que se limpia. No aparece una burbuja ni una
conversación: aparece otro dashboard. Y se queda: si recargas, sigue lo que preguntaste,
hasta que tus datos cambien de verdad.

## Técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| Configuración (`FEATURE_INICIO_PERSONALIZADO`, `MODELO_INICIO`, `INICIO_CADA_MINUTOS`) | `apps/web/src/lib/inicio/config.ts` |
| El modelo chico | `apps/web/src/lib/inicio/modelo.ts` |
| La huella de los datos (cuándo vale la pena rearmar) | `apps/web/src/lib/inicio/huella.ts` |
| Dónde se guarda la portada (`banorte.pantallas_inicio`) | `apps/web/src/lib/inicio/almacen.ts`, `db/migraciones/0002-pantallas-inicio.sql` |
| El generador (datos → modelo → `pintar_pantalla`) | `apps/web/src/lib/inicio/generar.ts` |
| El servicio (estado, rearmar si cambió, una generación en vuelo) | `apps/web/src/lib/inicio/servicio.ts` |
| El reloj | `apps/web/src/lib/inicio/reloj.ts`, arrancado desde `apps/web/src/instrumentation.ts`; si corre lo decide `decisionDelReloj()` en `config.ts` |
| La ruta `GET`/`POST /api/inicio` | `apps/web/src/app/api/inicio/route.ts` |
| La página | `apps/web/src/app/(app)/page.tsx` |
| La portada pintada, y el aviso mientras se arma | `apps/web/src/components/inicio/inicio-de-maya.tsx`, `refresco-del-inicio.tsx` |
| La rejilla masonry en que caen las tarjetas | `apps/web/src/components/inicio/masonry.tsx` (`docs/algoritmos/masonry-del-inicio.md`) |
| La consulta desde Inicio (la barra de abajo) | `components/inicio/tarjetas-inicio.tsx` (`BarraFlotanteMaya`) → `app/(app)/acciones.ts` (`preguntarEnInicio`) |
| El ciclo visible al preguntar (salida → esqueleto → entrada) | `components/inicio/transicion-inicio.tsx`, `esqueleto-inicio.tsx` (`docs/como-funciona/transicion-del-inicio.md`) |
| El gancho "acabo de aplicar una acción" | `lib/agente/agente.ts` (`alMutar`), conectado en `app/api/agente/route.ts` |
| La entrada a Maya con un botón ya tocado | `app/(app)/maya/page.tsx` (`?accion=`), `components/maya/consola-maya.tsx` |
| El ensayo con el modelo real | `scripts/probar-inicio.mjs` (`pnpm probar-inicio`) |

### Las cuatro puertas y una sola regla

La portada se puede rearmar desde cuatro lugares, y los cuatro pasan por
`regenerarSiCambio(usuarioId, motivo)`:

| Puerta | Cuándo | `motivo` en el log |
|---|---|---|
| El reloj | cada `INICIO_CADA_MINUTOS` (default 10), los tres usuarios uno tras otro. **Solo en producción** salvo `INICIO_RELOJ=1` | `reloj` |
| Una acción | al cerrar un turno del agente en el que una tool de acción del MCP aplicó algo | `accion` |
| Una visita | al abrir Inicio con la portada desactualizada (`after()`, después de responder) | `visita` |
| La ruta | `GET /api/inicio` con la portada desactualizada (en segundo plano) o `POST` (espera) | `consulta` / `manual` |

La regla: **el modelo corre solo cuando algo cambió.** Se calcula la huella de los datos
de la persona (`huella.ts`), se compara con la guardada junto a la portada, y si es la
misma no se hace nada. El reloj puede ser frecuente sin miedo a la cuota: una cuenta que
no se mueve cuesta dos subconsultas con índice, cero tokens. Detalle en
[`docs/algoritmos/portada-de-maya.md`](../algoritmos/portada-de-maya.md).

Además, **una generación en vuelo por persona**: si el reloj y una visita piden la misma
portada a la vez, el modelo se llama una sola vez y las dos esperan ese resultado. Y las dos
puertas pasivas (`visita`, `consulta`) no reintentan la misma portada más de una vez cada 5
minutos (`ESPERA_ENTRE_INTENTOS_MS`): si el modelo falla, cien visitas no son cien intentos
pagados.

### Cómo se arma una portada (`generar.ts`)

Es el mismo motor que un turno de conversación: el mismo `systemPrompt()`, las mismas
tools del MCP, la misma `pintar_pantalla` con sus cuatro validaciones
(`docs/como-funciona/agente.md`). Tres diferencias, y las tres son de costo:

1. **Otro modelo.** `MODELO_INICIO`, por default `gemini-3.5-flash-lite`. No hay intención
   que interpretar; el trabajo es elegir 3 tarjetas y enlazar números.
2. **Arranca con los datos en la mano.** Antes de llamar al modelo, `reunirDatos` pide al
   MCP lo que toda portada necesita, según la situación (prefetch determinista, O3):
   `panorama_inicial`; luego en paralelo `analizar_gasto`, `analizar_ahorro`,
   `consultar_creditos` (con amortización si no hay tarjeta), `consultar_tarjeta` si la
   hay y `simular_reestructura` si está al límite sin plan; y `proyectar_ahorro` con un
   objetivo de tres meses de gasto si no tiene meta activa pero sí capacidad. Todo eso va
   en el bloque de contexto, tal cual lo devolvió cada tool.
3. **Solo tools de lectura.** Al modelo le llegan `TOOLS_DE_APOYO` (simular, proyectar,
   históricos…) y `pintar_pantalla`; las de acción **no están en el conjunto**. Corre solo,
   sin nadie mirando: un cambio de estado desde aquí sería uno que nadie pidió.

El bucle tiene tres pasos: el 0 para pedir lo que falte (todas las tools en paralelo) o
pintar de una vez; del 1 en adelante, `toolChoice` forzado a `pintar_pantalla` y solo esa
tool visible; y un reintento si la pantalla vino inválida. Tope de 45 s.

El bloque de contexto (`encargoDePortada`) va después del system prompt, como el del
turno: es lo único que cambia entre personas, y así el prefijo se cachea. Pide una
portada, no una respuesta: **exactamente 3 tarjetas** (tope de código, `TOPE_DE_TARJETAS`), la
primera `Conclusion` con el veredicto y el saludo, y las otras dos de una **escalera** de urgencia
recorrida en orden (tarjeta al límite → crédito a plazo con saldo → portafolio desviado → topes y
fugas → meta), la primera de la escalera con `heroe: true` y solo esa, nada de `Confirmacion` ni
`Text`, todo número de los datos, los botones con su `action`, y un `texto` corto porque el veredicto
ya va en la `Conclusion`.

El orden de la escalera es **no negociable** y hubo que decirlo dos veces: con solo dos huecos libres
(la `Conclusion` se come uno), el modelo chico se saltaba el caso del crédito de Ana —"va al
corriente", razonaba— y se iba al portafolio, que se ve más interesante. Los casos de la escalera son
excluyentes en el texto: el del portafolio exige **sin deuda**, y "al corriente" no es "resuelto"
mientras haya saldo insoluto pagando intereses.

Dos cosas que el servidor completa y no le pide al modelo (en `lib/agente/pantalla.ts`,
así que valen también para la conversación):

- **La `action` por default.** Un componente con botón y sin `action` es un botón apagado.
  Si el catálogo declara `acciones` para ese componente y el modelo no puso ninguna, se le
  pone la primera con `context: {}`: todos los componentes ponen en el `context` lo que su
  acción necesita al tocarse (el plazo elegido, la suscripción de la fila). El modelo chico
  omitió la `action` de `PlanDePago` en dos corridas seguidas, con la regla escrita.
- **Comas colgantes.** El tercer intento de `parsear` quita las comas antes de `}` o `]`,
  sin tocar cadenas. Es el error de sintaxis más común de un modelo chico en un JSON largo;
  tumbó dos portadas seguidas de Carmen (2 000 tokens de data model).

### Qué se guarda y qué se pinta

`banorte.pantallas_inicio`, una fila por usuario (migración 0002): los tres mensajes A2UI
validados (`createSurface`, `updateComponents`, `updateDataModel`), `texto`, `razon`,
`sugerencias`, y la trazabilidad (`modelo`, `tools`, tokens de entrada/salida/caché, `ms`,
`generada_en`) junto a la `huella`. Va en la base y no en memoria porque los deploys son
cada rato, y porque la base es la misma en local y en producción: la portada que armó un
proceso la ve el otro. Por eso mismo el `catalogId` se pone **al leer**, con el
`URL_CATALOGO` de quien sirve.

La página (`page.tsx`) decide con `estadoDelInicio`:

| Estado | Qué se pinta |
|---|---|
| Inactivo (flag en 0, sin llave o sin `DATABASE_URL`) | La pantalla programada de siempre, sin aviso |
| Hay portada (al día, o vencida mientras se rearma) | `InicioDeMaya`: encabezado (saludo, `texto`, modelo, tools, tiempo, "¿Por qué veo esto?", sugerencias) y el `Lienzo` con la superficie |
| Sin portada | La programada + `RefrescoDelInicio` ("Maya está armando tu inicio…"), que pregunta a `/api/inicio` cada 3 s y hace `router.refresh()` cuando llega la nueva; se rinde a los 90 s |

`InicioDeMaya` reconstruye la superficie con `procesarVarios` y la pinta con el **mismo**
`Lienzo` de la conversación: mismo motor, mismas tarjetas, mismo acomodo. `data-pieza` y
`data-tamano` iguales.

### El ciclo de acción no se duplica

Un toque en la portada **no** ejecuta nada en Inicio: `InicioDeMaya` manda a
`/maya?accion=<JSON de la acción>`. `PaginaMaya` valida ese JSON con
`esquemaAccionEntrante` (el mismo schema del cuerpo de `POST /api/agente`), se lo pasa a
`ConsolaMaya` como `accionInicial`, y la consola lo envía una sola vez con `enviarAccion`
—igual que si se hubiera tocado ahí— y limpia la URL con `replaceState` para que recargar
no lo repita. La `idempotencyKey` viene en el `context` desde `emitirAccion`, con
`conversacionId: "inicio"`, así que un reintento tampoco aplica dos veces.

Cuando ese turno termina con una tool de acción aplicada, el agente llama `alMutar` y la
ruta lo convierte en `after(() => regenerarSiCambio(usuarioId, "accion"))`: la portada se
rearma en segundo plano mientras la persona sigue en Maya. Al volver a Inicio, o ya está la
nueva, o se ve llegar.

### La conclusión es una tarjeta del catálogo, no un párrafo

El `texto` del turno se pintaba arriba del lienzo como un párrafo `text-sm
text-muted-foreground` con un avatar a la izquierda y los chips de evidencia debajo: la
forma de un mensaje de chat. Dos costos, y el segundo es el que importaba.

El consejo —lo único que un banco no te da hoy— era el elemento con **menos** peso visual
de la pantalla, por debajo de cualquier monto de cualquier tarjeta. Y con forma de burbuja,
la pantalla se leía como "un chat con tarjetas pegadas" en lugar de un dashboard.

Ahora es **`Conclusion`** (`packages/catalogo/src/conclusion/`), una tarjeta del catálogo
como las demás: titular en `text-2xl`, detalle, hasta 3 cifras de apoyo y las sugerencias
como botones. La evidencia (modelo, tools, tiempo) bajó primero a una línea de `text-xs`
**debajo** del dashboard, y el 2026-09-13 **se quitó de la pantalla**: decía
`gemini-3.1-flash-lite · 6 tools del MCP · 36.7 s · hace 21 min`, que es información para el
equipo y el jurado, no para la persona. Esos datos siguen guardados con la portada
(`banorte.pantallas_inicio`) y salen en `GET /api/inicio`.

**La pinta el modelo; el host solo si falta.** Los dos encargos le piden al modelo que la primera
tarjeta sea `Conclusion`, y la suya gana porque es la rica (titular, detalle, hasta 3 cifras,
sugerencias). `InicioDeMaya` pinta la suya —armada con el `texto` y la `razon` de la portada,
partiendo el texto en titular y detalle con `partirEnTitular`— **solo si el árbol A2UI no trae
ninguna**. Esa red hace falta: este documento ya registra que el modelo chico omitió props
obligatorias dos corridas seguidas teniendo la regla escrita.

Hasta el 2026-09-12 el host la pintaba **siempre**, sin mirar el árbol, así que salían dos
conclusiones en la misma pantalla: la del modelo y encima una pobre hecha con una frase corta. El
detalle está en `componente-conclusion.md`.

### Con widgets vivos (`FEATURE_WIDGETS_VIVOS=1`)

Lo que sigue en esta sección y en «La consulta desde Inicio» describe el modo **anterior**. Con
el flag encendido, dos cosas cambian y el resto (reloj, huella, prefetch, una generación en
vuelo, el rearmado tras una acción) es igual:

- **La portada se arma por fuentes**: `generarPortada` delega en `generarPortadaDeWidgets`, el
  modelo llama `pintar_widgets` y las cifras de cada tarjeta las pone un adaptador con lo que
  devolvió el MCP. Se guardan `procedencias` y `referencias` (migración 0005).
- **Las dos tarjetas las decide el código, no el modelo** (`lib/inicio/widgets-por-cuenta.ts`,
  2026-09-13 05:00): tarjeta al límite o con mora → `tarjeta` + `plan_de_pago` (con plan ya
  aplicado, `tarjeta` + `gasto_del_mes`); deuda cara a plazo (personal, nómina o tasa ≥ 20 %) →
  `credito` + `simulador_meta`; portafolio desviado ≥ 5 puntos → `portafolio` + `rebalanceo` (sin
  desviación, `portafolio` + `salud`); lo demás → `gasto_del_mes` + `salud`. El encargo le dice al
  modelo cuáles son y `forzarFuentes` (`lib/widgets/pintar.ts`) las impone aunque pida otras,
  descartando las cifras de la conclusión que citen una tarjeta quitada (lo que siga sin poder
  leerse, como un campo que la tarjeta no tiene, lo quita `armarConclusion`: issue #34). Por qué: la escalera ya
  estaba en el prompt y el modelo chico se la saltaba (a Ana le pintó el rebalanceo con «tu
  portafolio requiere…»), y los jueces ven esta portada primero, en el celular. Verificado con el
  modelo real: Beto `ResumenTarjeta` + `PlanDePago`, Ana `ProyeccionPagoCredito` + `SimuladorMeta`,
  Carmen `DistribucionPortafolio` + `OrdenRebalanceo`; pruebas en `widgets-por-cuenta.spec.ts`.
- **Una pregunta ya no borra el pizarrón**: la barra y el botón «Preguntar sobre esto» de cada
  tarjeta van a `POST /api/inicio/widget`, que cambia UNA tarjeta en su lugar o contesta con una
  nota. `preguntarEnInicio` no se usa.

Todo el detalle está en [Widgets vivos](widgets-vivos.md) y en el
[ADR 0011](../decisiones/0011-cifras-solo-del-mcp.md). Una portada del modo anterior se considera
vencida en un servidor con el flag encendido (no tiene procedencias) y se rearma una vez.

### La consulta desde Inicio: el pizarrón que se borra

La barra de abajo (`BarraFlotanteMaya`) **era una maqueta**: el `onKeyDown` hacía
`e.preventDefault()` en Enter y nada más, y los dos botones decían `aria-label="…
(pendiente)"` sin `onClick`. Escribir y dar Enter no hacía absolutamente nada.

Ahora llama a la server action `preguntarEnInicio(pregunta)`, que:

1. valida la pregunta (3 a 300 caracteres) y que el Inicio personalizado esté activo;
2. corre `generarPortada(usuarioId, { pregunta })` —**el mismo motor** que la portada, con
   el mismo prefetch de datos, las mismas tools de apoyo y **cero tools de acción**; lo
   único distinto es el encargo (`encargoDeConsulta` en vez de `encargoDePortada`);
3. **reemplaza** la fila de `banorte.pantallas_inicio` con esa pantalla;
4. `revalidatePath("/")`, y el servidor vuelve a renderizar Inicio con el dashboard nuevo.

Y **se ve mientras pasa**: al dar Enter, las tarjetas que hay se van en cascada, un
esqueleto ocupa su lugar los ~8 s que tarda el modelo, y la pantalla nueva entra con el
mismo movimiento al revés. El estado ya no vive en la barra: lo publica
`ProveedorDeInicio`, que envuelve la pantalla completa. Está en
`docs/como-funciona/transicion-del-inicio.md`.

Dos decisiones que vale la pena entender:

- **Es una server action y no un `fetch` desde el navegador.** El resultado se guarda en la
  base, así que alguien tiene que decidir qué A2UI entra. Si el navegador armara la
  pantalla y la mandara a guardar, la base confiaría en entrada del cliente; aquí el turno
  corre en el servidor, pasa por las cuatro validaciones de `pintar_pantalla`, y el
  navegador solo manda el texto de la pregunta.
- **Se guarda con la huella de HOY.** Es lo que evita que el reloj borre tu consulta en el
  siguiente tick: mientras la cuenta no se mueva, la pantalla que pediste se queda. En
  cuanto se mueva de verdad (una acción, movimientos nuevos), el reloj rearma la portada de
  perfil —que es correcto: los datos que sostenían tu consulta ya cambiaron.

El encargo de consulta insiste en dos cosas que el modelo tiende a romper cuando ve una
pregunta: que conteste con **tarjetas** (no con `Text`) y que la primera sea `Conclusion`.
Sin la primera regla cae en prosa; sin la segunda, la respuesta queda sin veredicto.

### Una portada por dispositivo (ADR 0012)

Desde la migración 0007 la portada no es una por persona para todos: **cada visitante tiene la
suya en cuanto hace algo**. Mientras un dispositivo no ha aplicado nada, ve la portada común de
`pantallas_inicio` (la del reloj) y no cuesta modelo; si la común tiene acciones de un script,
ve la portada **sin acciones** que comparten todos los visitantes nuevos (el ámbito reservado
`dis_sinacciones00`, armada una vez por persona). Cuando aplica una acción, pregunta en la
barra o ajusta una tarjeta, su portada vive en `pantallas_por_dispositivo` y la común queda
intacta para los demás. Las cuatro puertas reciben `{ dispositivoId }` (la página, `/api/inicio`
y la acción lo leen de la cookie `maya_dispositivo`); el reloj solo rearma las tres comunes. La
huella cuenta las acciones **del dispositivo**. Detalle en `estado-por-dispositivo.md` y
`docs/algoritmos/portada-por-dispositivo.md`.

### Variables de entorno

| Variable | Default | Qué hace |
|---|---|---|
| `FEATURE_INICIO_PERSONALIZADO` | `1` | Con `0`, Inicio es la pantalla programada y no corre ningún modelo ni reloj |
| `MODELO_INICIO` | `gemini-3.5-flash-lite` | Id del modelo chico; `gemini-*` usa la llave de Google, `claude-*` la de Anthropic |
| `INICIO_CADA_MINUTOS` | `10` | Ritmo del reloj; mínimo 1 |
| `INICIO_RELOJ` | vacío | Vacío: el reloj corre solo con `NODE_ENV=production`. `1`: también en desarrollo. `0`: apagado en cualquier entorno |

Sin llave del proveedor o sin `DATABASE_URL`, `inicioActivo()` es `false` y todo se apaga
solo: la página no cambia, el reloj lo dice en el log y no arranca.

**Por qué el reloj no corre en `next dev` (issue #38).** `instrumentation.ts` registra el
intervalo una vez, con los módulos de ese momento, y el HMR actualiza las rutas pero no ese
intervalo. Como la base de desarrollo es la de producción, un `next dev` que arrancó antes de un
cambio en `lib/inicio/` seguía rearmando las portadas comunes con el prompt viejo cada 10 minutos
(el 2026-09-13 le volvió a pintar el portafolio a Ana en producción). `decisionDelReloj()` lo
arranca solo con `NODE_ENV=production`; en desarrollo las visitas, las acciones, la consulta y
`POST /api/inicio` rearman exactamente igual, solo falta el tick. El arranque lo deja en el log:
`{"inicio":"reloj","hecho":"apagado","motivo":"NODE_ENV=development: …"}` o
`{"inicio":"reloj","hecho":"prendido","motivo":"produccion","cadaMinutos":10,…}`. Pruebas:
`apps/web/src/lib/inicio/__tests__/reloj.spec.ts`.

### Lo medido (2026-09-12 15:20, local, modelo real, tras `reiniciar-estado`)

| Persona | Tarjetas | Tools | Entrada / caché / salida | Tiempo |
|---|---|---|---|---|
| Beto | `ResumenTarjeta` (héroe) · `PlanDePago` · `GastoPorCategoria` · `TermometroSaludFinanciera` | 7 (`simular_reestructura` y `proyectar_ahorro` prefetched) | 21 954 / 16 326 / 1 023 | 7.7 s |
| Ana | `ProyeccionPagoCredito` (héroe) · `DistribucionPortafolio` · `GastoPorCategoria` · `TermometroSaludFinanciera` | 4 | 23 985 / 16 329 / 1 768 | 11.6 s |
| Carmen | `DistribucionPortafolio` (héroe) · `GastoPorCategoria` · `TermometroSaludFinanciera` | 5 | 22 676 / 16 347 / 1 142 | 11.0 s |

> Estos números son **del último paso** de cada portada, no del total: hasta el 2026-09-13
> `generar.ts` leía `resultado.usage` (issue #17). Desde entonces `entrada_tokens` y
> `cache_tokens` guardan la suma de las 2-3 peticiones.

El caché del proveedor sirve ~16 300 tokens en cada portada: es el system prompt, que las
tres comparten. Lo que se paga por portada son ~6 000 tokens de entrada nuevos (los datos
de la persona) y ~1 500 de salida; con un modelo "lite" es una fracción de centavo, y
solo se paga cuando la cuenta se movió.

Antes del prefetch situacional, el modelo chico elegía las tarjetas que podía llenar con
lo que tenía (el portafolio de Ana) en vez de las que resolvían su situación (su crédito
al 27.9 %), y armaba dos tarjetas en vez de tres o cuatro. Con los datos en la mano y la
escalera en el encargo, las tres portadas salieron bien armadas (3 de 3, dos corridas).

### Cómo probarlo

```bash
pnpm --filter @maya/web test        # 31 pruebas de lib/inicio + 6 nuevas del agente, sin llave ni base
pnpm probar-inicio                  # las tres portadas con el modelo REAL (necesita pnpm dev y llave)
pnpm probar-inicio https://maya.157.173.204.174.sslip.io   # contra lo publicado (MCP_TOKEN del VPS)
```

- `huella.spec.ts`: la huella es la misma para los mismos datos y cambia con una acción,
  un movimiento, la versión del generador o el tamaño del catálogo.
- `generar.spec.ts`: pinta en un paso; pide una tool de apoyo y pinta en el siguiente;
  reintenta una pantalla inválida; devuelve el motivo si no pinta; y **nunca ejecuta una
  tool de acción**, aunque el modelo la pida.
- `servicio.spec.ts`: genera y guarda; con la misma huella no llama al modelo; con otra
  rearma; `forzar`; dos peticiones a la vez comparten una generación; si el modelo falla la
  anterior se queda; inactivo no toca nada.
- `inicio-pinta.spec.ts`: `InicioDeMaya` renderiza el `.jsonl` de ejemplo sin componentes
  desconocidos, con el saludo y las sugerencias, y **sin texto técnico** (ni modelo, ni
  tools, ni tiempos).

**En producción (2026-09-12 16:25, commit `5b9fbae`)**: el contenedor arrancó con
`{"inicio":"reloj","cadaMinutos":10,"modelo":"gemini-3.5-flash-lite"}` (desde el issue #38 la línea
lleva también `"hecho":"prendido","motivo":"produccion"`), la primera revisión
pasó de largo por los tres (`sin-cambios`, cero tokens: las portadas ya estaban en la base
compartida), y `GET /api/inicio?usuario=usr_beto` devolvió la portada de Beto rearmada por
producción después de una acción (`ResumenTarjeta` con plan activo, gasto, termómetro).

En el navegador (2026-09-12 15:35, Playwright a 1 440 y 390 px): la portada de Beto, la
programada con el aviso mientras se rearma y la llegada sola de la nueva, "Aplicar plan"
desde Inicio ejecutando la acción en Maya, y la portada rearmada con el plan activo al
volver. Sin errores de consola. Ver la bitácora de parlack.

### Casos límite conocidos

- **El modelo no entrega pantalla** (dos inválidas, timeout, proveedor caído): la anterior
  se queda con su huella vieja, así que sigue "desactualizada" y la siguiente puerta lo
  vuelve a intentar. Mientras, Inicio muestra la programada con el aviso; el aviso se rinde
  a los 90 s y la página queda como la de siempre.
- **`pnpm reiniciar-estado`**: no toca `pantallas_inicio`; cambia la huella (se van las
  acciones) y las portadas quedan desactualizadas solas. **Abre Inicio de cada persona
  después de reiniciar** o espera al reloj de producción (en local no hay reloj: abre Inicio o
  usa `pnpm probar-inicio`): es un paso del checklist.
- **Dos procesos contra la misma base** (local y producción): cada uno rearma cuando ve la
  huella distinta; el que llegue último gana, y los dos guardan una portada válida. Desde el
  issue #38 solo el de producción lo hace por su cuenta; el local solo rearma cuando alguien lo
  usa (visita, acción, consulta). El
  modelo no forma parte de la huella a propósito: dos entornos con `MODELO_INICIO`
  distinto se rearmarían uno al otro sin parar.
- **Cambiar el prompt de la portada o el catálogo**: sube `VERSION_DEL_GENERADOR` en
  `huella.ts` (o el catálogo crece solo) y las tres portadas se rearman en la siguiente
  revisión.
- **Un componente cuya `action` necesita algo que el componente no manda**: hoy no hay
  ninguno (todos ponen sus ids en el `context` al tocarse), pero si se agrega uno así, la
  `action` por default con `context: {}` lo dejaría sin dato. Declararla en el ejemplo
  `.jsonl` del componente es lo que enseña al modelo a ponerla completa.
