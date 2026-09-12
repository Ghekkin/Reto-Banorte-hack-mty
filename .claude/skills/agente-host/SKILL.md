---
name: agente-host
description: Cómo se arma el agente que está al centro de la experiencia - interpreta la intención, llama tools MCP, emite mensajes A2UI restringidos al catálogo propio, recibe las acciones de la UI y cierra el ciclo. Cliente MCP, system prompt, structured output, límite de pasos, log. Invocar antes de tocar el agente, su prompt, la capa A2UI o la conexión al MCP.
---

# El agente al centro

La presentación lo dice literal: "El LLM es el centro de la experiencia, no un chat
pegado a un lado". El agente hace tres cosas, en ciclo: **interpreta la intención**,
**genera la interfaz** (A2UI), **ejecuta la acción** cuando la UI se la devuelve. Es
dominio del rol `contrato`. Vive en `apps/web/src/lib/agente/` y se expone por
`app/api/agente/route.ts` como stream JSONL de mensajes A2UI.

## Piezas (un archivo cada una)

| Archivo | Qué hace |
|---|---|
| `mcp-cliente.ts` | Conecta al servidor MCP por Streamable HTTP (`MCP_URL`, `MCP_TOKEN`) y convierte sus tools al formato del AI SDK. Una conexión por request. |
| `catalogo.ts` | Carga el JSON del catálogo (`packages/catalogo`) y construye el schema de salida A2UI restringido a **nuestros** componentes. |
| `prompt.ts` | El system prompt. Único lugar donde vive. |
| `modelo.ts` | Proveedor/modelo por `MODELO` (default Claude Sonnet vía `@ai-sdk/anthropic`; `@ai-sdk/google` si se decide Gemini). |
| `agente.ts` | El loop: mensajes + acciones previas → tools MCP → mensajes A2UI. `stopWhen`/límite ≤ 8 pasos, timeout, log por paso. |
| `a2ui.ts` | Helpers para emitir `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface` válidos (v0.9.1) y validar contra el schema del catálogo antes de mandarlos. |

Verifica la API exacta del AI SDK contra la versión instalada (`node_modules/ai`); en
`/root/yolani/api-backend` hay uso real como referencia.

## Cómo genera la interfaz

1. El agente **primero obtiene contexto** con tools de lectura (perfil, saldos,
   historial). Sin contexto no hay adaptabilidad, y la adaptabilidad vale 20%.
2. Con el contexto decide qué componentes del catálogo mostrar y produce, con
   **structured output** contra el schema del catálogo, la lista plana de
   `updateComponents` y el `updateDataModel`. Un componente que no existe en el
   catálogo es un error de validación y se reintenta, nunca llega al cliente.
3. Los datos del data model **vienen de las tools**, no de la memoria del modelo. El
   modelo enlaza (`{ path }`), no copia números.
4. Los mensajes salen en streaming: `createSurface` de inmediato, `updateComponents`
   cuando está la estructura, `updateDataModel` cuando llegan los datos.

## Cómo cierra el ciclo

- El cliente manda `action { name, surfaceId, sourceComponentId, context }` al
  route handler. El agente lo recibe **como un mensaje más de la conversación**
  ("el usuario tocó `aplicar_plan` con contexto `{ plazo: 18 }`").
- Si la acción implica cambio real, el agente llama la **tool de acción** en el MCP
  (`aplicar_plan_pago`) y luego emite nueva UI con el estado resultante
  (`updateComponents` sobre la misma `surfaceId` o una nueva).
- Una acción nunca se ejecuta en el cliente ni en el route handler: siempre pasa por
  el agente y el MCP. Es lo que hace visible el ciclo ante el jurado.

## Reglas

- Las tools son del MCP, no del host. Si el agente necesita una capacidad, se agrega
  al MCP (skill `tool-mcp`).
- Un error de tool llega al modelo como texto para que explique o reintente; nunca
  rompe el turno ni el stream.
- Límite ≤ 8 pasos y timeout por request. Un agente en bucle en la demo es la muerte.
- Log por paso (tool o mensaje A2UI, ms, ok) en dev.
- Sin estado en servidor: historial + acciones viajan en el request. El estado del
  negocio vive en el MCP.

## El system prompt

Corto, en español, en este orden: quién es el usuario demo y cómo obtener su contexto
(qué tools llamar primero); **la pantalla es la respuesta**: describe UI con el
catálogo, cierra con una frase de texto como máximo; cuándo elegir cada componente
(una línea por componente, coherente con su README); cómo adaptar al contexto (saldo
bajo → énfasis en ahorro; mora → énfasis en reestructura); qué hacer al recibir una
`action`; qué no hace (inventar montos, prometer acciones no ejecutadas, componentes
fuera del catálogo). Cada cambio: entrada en `docs/bitacora/equipo.md`.

## Probar

Con `scripts/dev.sh` arriba, los prompts del guion producen la interfaz esperada en
< 8 s, y la acción del guion produce **cambio de estado visible** en la siguiente UI.
Si un prompt del guion falla dos veces, issue `alta`.
