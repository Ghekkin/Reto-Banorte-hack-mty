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
| mcp | aldair | Bloque A de `docs/arquitectura/orquestadores.md` cerrado (21 tools, 117 pruebas). Ahora: integración de voz ElevenLabs (premio lateral, `web`/`demo`), construida detrás de `FEATURE_VOZ` (apagado) — ver `docs/como-funciona/premio-elevenlabs.md`. Falta conectar el botón principal y el del chat de Maya | sáb 19:21 |
| contrato | luis | Bloque B completado: Prefetch determinista de `panorama_inicial` (O3), soporte de ciclo de acción con `ejecutar_decision` (O2), prompts para tools compuestas (O4), 32 pruebas en verde | sáb 09:20 |
| demo | parlack | Puliendo los componentes mirando el navegador de verdad (capturas con Playwright). Arreglado: Tailwind no escaneaba `packages/*`, así que `GastoPorCategoria` pintaba todo en rojo y la barra del héroe era invisible | sáb 10:45 |

## Bloqueos

- (ninguno) — el de la cuota de Gemini (#12) quedó resuelto sáb 12:10: tope ampliado, el agente vuelve a pintar y el caché sirve 76–87 % de la entrada

## Siguiente

El detalle por bloque está en `equipo/roadmap.md`; aquí solo el paso inmediato.

- web: **los 8 componentes del catálogo existen y pintan** — se ven todos en **`/catalogo`** (galería con el renderer real, fuera del shell del producto). Lo que sigue es suyo: (1) el **panel de transparencia** — `usarAgente` ya devuelve `transparencia` con las líneas `tool`/`a2ui`/`error`/`fin` del turno, solo falta pintarlas con los badges LLM · MCP · A2UI; (2) el placeholder de `components/maya/lienzo.tsx` dice que el catálogo "se conecta en el siguiente paso" y ya está conectado; (3) pulido visual con el agente real en el proyector
- mcp: **21 tools** (14 lectura + 4 acción de los paquetes 1/2/Inversiones/ADR 0004, más los 3 orquestadores del Bloque A: `analizar_gasto`, `analizar_ahorro`, `ejecutar_decision`), 117 pruebas, ciclos de acción verificados por HTTP (`pnpm humo`). Pendiente real: el origen `postgres` detrás de `FEATURE_POSTGRES` sigue sin implementación (cae a memoria siempre, ver `apps/mcp/src/datos/index.ts`). El Bloque B de los orquestadores (`docs/arquitectura/orquestadores.md`) ya lo cerró `luis` en `contrato` (ver su fila arriba)
- contrato: **el motor A2UI está terminado** — valida con los JSON Schema oficiales y pasa los **76 casos de conformidad** de la spec (112 pruebas), y el agente real corre con el Bloque B de los orquestadores encima (prefetch de `panorama_inicial`, ciclo de acción con `ejecutar_decision`, prompts para tools compuestas). El canal `VALIDATION_FAILED` ya está conectado de punta a punta (`<Superficie alFallar>` → `reportarFallo` → el agente repinta), con tope de 2 avisos por conversación: sin tope, un registro vacío provocó once turnos de modelo seguidos (sáb 09:20)
- demo: **el corte H14 está cerrado**: fase 1 y fase 3 verificadas de punta a punta en producción (los 5 pasos, todos bajo 12 s) y `estable` apuntando a lo que corre. Plan B sin red **ensayado de verdad** (Postgres local, 3,690 filas, MCP arriba). `vision-general.md`, `trade-offs.md`, `guion-demo.md` y `pitch.md` en `construido`. **Sigue**: grabación de respaldo desde `estable`, y las preguntas del stand (hora de cierre, plataforma de entrega, registro del equipo) que llevan abiertas desde ayer y no las puede contestar nadie desde el repo

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- Auditoría del backend, el MCP y el A2UI: 12 huecos cerrados con prueba (timeout mal reportado, petición sin validar, débito como crédito, mes a medias, cuenta ajena…). 189 pruebas en verde.
- Backend completo del viaje del ADR 0004: 9 tools del MCP (7 lectura + 2 acción) con el ciclo `simular → aplicar → la lectura cambia` verificado por HTTP, y el agente real (Vercel AI SDK + MCP + A2UI validado). 63 pruebas en verde, sin llave de modelo.
