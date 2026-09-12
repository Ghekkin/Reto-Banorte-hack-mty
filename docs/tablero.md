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
| demo | parlack | Prod arreglado y verificado: el agente real corre los tres pasos del guion en la URL pública. Galería `/catalogo` y CI desbloqueado. No toco el frontend del producto (lo rediseña otra sesión) | sáb 05:30 |

## Bloqueos

- (ninguno)

## Siguiente

El detalle por bloque está en `equipo/roadmap.md`; aquí solo el paso inmediato.

- web: **los 8 componentes del catálogo existen y pintan** — se ven todos en **`/catalogo`** (galería con el renderer real, fuera del shell del producto). Lo que sigue es suyo: (1) el **panel de transparencia** — `usarAgente` ya devuelve `transparencia` con las líneas `tool`/`a2ui`/`error`/`fin` del turno, solo falta pintarlas con los badges LLM · MCP · A2UI; (2) el placeholder de `components/maya/lienzo.tsx` dice que el catálogo "se conecta en el siguiente paso" y ya está conectado; (3) pulido visual con el agente real en el proyector
- mcp: **12 tools con ciclos de acción verificados por HTTP** (`pnpm humo`), con **9 base + 3 del Paquete 2** (`detectar_fugas`, `cancelar_suscripcion`, `crear_tope_gasto`) y pruebas en verde. Con el Paquete 1 el agente ya no decide solo con "tiene deuda / no tiene deuda": tiene puntaje, tendencia y la deuda completa → lo que queda es el **Paquete 2** (`crear_tope_gasto`, `detectar_fugas`, `cancelar_suscripcion`, encargo en `arquitectura/paquete-2-gasto-fugas-y-control.md`) y el origen Postgres detrás de `FEATURE_POSTGRES`
- contrato: **el motor A2UI está terminado** — valida con los JSON Schema oficiales y pasa los **76 casos de conformidad** de la spec (109 pruebas), y el agente real ya corre (18 pruebas sin llave). Lo único abierto, opcional: conectar el canal `VALIDATION_FAILED` de vuelta al agente para que se corrija solo (`<Superficie alFallar>` ya lo emite, nadie lo escucha)
- demo: **el nivel 4 de `probar` ya pasó, en producción y con el modelo real** (2026-09-13 13:25): los tres pasos del guion corriendo en `https://maya.157.173.204.174.sslip.io` — Beto pide bajar intereses → `ResumenTarjeta` + `PlanDePago`; aplica el plan → `aplicar_plan_pago` → `Confirmacion` + `Calendario`; **Ana, la misma frase → `SimuladorMeta`**. La llave de Gemini está puesta en Coolify (no en el `.env` del repo). Sigue: ensayo con cronómetro y `marcar-estable.sh`. Ojo con el turno de Ana: 18 s, el más lento

## Hecho hoy

(se vacía cada día; lo importante ya quedó en `bitacora/equipo.md`)

- Auditoría del backend, el MCP y el A2UI: 12 huecos cerrados con prueba (timeout mal reportado, petición sin validar, débito como crédito, mes a medias, cuenta ajena…). 189 pruebas en verde.
- Backend completo del viaje del ADR 0004: 9 tools del MCP (7 lectura + 2 acción) con el ciclo `simular → aplicar → la lectura cambia` verificado por HTTP, y el agente real (Vercel AI SDK + MCP + A2UI validado). 63 pruebas en verde, sin llave de modelo.
