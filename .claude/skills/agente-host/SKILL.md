---
name: agente-host
description: Cómo se arma el loop del agente en apps/web - cliente MCP, tools expuestas al modelo, system prompt, límite de pasos, streaming de resultados como partes con tipo, errores de tool como texto, modelo por variable de entorno, log por paso. Invocar antes de tocar el agente, su prompt o la conexión al MCP.
---

# El agente en el host

El agente es el pegamento entre el modelo, las tools del MCP y los componentes. Es
dominio del rol `contrato`. Vive en `apps/web/src/lib/agente/` y se expone por un
route handler (`app/api/chat/route.ts`) que consume `useChat` en el cliente.

## Piezas (un archivo cada una)

| Archivo | Qué hace |
|---|---|
| `mcp-cliente.ts` | Conecta al servidor MCP por Streamable HTTP (`MCP_URL`, `MCP_TOKEN`) y convierte sus tools al formato del AI SDK. Una conexión por request; se cierra al terminar. |
| `prompt.ts` | El system prompt. Único lugar donde vive. |
| `modelo.ts` | Elige proveedor/modelo por `MODELO` (default: Claude Sonnet vía `@ai-sdk/anthropic`). Cambiar de modelo es cambiar una variable. |
| `agente.ts` | `streamText` con tools, `stopWhen`/límite de pasos ≤ 8, callbacks de log. |

Verifica la API exacta contra la versión del AI SDK instalada (`node_modules/ai`);
en `/root/yolani/api-backend` hay uso real del SDK como referencia.

## Reglas

- **Las tools son del MCP, no del host.** El host no define tools propias salvo
  `mostrar_mensaje` si hiciera falta. Si el agente necesita una capacidad, se agrega
  al MCP (skill `tool-mcp`).
- **Todo resultado de tool llega al cliente como parte con `tipo`**; el cliente pinta
  con el registry (skill `ui-generativa`). El host no transforma resultados.
- **Un error de tool no rompe el turno.** Llega al modelo como texto ("la tool X falló:
  ...") para que reintente o explique. Nunca se lanza al cliente.
- **Límite de pasos ≤ 8** y timeout por request. Un agente en bucle en la demo es la
  muerte.
- **Log por paso** (tool, ms, ok) a consola en dev. Es lo que se lee cuando "no hizo
  nada".
- **Sin estado en servidor.** El historial viaja en el request. Nada de sesiones.

## El system prompt

Corto, en español, y con estas partes en este orden: quién es el usuario demo y su
contexto; **prefiere mostrar a explicar** (llama tools y deja que la UI hable; cierra
con una frase); cuándo usar cada tool (una línea por tool, coherente con la
`description` de la tool); cómo componer (si la pregunta pide dos vistas, llama las dos);
qué no hace (inventar datos, prometer operaciones que no ejecutó). Cada cambio al
prompt: entrada en `docs/bitacora/equipo.md` con qué se buscaba corregir.

## Probar

Con `scripts/dev.sh` arriba, los 3–4 prompts del guion deben producir la interfaz
esperada en < 8 s cada uno. Si un prompt del guion falla dos veces, es issue `alta`.
