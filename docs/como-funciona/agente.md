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

### Modelo y proveedor

`MODELO=gemini` (default) → `google("gemini-3.8-flash")` con
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

### Lo que falta (rol `web`)

El agente solo puede pintar lo que existe en `packages/catalogo`: hoy `Confirmacion` más el
layout. En cuanto lleguen los otros 7 componentes, el prompt y la validación los toman
**solos** (los dos leen `CATALOGO`): no hay que tocar el agente.
