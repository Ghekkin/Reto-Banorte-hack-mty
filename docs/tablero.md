# Tablero

Quién está en qué, ahora mismo. Es lo primero que lee cualquiera al entrar y lo último
que actualiza al salir. Con esto y las bitácoras, cualquiera retoma el trabajo desde
cualquier lugar sin tener que preguntar en el chat.

**Regla de edición:** cada quien toca **solo su fila** y sus propias líneas de
bloqueos/siguiente. Nadie edita la fila de otro. Así cuatro personas actualizan a la
vez sin conflictos de git.

## Ahora mismo

| Rol | Quién | En qué | Desde |
|---|---|---|---|
| web | — | — | — |
| mcp | — | — | — |
| contrato | — | — | — |
| demo | parlack | Scaffold del monorepo terminado y verificado (`pnpm dev` levanta todo); sigue guion y deploy | sáb 07:45 |

## Bloqueos

- (ninguno)

## Siguiente

El detalle por bloque está en `equipo/roadmap.md`; aquí solo el paso inmediato.

- web: **el scaffold ya tiene shadcn, tokens y shell listos** → los 4 componentes de fase 1 (`ResumenTarjeta`, `PlanDePago`, `Calendario`; `Confirmacion` ya está de referencia). Cada carpeta en `packages/catalogo/src/` trae su encargo escrito
- mcp: **capa de datos y `estado.json` idempotente ya están**; `consultar_perfil` es la plantilla → `consultar_tarjeta`, `consultar_movimientos`, `simular_reestructura` → `aplicar_plan_pago` (fase 1)
- contrato: **`packages/a2ui` ya procesa, resuelve bindings y pinta** (15 tests) → falta ajv contra `spec/v0_9_1/json/` y los 8 casos de conformidad → agente real en `apps/web/src/lib/agente/agente.ts` (hoy mock) con structured output contra el catálogo
- demo: guion literal del viaje (Beto 1 → Beto 2 → Ana 3) → dominio y deploy → modo transparencia y badges LLM·MCP·A2UI como tareas de hora 12+ (`README.md` con comandos reales ya está)

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- —
