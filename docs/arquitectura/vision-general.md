---
verificado: 2026-09-12 04:30
estado: plan            # plan | construido
---

# Visión general de la arquitectura (plan; nada construido aún)

Sigue pieza por pieza la **arquitectura de referencia** de la presentación oficial:
Usuario → Agente/LLM → MCP → A2UI → Componentes, y la interacción regresa al agente.

## Para cualquiera

La persona escribe (o dice) lo que necesita. Un agente de IA entiende qué quiere y con
qué contexto llega, pide los datos a un "servidor de herramientas" (el MCP) y, en vez
de contestar con texto, **describe la pantalla que resuelve el problema** usando un
lenguaje estándar (A2UI). Nuestra app pinta esa pantalla con componentes que diseñamos
nosotros. Cuando la persona toca un botón —"Aplicar plan"—, esa acción vuelve al
agente, que ejecuta el cambio real a través del MCP y **rediseña la pantalla** con el
nuevo estado. Ese ciclo, repetido, es la experiencia completa.

## Técnico

```mermaid
flowchart LR
  U[Usuario] -->|intención| A[Agente / LLM<br/>apps/web/src/lib/agente]
  A -->|tool calls| M[Servidor MCP<br/>apps/mcp]
  M -->|datos y acciones| A
  A -->|mensajes A2UI<br/>createSurface / updateComponents / updateDataModel| R[Renderer A2UI propio<br/>packages/a2ui]
  R -->|catálogo propio| C[Componentes financieros<br/>packages/catalogo]
  C -->|action { name, context }| A
  M --> D[(datos sintéticos<br/>PostgreSQL, esquema banorte)]
  M -. opcional, ADR 0002 .-> P[services/ml]
```

### Piezas

| Pieza | Responsabilidad | Lo que NO hace | Dueño |
|---|---|---|---|
| Agente (`apps/web/src/lib/agente/`) | Interpretar intención, llamar tools, **emitir mensajes A2UI** restringidos al catálogo, recibir `action` y continuar | No pinta; no contiene datos | `contrato` |
| Servidor MCP (`apps/mcp/`) | Tools de **lectura** (cuentas, movimientos, productos) y de **acción** (aplicar plan, transferir, contratar) que mutan el estado sintético | No sabe de UI ni de A2UI | `mcp` |
| Renderer A2UI (`packages/a2ui`) | Valida con los schemas oficiales, procesa los mensajes, resuelve bindings, pinta con el registro; enruta `action` al agente (ADR 0008) | No decide qué mostrar | `contrato` |
| Catálogo (`packages/catalogo/`) | Componentes React propios con schema de props; registrados en el registro de `packages/a2ui` | No llama al MCP ni fetch propio | `web` |
| Schemas de tools (`packages/schemas/`) | Zod de entrada/salida de cada tool | — | `contrato` |
| Datos (PostgreSQL, esquema `banorte`) | Tres perfiles demo, movimientos, créditos, portafolios; **estado mutable** en `acciones_aplicadas` (ADR 0010) | — | `mcp` |

### Flujo de una vuelta completa del ciclo

1. Usuario: "Quiero pagar menos intereses de mi tarjeta".
2. Agente llama `consultar_tarjeta` y `simular_reestructura` en el MCP.
3. Agente emite A2UI: `createSurface` → `updateComponents` con `PlanDePago` (nuestro
   catálogo) y tres opciones → `updateDataModel` con montos y CAT.
4. Renderer pinta. Usuario elige 18 meses y toca **Aplicar plan**.
5. Cliente manda `action { name: "aplicar_plan", context: { plazo: 18 } }` al agente.
6. Agente llama `aplicar_plan_pago` (tool de acción, muta estado) y emite
   `updateComponents` con `ConfirmacionPlan` + nuevo calendario de pagos.
7. Siguiente pregunta del usuario parte del nuevo estado.

### Adaptabilidad (criterio 2 de la rúbrica, 20%)

El mismo intent con contexto distinto debe producir UI distinta. El agente recibe
contexto del usuario (perfil, saldos, historial) vía tools **antes** de decidir la
interfaz; el system prompt le pide explícitamente elegir componentes según ese
contexto. Se demuestra en el guion con tres perfiles demo.

### Decisiones abiertas

- Modelo: **Gemini 3.8 Flash** por defecto vía `@ai-sdk/google`; Claude Sonnet 5 como
  respaldo con `MODELO=claude` (ADR 0005).
- Transporte agente → cliente: SSE/JSONL por el route handler de Next.js.
