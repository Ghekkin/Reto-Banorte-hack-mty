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
| mcp | luis | Paquete 2 completado: detectar_fugas, cancelar_suscripcion y crear_tope_gasto con 56 pruebas en verde | sáb 03:00 |
| mcp | aldair | Paquete 1 del roadmap del MCP terminado: `panorama_inicial`, `diagnostico_salud_financiera` y `consultar_creditos`. 12 tools, 78 pruebas | sáb 08:45 |
| contrato | — | — | — |
| demo | parlack | Los 8 componentes del catálogo construidos y probados (render real) y los ejemplos en el prompt. No toco el frontend del producto (lo rediseña otra sesión). Sigue: el guion con llave de modelo | sáb 04:10 |

## Bloqueos

- (ninguno)

## Siguiente

El detalle por bloque está en `equipo/roadmap.md`; aquí solo el paso inmediato.

- web: **los 8 componentes del catálogo existen y pintan** (`packages/catalogo`, 42 pruebas). Lo que sigue es suyo: (1) el **panel de transparencia** — `usarAgente` ya devuelve `transparencia` con las líneas `tool`/`a2ui`/`error`/`fin` del turno, solo falta pintarlas con los badges LLM · MCP · A2UI; (2) el placeholder de `components/maya/lienzo.tsx` dice que el catálogo "se conecta en el siguiente paso" y ya está conectado; (3) pulido visual con el agente real en el proyector
- mcp: **12 tools con ciclos de acción verificados por HTTP** (`pnpm humo`), con **9 base + 3 del Paquete 2** (`detectar_fugas`, `cancelar_suscripcion`, `crear_tope_gasto`) y pruebas en verde. Con el Paquete 1 el agente ya no decide solo con "tiene deuda / no tiene deuda": tiene puntaje, tendencia y la deuda completa → lo que queda es el **Paquete 2** (`crear_tope_gasto`, `detectar_fugas`, `cancelar_suscripcion`, encargo en `arquitectura/paquete-2-gasto-fugas-y-control.md`) y el origen Postgres detrás de `FEATURE_POSTGRES`
- contrato: **el motor A2UI está terminado** — valida con los JSON Schema oficiales y pasa los **76 casos de conformidad** de la spec (109 pruebas), y el agente real ya corre (18 pruebas sin llave). Lo único abierto, opcional: conectar el canal `VALIDATION_FAILED` de vuelta al agente para que se corrija solo (`<Superficie alFallar>` ya lo emite, nadie lo escucha)
- demo: **falta una llave de modelo en el `.env`** (`GOOGLE_GENERATIVE_AI_API_KEY`) para correr el nivel 4 de `probar` con los prompts del guion; sin ella el agente sirve la pantalla de ejemplo

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- Auditoría del backend, el MCP y el A2UI: 12 huecos cerrados con prueba (timeout mal reportado, petición sin validar, débito como crédito, mes a medias, cuenta ajena…). 189 pruebas en verde.
- Backend completo del viaje del ADR 0004: 9 tools del MCP (7 lectura + 2 acción) con el ciclo `simular → aplicar → la lectura cambia` verificado por HTTP, y el agente real (Vercel AI SDK + MCP + A2UI validado). 63 pruebas en verde, sin llave de modelo.
