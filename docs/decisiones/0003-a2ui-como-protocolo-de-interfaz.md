---
estado: aceptada
fecha: 2026-09-12
---

# 0003 — A2UI real (v0.9.1) con catálogo propio, no un protocolo inventado

## Contexto

La presentación oficial pone tres piezas no negociables: LLM, MCP y **A2UI "o un
protocolo equivalente"** para representar y transmitir la interfaz que genera el
agente. El 15% de "Arquitectura e ingeniería" y parte del 20% de "Calidad y
adaptabilidad de la UI generada" se juegan ahí. El jurado escribió "A2UI" en la
portada, en la base técnica, en la arquitectura de referencia y en el cierre.

Antes de ver la presentación habíamos diseñado un protocolo propio: cada tool devuelve
un resultado con campo `tipo` y el host elige el componente por ese campo. Es la misma
idea que A2UI (UI como datos, catálogo controlado por el cliente), pero casera.

## Qué es A2UI, en corto

Protocolo abierto de Google (Apache 2.0, dic. 2025), v0.9.1 estable. El agente manda
mensajes JSON (JSONL, uno por línea) y el cliente los pinta con **su propio catálogo**:

| Mensaje | Qué hace |
|---|---|
| `createSurface { surfaceId, catalogId }` | Abre una "superficie" (un área de UI) ligada a un catálogo |
| `updateComponents { surfaceId, components[] }` | Lista **plana** de componentes con `id`, `component` (nombre del catálogo) y `children` por id |
| `updateDataModel { surfaceId, path, value }` | Datos a los que los componentes se enlazan con `{"path": "/saldo"}` (JSON Pointer) |
| `deleteSurface { surfaceId }` | Cierra la superficie |
| **cliente → agente** `action { name, surfaceId, sourceComponentId, context }` | Un botón con `action.event` devuelve al agente el nombre de la acción y el contexto resuelto del data model |

Renderer React oficial: `@a2ui/react` + `@a2ui/web_core` (`A2uiSurface`,
`MessageProcessor`, clase `Catalog` para registrar componentes propios). Catálogo básico
incluido (Row, Column, Text, Button, TextField, Card, Tabs, Modal…) que se puede
**reemplazar** por el nuestro.

## Decisión

1. **Usamos A2UI v0.9.1 tal cual**, con `@a2ui/react` como renderer, y un **catálogo
   propio** en `packages/catalogo`: cada componente financiero nuestro (plan de pago,
   tabla de movimientos, gráfica de gasto, simulador, confirmación) es un componente
   React registrado en un `Catalog` con su schema. El catálogo básico de A2UI se usa
   solo para layout (Column, Row, Text) si conviene; lo que luce es nuestro.
2. **El agente genera los mensajes A2UI** (`createSurface` → `updateComponents` →
   `updateDataModel`) restringido a nuestro catálogo, y **recibe los `action`** de la
   UI como contexto para el siguiente turno. Eso es literalmente "el ciclo se cierra".
3. **Los datos del data model salen de tools MCP**; las acciones de la UI se ejecutan
   con tools MCP que mutan estado. A2UI nunca habla con el MCP directo: siempre pasa
   por el agente.
4. **Spike de 2 horas** al arrancar, rol `contrato`: `@a2ui/react` renderizando un
   componente propio desde un mensaje escrito a mano, y una `action` llegando al
   servidor. Si a las 3 horas no funciona, **plan B**: mismo formato de mensajes
   A2UI, procesado por un `MessageProcessor` mínimo nuestro (~150 líneas: lista plana
   → árbol, bindings por JSON Pointer, dispatch de actions). El protocolo no cambia;
   cambia quién lo interpreta. Ante el jurado sigue siendo A2UI.

## Alternativas descartadas

- **Protocolo propio (`tipo` → componente).** Funciona, pero es "equivalente" a ojos
  del jurado y pierde puntos de ingeniería frente a equipos que usen el estándar. Su
  esencia sobrevive: nuestro catálogo A2UI es exactamente ese mapa `tipo → componente`.
- **Renderer Lit oficial.** Más maduro, pero nos saca de React/Next.js y del stack que
  el equipo domina.
- **MCP Apps (recursos `ui://`).** Otro estándar para UI en clientes MCP, pero el
  jurado pidió A2UI y nuestro host es propio, no Claude Desktop.

## Consecuencias

- El campo `tipo` desaparece como concepto de protocolo; se vuelve el `component` del
  catálogo A2UI. Las skills `ui-generativa`, `agente-host`, `tool-mcp` y
  `cambiar-schema` cambian en consecuencia (ya actualizadas).
- `packages/schemas` se divide: **`packages/catalogo`** (componentes A2UI: schema de
  props + implementación React) y **`packages/schemas`** (contratos de tools MCP).
- El agente necesita **structured output** contra el schema del catálogo para no
  inventar componentes. Es la parte más delicada; se prueba en el spike.
- Dependencia de un paquete en "public preview". Mitigada con el plan B.
