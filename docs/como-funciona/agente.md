---
verificado: 2026-09-12 01:19
estado: construido
---

# El agente: interpretar, construir la pantalla, ejecutar

## Para cualquiera

Esta es la pieza que hace que el producto sea lo que el reto pide. La persona escribe
algo como "quiero pagar menos intereses de mi tarjeta", y el agente hace tres cosas, en
orden:

1. **Entiende con quién está hablando.** No contesta de memoria: le pregunta al servidor
   de datos quién es, cuánto debe, cómo gasta. La misma frase de dos personas distintas
   lleva a dos conversaciones distintas.
2. **Arma la pantalla.** En vez de escribir un párrafo, describe una interfaz: qué
   tarjetas, con qué números y con qué botones. Esa descripción viaja al navegador y se
   pinta con nuestros componentes. Y viene con una línea que explica **por qué** esa
   pantalla y no otra.
3. **Ejecuta.** Cuando la persona toca un botón, eso vuelve al agente como si fuera otro
   mensaje. Si el botón cambia algo de verdad, el agente lo ejecuta y vuelve a armar la
   pantalla, ahora con el resultado. Ahí se cierra el ciclo: lo que tocaste cambió tus
   datos, y tus datos cambiaron lo que ves.

Si el agente describe una pantalla que no se puede pintar —un componente que no existe,
un número donde iba un texto— no llega al navegador: se le devuelve el error y la corrige.
Nunca se le pide al usuario que entienda un JSON roto.

## Técnico

### Dónde vive

| Pieza | Ruta |
|---|---|
| Endpoint | `apps/web/src/app/api/agente/route.ts` (`POST /api/agente`, JSONL) |
| El turno | `apps/web/src/lib/agente/agente.ts` → `correrTurno()` |
| Modelo | `apps/web/src/lib/agente/modelo.ts` (Vercel AI SDK) |
| Cliente MCP y puente de tools | `apps/web/src/lib/agente/mcp-cliente.ts` |
| Entrega de la interfaz | `apps/web/src/lib/agente/pantalla.ts` → `pintar_pantalla` |
| System prompt | `apps/web/src/lib/agente/prompt.ts` |
| Historial y contexto | `apps/web/src/lib/agente/historial.ts` |
| Turno de ejemplo sin llave | `apps/web/src/lib/agente/mock.ts` |
| Contrato con el cliente | `docs/arquitectura/contrato-agente-cliente.md` |

### El turno, paso a paso

1. `route.ts` valida el cuerpo con `esquemaPeticion` (Zod, en `tipos.ts`): un cuerpo mal
   formado devuelve **400 con el detalle**, no un stream que muere a medias. Luego abre el
   stream JSONL y le pasa `request.signal`: si la persona cierra la pestaña, el turno se
   corta y no se siguen llamando tools (ni, peor, una acción) para nadie. No hay estado
   en el servidor.
2. `correrTurno` emite `estado: pensando` y, si **no hay llave de modelo**, sirve el turno
   de ejemplo (`mock.ts`) y termina: `main` arranca sin `.env` (regla 4 del repo).
3. Abre una conexión MCP (`conectarMcp`) y traduce las tools del servidor a tools del AI
   SDK con `herramientasDelMcp`. Se usa `dynamicTool` porque el schema lo publica el MCP
   en tiempo de ejecución: **agregar una tool al MCP no toca el agente**.
4. `streamText` corre el bucle: el modelo llama tools, el SDK las ejecuta, el modelo
   vuelve a decidir. Tope de `AGENTE_MAX_PASOS` (8) y `abortSignal` de 30 s.
5. Entregar la interfaz **también es una tool**: `pintar_pantalla`. El modelo la llama con
   la razón, la frase de cierre, los componentes y el data model.
6. `armarMensajes` convierte eso en los tres mensajes A2UI del turno y los valida. Si algo
   está mal, el modelo recibe la lista de errores como resultado de la tool y lo corrige
   (un reintento; al segundo fallo se contesta en prosa).
7. El turno termina en cuanto hay una pantalla válida (`stopWhen`), y el stream cierra con
   `texto`, `razon`, `sugerencias` y `fin`.

### Por qué la pantalla es una tool y no la respuesta del modelo

Tres razones prácticas:

- **El reintento sale gratis.** Un JSON inválido es un resultado de tool con errores, y el
  bucle del AI SDK ya sabe qué hacer con eso. No hay que escribir un segundo camino.
- **Un solo mecanismo.** El modelo hace todo con llamadas a tools: pedir datos, ejecutar
  acciones y entregar la interfaz.
- **Nada sale sin validar.** `pintar_pantalla` es la única puerta de salida de A2UI.

Los componentes viajan como **texto JSON** dentro de la llamada, no como un schema
estricto. Un "arreglo de componentes con props planas y distintas por componente" no se
puede expresar en un schema que los dos proveedores acepten igual; con texto más la
validación de abajo el contrato se cumple exactamente igual y no dependemos de las rarezas
de cada API. La validación de verdad está en `armarMensajes`.

### Las cinco validaciones de `armarMensajes`

1. **Estructura A2UI**: `validarMensaje` de `packages/a2ui`, la misma puerta que usa el
   cliente (versión, un solo verbo por mensaje, ids únicos, forma de `children`).
2. **Catálogo**: todo `component` tiene que estar en `nombresPermitidos()` = los nombres
   de `packages/catalogo` más el layout básico (`Column`, `Row`, `Text`, `Divider`).
3. **Árbol**: tiene que existir el componente `root`, y todo hijo declarado tiene que
   existir en la lista. Un hijo fantasma es un hueco invisible en la pantalla.
4. **Props**: contra el schema Zod de cada componente del catálogo. Las props enlazadas
   (`{ "path": "/…" }`) no se validan por valor —eso lo resuelve el cliente contra el data
   model—, y si al modelo se le olvidó la prop `razon` en un componente, se le pone la del
   turno en vez de rechazar la pantalla entera por una frase.
5. **Los JSON Schema oficiales de A2UI**, con nuestro catálogo dentro
   (`crearValidador` de `@maya/a2ui/esquema`). Es el cerco que no tiene opinión nuestra:
   los mismos schemas de `spec/v0_9_1/` que validan el catálogo básico de Google validan
   `Confirmacion`. Va al final porque los pasos 3 y 4 dan mejores mensajes para lo suyo
   (y el 4 completa la `razon`); este atrapa lo que ninguno mira: una prop inventada, una
   forma mal anidada, un `action.event.name` que el catálogo no declara. Cuando entra un
   componente nuevo, queda validado sin que nadie escriba una regla.
   Ver [Validación A2UI](../algoritmos/validacion-a2ui.md).

### El último paso se reserva para pintar

El turno tiene un tope de pasos (`AGENTE_MAX_PASOS`, 8 por defecto) y **los dos últimos
están reservados**: al llegar ahí, `prepareStep` fuerza `toolChoice` sobre
`pintar_pantalla`. Uno para pintar y uno de gracia si la primera entrega viene inválida.

No es teórico. El 2026-09-12 con *"simula mi fondo de emergencia"* el modelo llamó
`proyectar_ahorro` seis veces —las dos primeras con argumentos que la tool rechazaba— y
se quedó sin pasos: la persona recibió *"No pude armar la pantalla esta vez"* después de
17 segundos. Más vale una pantalla con lo que ya sabe que una disculpa.

Del mismo ensayo salieron otras tres reglas, todas en el prompt: **pedir las tools del
mismo paso juntas** (se ejecutan en paralelo; a Carmen le bajó el turno de 22.5 s a
4.5 s), **no repetir una tool con los mismos argumentos**, y **leer el `error` de una
tool en vez de reintentar igual**.

### El prompt caching, y por qué el orden de los mensajes no es cosmético

Los dos proveedores cachean por **coincidencia de prefijo**: el primer byte que cambia
invalida todo lo que sigue. De ahí el orden que arma `mensajesDelTurno`:

1. el **system prompt** como primer mensaje —lo grande: el catálogo entero con sus
   schemas y los ejemplos—, con el breakpoint `cacheControl: ephemeral` que Claude
   necesita (Gemini cachea el prefijo estable solo, sin que se le pida);
2. el **historial**, que solo crece: los turnos viejos viajan byte por byte iguales;
3. el **bloque de contexto del turno**, lo único volátil (quién pregunta, qué hay en
   pantalla, el data model), al final y por eso fuera del prefijo cacheado.

Si alguien mete la fecha, el `usuarioId` o el data model arriba, el caché deja de pegar
y **nadie se entera**: el turno solo sale más caro y más lento.

### Qué está probado del caché, y qué no se puede saber sin cuota

Cinco pruebas en `apps/web/src/lib/__tests__/cache-prefijo.spec.ts` miran **los bytes que
salen**, no la intención:

| Lo que se exige | Por qué |
|---|---|
| El system prompt es byte por byte el mismo en las dos peticiones del turno | es el 45 % del prefijo |
| Las tools van en el **mismo orden** | el orden es parte del prefijo; un `Object.keys` inestable lo rompe |
| La segunda petición **arranca con la primera completa** | es *la* propiedad del caché: lo nuevo va al final |
| El prefijo es idéntico **para otra persona y otro turno** | si no, el caché se invalida en cada turno |
| El `cache_control` de Claude sale **en el cuerpo HTTP**, sobre el system prompt y con lo volátil fuera | el caché de Anthropic es explícito: sin eso no cachea nada. Se comprueba interceptando el `fetch` del proveedor, sin llamar a la API |

Con eso, **nuestro lado es correcto y está fijado**.

**Medido con el modelo real el 2026-09-12 a las 12:10**, con la cuota ya ampliada:

| Turno | Entrada | Desde caché | |
|---|---|---|---|
| Beto, "quiero pagar menos intereses" | 20,336 | **16,276** | 80 % |
| El mismo, repetido | 20,336 | **16,276** | 80 % |
| **Ana**, la misma pregunta (otra persona) | 23,415 | **20,341** | 87 % |
| Beto, **segundo turno** de la conversación | 21,442 | **16,276** | 76 % |

El prefijo compartido —system prompt + definiciones de tools, ~16,000 tokens— se reusa
**entre personas y entre turnos**, que es exactamente el diseño. Google cobra los tokens
cacheados con descuento. La latencia no mejora de forma consistente (5.8–7.7 s con caché
en turnos equivalentes), así que el beneficio medido es de costo, no de velocidad.

**Lo que no se sabe:** en los 55 turnos de la mañana el caché reportó **cero**, con la
misma forma de petición. Un A/B descartó la única diferencia de código que tocaba la
petición (`allowSystemInMessages`: sin ella el caché pega igual, 16,276). El cambio fue del
lado de Google y la causa no se puede determinar desde aquí. Por eso el log de cada turno
trae `entrada`, `salida` y `cache`: si vuelve a caer a cero, se nota en el siguiente turno
en vez de en la factura.

### El texto que acompaña la pantalla es un consejo, no una etiqueta

`texto` son de una a tres frases con el dato clave **y la recomendación**: no describe la
pantalla ("aquí tienes tu gasto" no le sirve a nadie), dice qué haría Maya en su lugar.
Sale así del ensayo del guion: *"Tus retiros en efectivo subieron 74.7 % y llegaron a
$4,601. Si los moderas a su nivel habitual de $2,600, liberas casi $2,000 al mes para
cubrir tu plan sin presiones."*

### La superficie se rearma completa en cada turno

El agente emite siempre los tres mensajes: `createSurface` + `updateComponents` con la
lista entera + `updateDataModel` en `/` con el data model entero. `procesar()` fusiona
componentes por id, así que un update parcial dejaría vivos los componentes de la pantalla
anterior y la interfaz mentiría. Rearmar es más simple y más predecible, y el resultado
visual es el mismo porque siempre se manda el árbol completo.

### Lo que el agente fuerza, y no le pide al modelo

En `mcp-cliente.ts`, antes de llamar cualquier tool:

- **`usuarioId` es siempre el del turno.** Si el modelo escribe otro, se corrige. Es lo que
  garantiza que Maya no pueda leer los datos de otra persona.
- **Las tools de acción reciben la `idempotencyKey` de la interfaz** si el modelo no la
  puso. Las acciones se detectan por la anotación MCP `readOnlyHint: false`.

Y en `pantalla.ts`, al armar los mensajes:

- **La `action` por default.** Un componente con botón y sin `action` es un botón apagado.
  Si el catálogo declara `acciones` para ese componente y el modelo no puso ninguna, se le
  pone la primera con `context: {}` (todos los componentes ponen en el `context` lo que su
  acción necesita al tocarse). Si el modelo la declaró, se respeta tal cual.
- **Comas colgantes.** `parsear` hace un tercer intento quitando las comas antes de `}` o
  `]` (sin tocar cadenas): el error de sintaxis más común de un modelo chico en un JSON
  largo. El fragmento alrededor del error va al log.

Los dos nacieron con el Inicio personalizado (`inicio-personalizado.md`), que usa este
mismo `armarMensajes` con un modelo más chico, pero valen para la conversación.

Al cerrar un turno en el que una tool de acción aplicó algo, `correrTurno` llama
`opciones.alMutar(usuarioId)`. El agente no sabe quién escucha; la ruta lo conecta con el
Inicio personalizado (`after(() => regenerarSiCambio(usuarioId, "accion"))`).

### Modelo y proveedor

`MODELO=gemini` (default) → `google("gemini-3.1-flash-lite")` con
`thinkingConfig.thinkingLevel` desde `GEMINI_THINKING`; `MODELO=claude` →
`anthropic("claude-sonnet-5")` (ADR 0005). Nada más en el código sabe cuál es el modelo.
Sin llave, el agente sirve el turno de ejemplo y lo dice en el stream.

### Errores

| Qué pasó | Qué sale en el stream |
|---|---|
| Una tool del MCP falló | `tool` con `ok: false` y `error { codigo: "tool" }`; el modelo lo ve y decide |
| A2UI inválido | `error { codigo: "a2ui" }` y un reintento; al segundo fallo, `texto` en prosa |
| El proveedor contestó mal | `error { codigo: "modelo" }` + `texto` + `fin` |
| El turno pasó de 30 s | `error { codigo: "timeout" }` + `texto` + `fin` |
| La persona cerró la pestaña | se corta sin inventar respuesta; solo `fin` |
| No se pudo conectar al MCP | `error { codigo: "tool" }` con la URL + `texto` + `fin` |

El stream **siempre** termina en `fin`: la interfaz nunca se queda esperando.

Un detalle del AI SDK que costó un bug: cuando se dispara el `abortSignal`, `streamText`
**no lanza**: emite una parte `abort` y cierra el stream. Sin un `case "abort"`, un
timeout se reportaba como "el modelo no entregó pantalla", que manda a buscar el problema
en el lugar equivocado. La prueba `cortes del turno` lo cubre con un modelo que se cuelga.

### Cómo probarlo

```bash
pnpm --filter @maya/web test   # 26 pruebas del agente, sin llave y sin red
```

- `__tests__/agente.spec.ts` corre el bucle completo con un modelo simulado del AI SDK
  (`MockLanguageModelV2`): tool → pantalla → stream, el reintento de una pantalla
  inválida, el tope de pasos, y las validaciones una por una.
- `__tests__/proveedor.spec.ts` arma el proveedor real de Google con las 9 tools del MCP e
  intercepta el `fetch`: comprueba que las declaraciones que iban a salir no traen las
  llaves que la API de Gemini rechaza (`$schema`, `additionalProperties`…) y que un 401
  deja el turno cerrado con `error` + `fin`.

Con llave, la prueba de verdad es el nivel 4 de la skill `probar`: los prompts de
`docs/demo/prompts.txt` produciendo la interfaz esperada.

### Los ejemplos van en el prompt

`prompt.ts` → `ejemplosEnTexto()` lee `packages/catalogo/ejemplos/*.jsonl` una vez por
proceso y los mete al system prompt como few-shot, solo los que usan componentes que
existen en el catálogo. Son los mismos archivos que `catalogo.spec.ts` valida contra los
schemas oficiales: si un ejemplo está mal, truena una prueba antes de que el modelo lo
aprenda. Con los 8 componentes en `CATALOGO`, el agente ya puede pintar el viaje completo
del ADR 0004 (`docs/como-funciona/catalogo.md`).
