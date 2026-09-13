---
verificado: 2026-09-12 01:19
estado: construido      # el endpoint, el stream y el agente existen; falta el nivel 4 de `probar` con llave
---

# Contrato agente ↔ cliente

El archivo que `web` y `contrato` construyen desde lados opuestos. Si algo de aquí
cambia, cambia con la skill `cambiar-schema`: los dos lados en el mismo commit.

## Para cualquiera

La página le manda al agente lo que la persona escribió (o el botón que tocó) y quién
es; el agente contesta con una descripción de pantalla en A2UI, que la página pinta con
nuestros componentes. Cuando la persona toca algo, la página manda ese toque al agente
como si fuera un mensaje más, y el agente vuelve a describir la pantalla. Nada de esto
se guarda en el servidor: cada petición lleva todo lo necesario.

## Técnico

### Endpoint

`POST /api/agente` — en `apps/web/src/app/api/agente/route.ts`. Respuesta en **streaming
JSONL** (`Content-Type: application/x-ndjson`), una línea por mensaje.

`GET /api/agente` — las capacidades del servidor según `server_capabilities.json` de la
spec A2UI: el único catálogo que este agente sabe generar (`URL_CATALOGO`) y
`acceptsInlineCatalogs: false`. Es el handshake de A2UI reducido a lo que un cliente
ajeno necesita saber antes de hablar. Lo arma `capacidadesDelServidor()` en `tipos.ts`.

### Petición

```jsonc
{
  "usuarioId": "usr_beto",              // quién es; lo pone el selector de la cabecera
  "conversacionId": "c_01J...",         // ulid generado en el cliente al iniciar
  "mensajes": [                         // historial compacto, solo texto
    { "rol": "usuario", "texto": "Quiero pagar menos intereses de mi tarjeta" },
    { "rol": "agente",  "texto": "Te muestro tres planes para tu saldo de $18,400." },
    { "rol": "accion",  "texto": "aplicar_plan_pago { plazo: 18 }" }   // acciones previas, resumidas
  ],
  "accion": {                           // opcional: el action A2UI del último toque, tal cual
    "name": "aplicar_plan_pago",
    "surfaceId": "principal",
    "sourceComponentId": "btn_aplicar",
    "timestamp": "2026-09-13T01:12:00Z",
    "context": { "plazo": 18, "tarjetaId": "tdc_beto" }
  },
  "error": {                            // opcional: la interfaz no pudo pintar algo del turno anterior
    "code": "VALIDATION_FAILED",        // el único código, el de client_to_server.json
    "surfaceId": "principal",
    "path": "/components/2",
    "message": "componente 'Grafica' no está en el catálogo"
  },
  "superficie": {                       // opcional: estado actual de la superficie
    "surfaceId": "principal",
    "componentes": ["ResumenTarjeta", "PlanDePago"],
    "arbol": [                          // opcional: los componentes TAL CUAL se emitieron
      { "id": "root", "component": "Column", "children": ["resumen", "plan"] },
      { "id": "plan", "component": "PlanDePago", "opciones": { "path": "/opciones" }, "razon": "…" }
    ],
    "dataModel": { "tarjeta": { "saldo": 1840000 }, "planElegido": 18 }
  },
  "clientCapabilities": {               // opcional: client_capabilities.json; qué catálogos pinta el cliente
    "v0.9": { "supportedCatalogIds": ["https://…/catalogo/v1.json"] }
  }
}
```

Reglas:
- `mensajes` lleva **texto**, nunca JSON A2UI: el historial se mantiene chico y el
  modelo no reprocesa pantallas viejas. Una acción previa se resume en una línea
  `rol: "accion"`.
- El turno lo dispara **uno** de tres: `mensajes[último].rol === "usuario"`, `accion`
  presente, o `error` presente. Si vienen varios, `error` manda sobre `accion` y
  `accion` sobre el texto.
- `error` es el canal de vuelta de la spec (`VALIDATION_FAILED`): el renderer no supo
  pintar un componente, lo reporta **una sola vez** (ver `renderer-a2ui.md`) y el
  agente recibe en su contexto qué falló y la instrucción de repintar la misma
  pantalla sin ese componente. El cliente lo resume además como una línea
  `rol: "accion"` en el historial. Lo dispara `reportarFallo` en `usar-agente.ts`.
- `clientCapabilities` es opcional y nuestro cliente no lo manda (habla nuestro
  catálogo por construcción). Si un cliente lo manda y **no** incluye `URL_CATALOGO`,
  la respuesta es **400** `{ error: "catalogo no soportado" }`: mejor decirlo que
  mandarle una pantalla que no sabe pintar.
- `superficie.dataModel` es lo que el cliente tiene ahora; el agente lo usa como
  contexto, no lo copia de vuelta.
- `superficie.componentes` son los **nombres** de lo visible; `superficie.arbol`, los componentes
  completos —id, props con sus enlaces `{ path }`, `children`, `action`—. Los dos salen de
  `componentesVisibles(superficie)`: lo alcanzable desde la raíz, **no** el `Map` de la superficie,
  que acumula la conversación entera (issue #3).
  `arbol` es **opcional y habilita `ajustar_pantalla`**: sin él el agente no puede nombrar lo que ya
  está en pantalla y su única salida es `pintar_pantalla`. Van completos y no solo las props porque
  `updateComponents` reemplaza el componente por id: para parchear una prop hay que volver a mandar
  el resto. Tope: 60 componentes.
- El cuerpo se valida con `esquemaPeticion` (`apps/web/src/lib/agente/tipos.ts`); lo que
  no cumple devuelve **400** con `{ error, detalle[] }` antes de abrir el stream. Topes:
  40 mensajes, 4 000 caracteres por mensaje, `usuarioId` con el patrón `usr_…`.

### Respuesta (JSONL, en orden)

```jsonl
{"tipo":"estado","valor":"pensando"}
{"tipo":"tool","nombre":"consultar_tarjeta","ms":212,"ok":true}
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","createSurface":{"surfaceId":"principal","catalogId":"https://<dominio>/catalogo/v1.json"}}}
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","updateComponents":{"surfaceId":"principal","components":[...]}}}
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","updateDataModel":{"surfaceId":"principal","path":"/","value":{...}}}}
{"tipo":"texto","valor":"Elige el plazo que te acomode; el de 18 meses es el que más intereses te ahorra."}
{"tipo":"razon","valor":"Te muestro planes de pago porque tu tarjeta está al 94% y hoy pagas $612 de intereses al mes."}
{"tipo":"fin","pasos":3,"ms":4180,"cierre":"pintar"}
```

Un turno de **ajuste** manda solo los parches, sin `createSurface`, y un turno de **aclaración** no
manda ningún `a2ui`:

```jsonl
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","updateDataModel":{"surfaceId":"principal","path":"/gasto/periodo","value":"2026-07"}}}
{"tipo":"fin","pasos":1,"ms":1520,"cierre":"ajustar"}
```

| `tipo` | Qué es | Quién lo consume |
|---|---|---|
| `estado` | `pensando` / `consultando` / `pintando` | Indicador de la UI |
| `tool` | Una llamada MCP terminada | Panel de transparencia (modo demo) |
| `a2ui` | Un mensaje A2UI v0.9.1 **ya validado** contra los schemas oficiales y el catálogo | `procesar()` de `packages/a2ui` |
| `texto` | La frase de cierre (una, corta) | Burbuja del chat |
| `razon` | "¿Por qué veo esto?" | Pie de la superficie |
| `error` | `{ codigo, mensaje }`; el stream sigue si puede | Toast; issue si se repite |
| `fin` | Métricas del turno: `pasos`, `ms`, `cacheLeido` (tokens que el proveedor sirvió desde su caché, **sumados en todos los pasos del turno**; ausente si no lo reporta) y `cierre` (`pintar` \| `ajustar` \| `responder`) | Log, transparencia, y **el cliente** para decidir si actualiza la pantalla del hilo o apila una nueva |

El cliente ignora tipos que no conoce (para poder agregar sin romper). El stream
**siempre** termina en `fin`, pase lo que pase: la interfaz nunca se queda esperando.

`tool` sale de las partes del stream del AI SDK, con `ms` medido entre la llamada y el
resultado. El `ok` no viene de una excepción: una tool del MCP que falla devuelve
`{ error: "…" }` (`apps/web/src/lib/agente/mcp-cliente.ts`), y de ahí se decide.

### Cómo cierra el agente el turno: tres salidas

Todo turno cierra llamando **una** tool local de `apps/web/src/lib/agente/cierre.ts`, y **la que
elige es la clasificación de intención** (no hay clasificador aparte):

| Tool | Cuándo | Emite |
|---|---|---|
| `pintar_pantalla` | otra pregunta, otras tarjetas | los tres mensajes (`pantalla.ts`) |
| `ajustar_pantalla` | lo mismo con otro parámetro | solo parches, **sin `createSurface`** (`ajustar.ts`) |
| `responder` | aclarar lo que ya se ve | nada |

`ajustar_pantalla` y `responder` **solo existen si la petición trae `superficie.arbol`**: en el primer
turno no hay nada que ajustar ni que aclarar. Una acción que muta estado cierra siempre con
`pintar_pantalla`. Tope de 3 tarjetas por pantalla, `Conclusion` incluida, validado en código. El
detalle está en `docs/como-funciona/ciclo-live.md` y el algoritmo en
`docs/algoritmos/intencion-y-parcheo.md`.

### Superficies

- Una superficie `principal` por conversación. `pintar_pantalla` la **rearma completa**:
  `createSurface` + `updateComponents` con la lista entera + `updateDataModel` en `/` con el data
  model entero. Al cambiar de usuario no hace falta `deleteSurface`: el cliente vacía su propio
  estado en `reiniciar()` (`usar-agente.ts`).
- Rearmar y no parchar es la decisión **por defecto**, no un descuido: `procesar()` **fusiona**
  componentes por id, así que un `updateComponents` parcial dejaría vivos los de la pantalla
  anterior y la interfaz mentiría.
- La excepción es `ajustar_pantalla`, y por eso valida tanto: solo parchea ids y rutas que **ya
  existen** en la superficie que el cliente reportó, y manda el componente **fusionado** (viejo +
  nuevo), nunca uno parcial. No puede agregar, quitar ni reordenar tarjetas.
- Superficies secundarias (`detalle`, `confirmacion`) solo si el catálogo lo pide
  (modal). Por defecto, todo en `principal`.

### Convención de acciones

| Si la acción… | Nombre | Qué hace el agente |
|---|---|---|
| **muta estado** | El **mismo nombre que la tool** MCP: `aplicar_plan_pago`, `crear_apartado`, `crear_tope_gasto` | Llama la tool con `context` como input, luego emite nueva UI con el resultado |
| solo cambia la vista | Prefijo `ver_`: `ver_categoria`, `ver_detalle_plan` | Emite nueva UI sin tools de acción (puede usar tools de lectura) |
| elige una opción sin confirmar | Prefijo `elegir_`: `elegir_plazo` | Actualiza el data model (`updateDataModel`) y, si aplica, resalta; no muta estado |

- `context` lleva **exactamente** los campos que la tool necesita, resueltos desde el
  data model por el renderer (`{ "plazo": { "path": "/planElegido" } }`).
- Toda acción de mutación lleva `idempotencyKey` = `conversacionId + ":" + timestamp`
  en el `context`; la tool la respeta (skill `tool-mcp`).
- El componente que dispara la acción **no hace nada más**: ni fetch, ni cambio local
  de estado. Espera la nueva UI. Si tarda, el `estado: pensando` cubre.

### Selección de usuario

`?usuario=usr_beto` en la URL más un selector discreto en la cabecera. Cambiar de
usuario genera un `conversacionId` nuevo, borra la superficie (`deleteSurface`) y **no**
reinicia el estado del MCP (eso es `reiniciar-estado`, y solo antes de un ensayo).

### Errores

- Tool fallida: el agente la recibe como texto y decide; el stream emite `error` con
  `codigo: "tool"` para el panel de transparencia y sigue.
- JSON A2UI inválido contra el catálogo: se reintenta una vez; si vuelve a fallar,
  `error { codigo: "a2ui" }` + `texto` con una respuesta en prosa. Nunca llega un
  mensaje inválido al renderer.
- Modelo caído: `error { codigo: "modelo" }`; el cliente muestra "Intenta de nuevo" y
  `demo` decide si cambia `MODELO`.
- Timeout del turno: 30 s. Después, `error { codigo: "timeout" }` y `fin`.
- Un componente que **truena al pintar** en el cliente (una prop con la forma
  equivocada) se cae solo él: `FronteraDeError` en `packages/a2ui/src/Superficie.tsx`
  muestra "Esta tarjeta no se pudo mostrar" en su lugar y el resto de la pantalla sigue
  en pie. No se reporta al agente: el JSON era válido, el fallo es del componente.
