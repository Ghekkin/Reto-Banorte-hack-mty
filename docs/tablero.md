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
| demo | parlack | Backend completo: 9 tools del MCP + agente real con el AI SDK (dominio `mcp` y `contrato`, ver bitácora). Sigue: el guion con llave de modelo | sáb 01:20 |

## Bloqueos

- (ninguno)

## Siguiente

El detalle por bloque está en `equipo/roadmap.md`; aquí solo el paso inmediato.

- web: **el scaffold ya tiene shadcn, tokens y shell listos** → los 4 componentes de fase 1 (`ResumenTarjeta`, `PlanDePago`, `Calendario`; `Confirmacion` ya está de referencia). Cada carpeta en `packages/catalogo/src/` trae su encargo escrito. **Es lo que falta para que el agente pueda pintar algo más que `Confirmacion`**: en cuanto un componente entra a `CATALOGO`, el prompt y la validación del agente lo toman solos
- mcp: **las 9 tools están, con 31 pruebas y el ciclo de acción verificado por HTTP** (`pnpm humo`) → lo que queda es opcional: `crear_tope_gasto` y el origen Postgres detrás de `FEATURE_POSTGRES`
- contrato: **`packages/a2ui` procesa, resuelve bindings y pinta** (15 tests) y **el agente real ya corre** (`apps/web/src/lib/agente/`, 18 pruebas sin llave) → falta ajv contra `spec/v0_9_1/json/` y los 8 casos de conformidad
- demo: **falta una llave de modelo en el `.env`** (`GOOGLE_GENERATIVE_AI_API_KEY`) para correr el nivel 4 de `probar` con los prompts del guion; sin ella el agente sirve la pantalla de ejemplo

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- Backend completo del viaje del ADR 0004: 9 tools del MCP (7 lectura + 2 acción) con el ciclo `simular → aplicar → la lectura cambia` verificado por HTTP, y el agente real (Vercel AI SDK + MCP + A2UI validado). 63 pruebas en verde, sin llave de modelo.
