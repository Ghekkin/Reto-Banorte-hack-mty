---
verificado: 2026-09-12 01:55
estado: construido
---

# El motor A2UI propio (`packages/a2ui`)

Decisión en [ADR 0008](../decisiones/0008-renderer-a2ui-propio.md). Esto ya no es un
plan: son ~850 líneas de TypeScript, 109 pruebas y **los 76 casos de conformidad
oficiales de A2UI v0.9.1 en verde**.

## Para cualquiera

Maya no contesta con párrafos: arma la pantalla. Para eso necesita un idioma en el que
describir una pantalla, y ese idioma es **A2UI**, un protocolo abierto de Google. El
agente manda algo así como "quiero una tarjeta de confirmación, con este título y este
monto, y el monto sale de aquí"; esta pieza del sistema lee esa descripción, comprueba
que esté bien formada, y la convierte en componentes de verdad en pantalla, con nuestro
diseño. Cuando la persona toca un botón, le avisa al agente qué tocó y con qué datos.

Lo escribimos nosotros por dos razones. La primera es práctica: el renderer oficial
encapsula sus componentes de forma que nuestros estilos —la paleta de Banorte— no
entran. La segunda es que queremos poder explicar cada línea cuando un juez pregunte.

Lo que no inventamos es el protocolo. Usamos los archivos de validación oficiales de
A2UI, sin tocarlos, y pasamos su propia batería de pruebas. **El idioma es de Google;
el motor que lo habla es nuestro.**

## Técnico

### Estructura real

```
packages/a2ui/
  spec/                      copia literal de specification/v0_9_1 (Apache 2.0)
    v0_9_1/json/             server_to_client, client_to_server, common_types
    v0_9_1/catalogs/basic/   catalog.json oficial (18 componentes)
    v0_9_1/test/cases/       8 archivos, 76 casos de conformidad
  src/
    tipos.ts            los 5 mensajes, `propsDe`, `hijosFijos`, `Tema`
    validar.ts          la puerta: estructura + catálogo + schemas + árbol completo
    esquema.ts          ajv sobre los JSON Schema OFICIALES (punto de entrada aparte)
    procesar.ts         reducer puro (estado, mensaje) -> estado
    bindings.ts         JSON Pointer: `leer`, `escribir`, `borrar`, `resolver`
    arbol.ts            lista plana -> árbol; `componentesVisibles`
    registro.ts         Map<nombre, ComponenteReact>
    acciones.ts         `emitirAccion` con el context resuelto e idempotencia
    Superficie.tsx      pinta el árbol; resuelve `ancho`, `weight`, `accessibility`
    layout/             Column, Row, Text, Divider + sus nombres y sus schemas
  ejemplos/             .jsonl a mano (también sirven de fixture y de prompt)
```

Dos dependencias: `react` (peer) y `ajv` (+ `ajv-formats`). Sin Lit, sin `@a2ui/*`.

### El estado

```ts
type EstadoSuperficie = {
  id: string
  catalogId: string
  componentes: Map<string, Componente>   // por id, lista plana
  raiz?: string                          // "root", o el que nadie declara como hijo
  dataModel: Record<string, unknown>     // se actualiza por JSON Pointer
  theme?: Tema                           // lo que vino en createSurface
}
type Estado = Map<string, EstadoSuperficie>
```

`procesar` es un reducer puro: no hace fetch, no conoce React, se prueba con `.jsonl`.

### Los cuatro mensajes que entran

| Mensaje | Efecto |
|---|---|
| `createSurface { surfaceId, catalogId, theme? }` | Crea la superficie vacía y guarda el tema |
| `updateComponents { surfaceId, components[] }` | **Fusiona** por `id` y recalcula la raíz |
| `updateDataModel { surfaceId, path?, value? }` | `path` ausente o `"/"` = el modelo entero; **`value` ausente = borra** la llave (lo pide la spec) |
| `deleteSurface { surfaceId }` | Borra |

`updateComponents` fusiona, no reemplaza: así lo define la spec ("can be sent multiple
times to update the component tree"). Consecuencia que hay que tener presente:
`superficie.componentes` es la acumulación de la conversación, no la pantalla de ahora.
Quien necesite saber qué está viendo la persona usa **`componentesVisibles()`**, que
recorre desde la raíz (fue el [issue #3](https://github.com/Ghekkin/Reto-Banorte-hack-mty/issues/3)).

### Bindings

Una prop es un valor literal o `{ "path": "/tarjeta/saldoCentavos" }`. `resolver`
sustituye cada `{path}` antes de que el componente lo vea: **el componente recibe
números y strings, no sabe que existe A2UI**. Paths absolutos contra el data model; un
path relativo se resuelve contra el ítem de la plantilla, que es lo que permite repetir
un componente por cada elemento de una lista.

Si el path no existe todavía → `undefined`, y el componente pinta su estado de carga.
Eso no es un descuido: es lo que permite mandar la estructura primero y los datos
después, y que la pantalla se vea armarse mientras las tools responden.

### El árbol

`arbol(superficie)` parte de `root` (lo exige la spec) y sigue `children` / `child`. Un
`children: { componentId, path }` se repite por cada elemento de la lista. Un id que no
existe se ignora con aviso; un ciclo se corta. Las claves de React incluyen el camino
(`root/plan#2`), así que una lista que cambia no remonta todo.

### Las cuatro validaciones, y quién paga cada una

`validarMensaje(mensaje, opciones)` es la única puerta. Ninguna línea toca el estado sin
pasar por aquí, ni en el cliente ni al salir del agente.

| Cerco | Qué mira | Quién lo usa |
|---|---|---|
| Estructura | versión, un solo verbo por mensaje, ids únicos, forma de `children` | todos, siempre |
| Catálogo por nombre (`nombres`) | el componente existe en el registro | el cliente (en el navegador, sin ajv) |
| Schemas oficiales (`esquema`) | cada prop de cada componente, contra `spec/v0_9_1/` | el agente, en el servidor |
| Árbol completo (`arbolCompleto`) | existe `root` y ningún hijo es fantasma | el agente, que manda la pantalla entera |

Los dos últimos son opcionales **a propósito**: la spec permite mandar una pantalla en
varios `updateComponents`, así que exigir la raíz en cada mensaje sería más estricto que
el estándar. Lo pide quien sabe que manda todo junto.

`esquema.ts` vive en su propio punto de entrada (`@maya/a2ui/esquema`) y **no** se
re-exporta desde el índice: arrastra ajv y ~50 KB de schemas que el navegador no
necesita. El detalle del algoritmo —incluido por qué no entramos por el `oneOf` de
arriba— está en [Validación A2UI](../algoritmos/validacion-a2ui.md).

### El catálogo es un JSON Schema de verdad

`packages/catalogo/catalogo.json` se genera desde los schemas Zod (`pnpm catalogo`) con
**la misma forma que el catálogo básico de la spec**: `components` por nombre,
`$defs.anyComponent` con `discriminator`, `unevaluatedProperties: false`,
`$defs.anyFunction` y `$defs.theme` (los tres que la spec referencia por nombre).

Eso es lo que hace posible el cerco de arriba: `server_to_client.json` referencia
`catalog.json#/$defs/anyComponent` con una ref **relativa**, o sea que la spec deja un
hueco con forma de catálogo. Metemos el nuestro en ese hueco y el validador oficial
valida nuestros componentes. Cada prop se publica como
`anyOf: [<el schema de Zod>, DataBinding]`, porque cualquier prop acepta un enlace.

Los cuatro de layout se publican en el mismo catálogo y por eso aceptan las dos props
comunes (`ancho` y `razon`) aunque no hagan nada con `razon`: si el catálogo los anuncia,
el modelo los trata como componentes del catálogo y les pone la `razon` que el prompt
exige. Rechazar la pantalla completa por una frase decorativa en un `Text` es un mal
negocio; se acepta y se ignora, y el prompt dice que no la lleven.

Se sirve en `/catalogo/v1.json` y es el `catalogId` de cada `createSurface`: **un juez
puede abrirlo**. En producción el route reescribe `$id`/`catalogId` con `URL_CATALOGO`;
el archivo del repo siempre sale con la URL de desarrollo para que el CI pueda exigir
que no cambie.

### El registro: el error que no perdona

El registro es un `Map` en memoria del bundle. **Todo módulo que pinte un
`<Superficie>` tiene que haberlo llenado**: `registrarLayout()` + `registrarCatalogo()`,
o en `apps/web` la función única `registrarComponentes()`
(`apps/web/src/lib/registrar-componentes.ts`), que las llama a las dos y es idempotente.

Si no se llena, **nada** se pinta: cada componente cae en `Desconocido`, incluido
`Column`. El 2026-09-12 a las 09:20 pasó exactamente eso — la galería (`/catalogo`)
registraba y el lienzo de la demo no, así que la galería se veía perfecta y la consola
no pintaba una sola tarjeta. El síntoma engaña: doce mensajes distintos de "X no está en
el catálogo de esta superficie", uno por componente, y ninguno dice que el problema es
el registro.

Tres cosas lo cierran ahora:

- una sola función de registro para los dos hosts, en un solo archivo;
- `<Superficie>` grita en consola si el registro está **vacío** y algo falló, con la
  instrucción exacta (no es "falta un componente", es "nadie llenó el registro");
- dos pruebas en `apps/web/src/lib/__tests__/`: una exige que importar el lienzo deje los
  12 nombres registrados, y otra **renderiza el lienzo de verdad**
  (`renderToStaticMarkup`) con el `.jsonl` de ejemplo y exige HTML con contenido y cero
  "Componente desconocido". Un mensaje válido que nadie sabe pintar se veía igual que un
  mensaje roto; ahora no.

### Lo que el renderer resuelve por todos los componentes

Son llaves de la spec que son de todos, y nadie debería tener que acordarse de ellas al
escribir un componente nuevo:

| Llave | Qué hace `Superficie.tsx` |
|---|---|
| `ancho` (`"normal" \| "amplio"`) | `data-ancho` en la envoltura, que es lo que la rejilla bento lee para dar dos columnas |
| `weight` | `flex-grow` dentro de un `Row`/`Column`: así se arma una rejilla en A2UI |
| `accessibility` | `aria-label` / `aria-description` y `role="group"` |
| `theme.primaryColor` | `variablesDelTema()` lo entrega como variable CSS; la shell decide dónde aplicarlo |

La envoltura solo aparece si hay algo que poner en ella, y es un `grid` para que el
componente siga estirándose al alto de su fila.

**Nota de layout, para quien arme pantallas**: la spec exige una sola raíz, así que una
pantalla de varias tarjetas necesita un contenedor. Un `Column` raíz ocupa una sola
celda de la rejilla bento y apila todo en vertical; para el efecto bento, la forma
A2UI-nativa es un `Row` raíz con `weight` por tarjeta, o `Row`s anidados dentro de un
`Column` (es literalmente lo que recomienda la descripción oficial de `Column`).

### Acciones: el ciclo se cierra

Un componente declara `action: { event: { name, context } }`. Al dispararse,
`emitirAccion` resuelve cada `{path}` del `context` contra el data model y agrega
`idempotencyKey = conversacionId + ":" + timestamp`:

```json
{ "name": "aplicar_plan_pago", "surfaceId": "principal",
  "sourceComponentId": "plan", "timestamp": "…",
  "context": { "plazo": 18, "tarjetaId": "tar_beto_clasica", "idempotencyKey": "…" } }
```

Eso va al `POST /api/agente` como `accion`, por la misma puerta que un mensaje escrito.
El componente no hace nada más: ni fetch, ni estado local. Espera la UI nueva.

Solo emitimos `event`, nunca `functionCall` (la spec admite los dos). Es una decisión:
quien decide es el agente, y una UI que se arregla sola por dentro es una UI que el
agente ya no entiende.

El canal de vuelta de errores de la spec (`VALIDATION_FAILED` en
`client_to_server.json`) está **conectado**: `<Superficie alFallar>` lo emite cuando llega
un componente que el registro no conoce; el lienzo lo pasa a `reportarFallo` del hook
`usar-agente`, que lo manda al `POST /api/agente` como `error` (un turno más), y el agente
recibe en su contexto qué falló y la instrucción de repintar sin ese componente. Es la
respuesta a "¿y si el modelo se equivoca?": se corrige en el siguiente turno, solo.

Dos cosas que evitan que eso se vuelva un bucle: el aviso sale en un `useEffect`, **no
durante el render** (un aviso en fase de render que provoque `setState` se cicla), y el
mismo fallo se avisa **una sola vez** por vida del componente, así que un reintento que
vuelve a fallar igual no rebota entre la interfaz y el agente.

### Frontera de error: un componente roto no tumba la pantalla

Cada componente se pinta dentro de `FronteraDeError` (una clase con
`getDerivedStateFromError`, porque React solo permite atrapar errores de render así). Si
uno truena al pintar (una prop con la forma equivocada, un `undefined` donde iba un
arreglo), en su lugar aparece "Esta tarjeta no se pudo mostrar" con el nombre del
componente y el mensaje, y **el resto de la superficie sigue en pie**, incluida la barra
de conversación. Antes, un componente roto tumbaba la pantalla entera en plena demo.

Este caso **no** se reporta al agente: el JSON era válido, el fallo es del componente.
Se prueba en `frontera-de-error.test.tsx` con un DOM real (`happy-dom` + `createRoot`),
aparte de los demás, porque React no ejecuta error boundaries al renderizar en servidor
y `renderToStaticMarkup` deja pasar el error tal cual.

### Lo que NO implementamos, y por qué

- **14 de los 18 componentes del catálogo básico** (Image, Video, AudioPlayer, Tabs,
  Modal, TextField, CheckBox, ChoicePicker, Slider, DateTimeInput…). El reto pide
  componentes propios; el catálogo básico solo aporta el layout. Los schemas oficiales
  siguen ahí para los casos de conformidad.
- **`functionCall` y los `checks`** del catálogo básico. Ver arriba.
- **`sendDataModel`**: se acepta en el mensaje y se ignora; el contrato ya manda el data
  model en cada petición.
- **Superficies secundarias**: el estado es un `Map` y las soporta; la demo usa una.

### Cómo se prueba

```bash
pnpm --filter @maya/a2ui test        # 112: 35 del motor + 76 de conformidad + 1 de la frontera de error
pnpm --filter @maya/catalogo test    # 47: la cadena completa de cada componente
pnpm --filter @maya/web test         # 31: el agente, y que el lienzo PINTE
pnpm catalogo                        # regenera catalogo.json desde los schemas
```

Las del catálogo son la red de quien agrega un componente: que el catálogo publicado lo
describa, que el renderer lo tenga registrado, que exista su `.jsonl` de ejemplo y que
ese ejemplo **valide de verdad** contra los schemas oficiales. Olvidar un paso falla en
dos segundos en vez de en la demo.

Y las tres de `apps/web/src/lib/__tests__/` cubren el hueco que quedaba: que el lienzo
de la demo **pinte**. Todo lo demás se probaba con mensajes —que validen, que el reducer
los aplique—, y un mensaje válido que nadie sabe pintar se ve igual que un mensaje roto.

Verificado a mano el 2026-09-12 09:35, con llave y MCP arriba: "Quiero pagar menos
intereses" (usr_beto) → 2 tools, 3 pasos, 5.0 s → `Column` + `ResumenTarjeta` (héroe) +
`PlanDePago`, cero errores. Y la acción `aplicar_plan_pago` → `Confirmacion` +
`ResumenTarjeta` con `planActivo: true` y `diasMora: 0` + `Calendario`, en 4.6 s. Los
tres pasos del reto, cerrados.

### Criterios de aceptación del ADR 0008

- [x] Los casos de conformidad de `spec/v0_9_1/test/cases/` pasan contra la validación
      oficial: **76 de 76**, incluyendo los que deben ser rechazados.
- [x] Reducer con los 4 mensajes, bindings absolutos y relativos, árbol de 3 niveles,
      plantillas, rechazo de un componente inexistente.
- [x] `ejemplos/confirmacion.jsonl` pinta dentro del lienzo de `apps/web` (verificado
      por HTTP: `POST /api/agente` devuelve los tres mensajes y el lienzo los pinta).
- [x] Tocar una acción produce el `action` con el `context` resuelto.
- [x] Un mensaje con `component: "NoExiste"` no toca el estado y se ve el error.
- [x] Cero warnings de hidratación.
- [ ] `ejemplos/plan-de-pago.jsonl` pinta `PlanDePago`: **falta el componente** (rol
      `web`). El ejemplo ya está escrito y el motor lo valida en cuanto exista.

### Para la pregunta del jurado

> "Implementamos un renderer conforme a A2UI v0.9.1. No validamos contra nuestra idea
> del protocolo: cargamos los JSON Schema oficiales de la especificación y pasamos sus
> 76 casos de conformidad. Y como la spec referencia el catálogo con una ref relativa,
> publicamos el nuestro con esa misma forma: el validador oficial de Google valida
> nuestros componentes financieros. Así el sistema de componentes es 100 % nuestro,
> como pide la regla 1 del reto, y el protocolo es el estándar de verdad."

## Por qué no `@a2ui/react` (sigue vigente)

| | Oficial | Propio |
|---|---|---|
| Fidelidad a la spec | Total | Total: mismos schemas, 76/76 casos |
| Estilos shadcn/Banorte | En riesgo (Lit/shadow DOM) | Garantizados |
| Next App Router | Incierto | Sin sorpresas |
| Riesgo en la demo | Paquete en preview | Código nuestro, 2 dependencias |
| Regla 1 del reto | Parcial | Completa |
