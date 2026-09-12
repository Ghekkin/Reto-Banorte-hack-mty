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
| demo | parlack | Coolify en el VPS: proyecto `reto-banorte` + Postgres arriba; siguen apps web/mcp y dominio | 2026-09-12 05:20 |

## Bloqueos

- (ninguno)

## Siguiente

- web: tokens → los 8 schemas del catálogo (ADR 0004) en la hora 1 → `ResumenTarjeta`, `PlanDePago`, `Confirmacion`, `Calendario` (fase 1) con sus `.jsonl`
- mcp: datos de Beto y Ana completos para los tres casos + `estado.json` reiniciable → `consultar_perfil`, `consultar_tarjeta`, `simular_reestructura` → `aplicar_plan_pago` (fase 1)
- contrato: spike `@a2ui/react` con un componente propio y una `action` de vuelta (2 h, ADR 0003) → schemas de tools → agente con structured output contra los 8 nombres del catálogo → prop `razon`
- demo: guion literal del viaje (Beto 1 → Beto 2 → Ana 3) → `README.md` con comandos reales → modo transparencia y badges LLM·MCP·A2UI como tareas de hora 12+

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- —
