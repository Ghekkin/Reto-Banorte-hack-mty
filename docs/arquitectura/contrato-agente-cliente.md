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
  "superficie": {                       // opcional: estado actual de la superficie, compacto
    "surfaceId": "principal",
    "componentes": ["ResumenTarjeta", "PlanDePago"],
    "dataModel": { "tarjeta": { "saldo": 1840000 }, "planElegido": 18 }
  }
}
```

Reglas:
- `mensajes` lleva **texto**, nunca JSON A2UI: el historial se mantiene chico y el
  modelo no reprocesa pantallas viejas. Una acción previa se resume en una línea
  `rol: "accion"`.
- Exactamente uno de `mensajes[último].rol === "usuario"` o `accion` presente es lo
  que dispara el turno. Si vienen los dos, `accion` manda.
- `superficie.dataModel` es lo que el cliente tiene ahora; el agente lo usa como
  contexto, no lo copia de vuelta.

### Respuesta (JSONL, en orden)

```jsonl
{"tipo":"estado","valor":"pensando"}
{"tipo":"tool","nombre":"consultar_tarjeta","ms":212,"ok":true}
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","createSurface":{"surfaceId":"principal","catalogId":"https://<dominio>/catalogo/v1.json"}}}
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","updateComponents":{"surfaceId":"principal","components":[...]}}}
{"tipo":"a2ui","mensaje":{"version":"v0.9.1","updateDataModel":{"surfaceId":"principal","path":"/","value":{...}}}}
{"tipo":"texto","valor":"Elige el plazo que te acomode; el de 18 meses es el que más intereses te ahorra."}
{"tipo":"razon","valor":"Te muestro planes de pago porque tu tarjeta está al 94% y hoy pagas $612 de intereses al mes."}
{"tipo":"fin","pasos":3,"ms":4180}
```

| `tipo` | Qué es | Quién lo consume |
|---|---|---|
| `estado` | `pensando` / `consultando` / `pintando` | Indicador de la UI |
| `tool` | Una llamada MCP terminada | Panel de transparencia (modo demo) |
| `a2ui` | Un mensaje A2UI v0.9.1 **ya validado** contra los schemas oficiales y el catálogo | `procesar()` de `packages/a2ui` |
| `texto` | La frase de cierre (una, corta) | Burbuja del chat |
| `razon` | "¿Por qué veo esto?" | Pie de la superficie |
| `error` | `{ codigo, mensaje }`; el stream sigue si puede | Toast; issue si se repite |
| `fin` | Métricas del turno | Log, transparencia |

El cliente ignora tipos que no conoce (para poder agregar sin romper). El stream
**siempre** termina en `fin`, pase lo que pase: la interfaz nunca se queda esperando.

`tool` sale de las partes del stream del AI SDK, con `ms` medido entre la llamada y el
resultado. El `ok` no viene de una excepción: una tool del MCP que falla devuelve
`{ error: "…" }` (`apps/web/src/lib/agente/mcp-cliente.ts`), y de ahí se decide.

### Cómo entrega el agente la interfaz

Del lado del agente, la pantalla se entrega con una tool local, `pintar_pantalla`
(`apps/web/src/lib/agente/pantalla.ts`): el modelo la llama con `razon`, `texto`,
los componentes y el data model, y ahí se validan **antes** de convertirse en las tres
líneas `a2ui`. El detalle y el por qué están en `docs/como-funciona/agente.md`.

### Superficies

- Una superficie `principal` por conversación, y el agente la **rearma completa en cada
  turno**: `createSurface` + `updateComponents` con la lista entera + `updateDataModel` en
  `/` con el data model entero. Al cambiar de usuario no hace falta `deleteSurface`: el
  cliente vacía su propio estado en `reiniciar()` (`usar-agente.ts`).
- Rearmar y no parchar es una decisión, no un descuido: `procesar()` **fusiona**
  componentes por id, así que un `updateComponents` parcial dejaría vivos los componentes
  de la pantalla anterior y la interfaz mentiría. Como el agente siempre manda el árbol
  completo, el resultado visual es idéntico y el estado es predecible.
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
