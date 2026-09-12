---
estado: plan
verificado: 2026-09-10
---

# Guion de la demo (plan; se reescribe cuando se elija el caso de uso)

Objetivo: **3 minutos**, sin pausas. Lo que el jurado va a buscar, literal del
entregable 01: **"el flujo completo: intención, UI generada, interacción y la acción
que dispara"**. Y para el 20% de adaptabilidad: **la misma pregunta con otro usuario
demo produce otra interfaz**. Antes de empezar: `pnpm --filter mcp reiniciar-estado`.

## Estructura

| Min | Qué pasa en pantalla | Qué se dice |
|---|---|---|
| 0:00–0:20 | Pantalla vacía, solo el chat | El problema en una frase. Quién es el usuario demo 1. |
| 0:20–1:00 | **Intención** → el agente pide contexto al MCP y **genera la UI** (componente A) | "No programamos esta pantalla: el agente la describió en A2UI con nuestro catálogo" |
| 1:00–1:50 | **Interacción** → la persona elige y toca la acción → **la acción ocurre** (tool de acción) → **nueva UI** con el estado cambiado | "Lo que tocó regresó al agente; el cambio es real y se ve" |
| 1:50–2:30 | Segunda intención → componente B, y una lectura que muestra el efecto de la acción anterior | "El ciclo se cierra: el estado nuevo alimenta lo que sigue" |
| 2:30–2:50 | **Usuario demo 2, misma pregunta inicial** → interfaz distinta | "Adaptabilidad: otro contexto, otra pantalla" |
| 2:50–3:00 | Qué sigue | Una frase |

## Guion literal

(vacío hasta elegir el caso de uso)

## Plan B

Si el modelo o la red fallan en vivo: **grabación de la misma demo** lista en el
escritorio de la máquina de presentación. Se graba en la hora 30, no después.
