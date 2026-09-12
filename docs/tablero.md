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
| mcp | luis | Paquete Inversiones completado: `consultar_inversiones`, `consultar_catalogo_inversiones`, `consultar_historico_inversion`. 18 tools en total, 103 pruebas | sáb 07:15 |
| mcp | aldair | Paquete 1 del roadmap del MCP terminado: `panorama_inicial`, `diagnostico_salud_financiera` y `consultar_creditos`. 12 tools, 78 pruebas | sáb 08:45 |
| contrato | — | — | — |
| demo | parlack | Ciclo de error A2UI cerrado (`VALIDATION_FAILED` vuelve al agente), frontera de error por componente, `GET /api/agente` con capacidades. Sigue: el guion con llave de modelo | sáb 03:40 |

## Bloqueos

- (ninguno)

## Siguiente

El detalle por bloque está en `equipo/roadmap.md`; aquí solo el paso inmediato.

- web: **el scaffold ya tiene shadcn, tokens y shell listos** → los 4 componentes de fase 1 (`ResumenTarjeta`, `PlanDePago`, `Calendario`; `Confirmacion` ya está de referencia). Cada carpeta en `packages/catalogo/src/` trae su encargo escrito. **Es lo que falta para que el agente pueda pintar algo más que `Confirmacion`**: en cuanto un componente entra a `CATALOGO`, el prompt y la validación del agente lo toman solos
- mcp: **12 tools con ciclos de acción verificados por HTTP** (`pnpm humo`), con **9 base + 3 del Paquete 2** (`detectar_fugas`, `cancelar_suscripcion`, `crear_tope_gasto`) y pruebas en verde. Con el Paquete 1 el agente ya no decide solo con "tiene deuda / no tiene deuda": tiene puntaje, tendencia y la deuda completa → lo que queda es el **Paquete 2** (`crear_tope_gasto`, `detectar_fugas`, `cancelar_suscripcion`, encargo en `arquitectura/paquete-2-gasto-fugas-y-control.md`) y el origen Postgres detrás de `FEATURE_POSTGRES`
- contrato: **el motor A2UI está terminado** — valida con los JSON Schema oficiales y pasa los **76 casos de conformidad** de la spec (109 pruebas), y el agente real ya corre (18 pruebas sin llave). Lo único abierto, opcional: conectar el canal `VALIDATION_FAILED` de vuelta al agente para que se corrija solo (`<Superficie alFallar>` ya lo emite, nadie lo escucha)
- demo: **falta una llave de modelo en el `.env`** (`GOOGLE_GENERATIVE_AI_API_KEY`) para correr el nivel 4 de `probar` con los prompts del guion; sin ella el agente sirve la pantalla de ejemplo

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- Auditoría del backend, el MCP y el A2UI: 12 huecos cerrados con prueba (timeout mal reportado, petición sin validar, débito como crédito, mes a medias, cuenta ajena…). 189 pruebas en verde.
- Backend completo del viaje del ADR 0004: 9 tools del MCP (7 lectura + 2 acción) con el ciclo `simular → aplicar → la lectura cambia` verificado por HTTP, y el agente real (Vercel AI SDK + MCP + A2UI validado). 63 pruebas en verde, sin llave de modelo.
