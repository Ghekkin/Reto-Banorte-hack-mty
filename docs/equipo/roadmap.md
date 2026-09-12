---
verificado: 2026-09-11 22:50 (hora de Monterrey)
estado: vigente
---

# Roadmap de las 36 horas, por rol

**Todas las horas son de Monterrey (UTC-6).** El servidor donde corre Claude está en
UTC+2; los scripts ya fuerzan `TZ=America/Monterrey`. Si ves una hora que no cuadra en
un doc viejo, réstale 8.

Este documento manda sobre las horas del ADR 0004. Se escribió a la **hora 3 del reto**
(viernes 22:50) con la base, los datos y el diseño listos y **cero código de la
aplicación**. Quedan 33 horas.

**Reloj**: `H0` = viernes 11 · 20:00. `H36` = domingo 13 · 08:00. **La hora de cierre se
confirma en el stand**; si es otra, los bloques se recorren y el orden no cambia.

## Cómo se lee

- Cada bloque tiene una **salida**: lo que debe existir al terminar. Si no existe, el
  bloque no terminó aunque se haya acabado el tiempo.
- Cada quien trabaja **su columna**; `→ rol` es lo que desbloqueas a otro.
- Las skills entre acentos graves son las que se invocan para esa tarea.
- `probar` define "hecho" en cuatro niveles; ninguna fase cierra sin los cuatro.

## Los cortes que deciden

| Hora | Reloj | Corte | Si no se cumple |
|---|---|---|---|
| **H6** | sáb 02:00 | `packages/a2ui` pinta `PlanDePago` desde un `.jsonl` a mano y devuelve un `action` (ADR 0008, criterios en `renderer-a2ui.md`) | `contrato` sigue solo en eso; `web` le pasa el componente listo |
| **H8** | sáb 04:00 | `scripts/dev.sh` levanta web + mcp; ambos `/health` responden | Todos dejan lo suyo y ayudan al scaffold |
| **H14** | sáb 10:00 | **Fase 1 completa** (Beto aplica su plan; Ana ve otra UI), 4 niveles | Si a H16 sigue sin cerrar: fase 3 cancelada, fase 2 solo lectura |
| **H20** | sáb 16:00 | Fase 2 en lectura + **primer ensayo con cronómetro**; `estable` marcado | Nadie duerme hasta que haya `estable` |
| **H28** | dom 00:00 | Fase 3 completa; segundo ensayo | Se apaga lo que no pase y se vuelve a `estable` |
| **H30** | dom 02:00 | **Congelación.** Plan B grabado | — |
| **H34** | dom 06:00 | Último ensayo en la máquina de presentación | — |
| **H36** | dom 08:00 | Entrega | — |

## Estado de partida (H3)

Existe: reglas y 21 skills, 7 ADR, contrato agente↔cliente, sistema de diseño con
tokens, **datos sintéticos completos** (22 CSV, `schema.sql`, `cargar.sql`,
`reiniciar.sql`, tres perfiles: Ana, Beto, Carmen), Postgres 17 + TimescaleDB en
Coolify, `.env.example`. No existe: `apps/`, `packages/`, scaffold, ni una línea de UI
o de agente.

---

## Bloque 0 · H3–H4 · vie 23:00–00:00 · Arranque conjunto

| Todos | Salida |
|---|---|
| Nombres a roles en `docs/tablero.md`; cada quien corre `/inicio` | Tablero sin "—" |
| Nombre del producto decidido (Brújula / Tanto / Umbral / otro) | Va en `README.md` y en la cabecera |
| Facturación activa en Google AI Studio; llaves en el `.env` de cada máquina | Un `curl` de prueba a Gemini responde |
| Turnos de sueño acordados (abajo) | Escritos en el tablero |
| `demo`: registro del equipo, hora de cierre, plataforma de entrega, créditos, formato del pitch (stand o chat oficial) | `preguntas-para-manana.md` sin pendientes |

---

## Bloque 1 · H4–H8 · sáb 00:00–04:00 · Cimientos en paralelo

| `contrato` | `web` | `mcp` | `demo` |
|---|---|---|---|
| **Renderer A2UI propio** (`packages/a2ui`, ADR 0008, plan en `arquitectura/renderer-a2ui.md`): schemas oficiales vendoreados, `validar`, `procesar` (reducer), `bindings`, `arbol`, `registro`, `<Superficie>`, `acciones`, layout Column/Row/Text. **Criterios de aceptación a H6 (02:00).** | **Scaffold `apps/web`** (`scaffold`, `diseno-banorte`, `shadcn`): Next + Tailwind v4, `shadcn init`, tokens de Banorte en `globals.css`, `add` de los 13 componentes base. Verificar: botón primario rojo. | **Scaffold `apps/mcp`** (`scaffold`, `tool-mcp`): Express + `@modelcontextprotocol/sdk`, Streamable HTTP, `/health`, `MCP_TOKEN`. Capa de datos `memoria` que carga los CSV de `db/datos/` al arrancar (ADR 0007). | **Guion literal** (`guion-demo.md`): los prompts exactos de Beto y Ana y lo que debe aparecer en cada paso. |
| → `web`: el registro y `<Superficie>` para montar en el lienzo. Luego `packages/schemas` con los 3 primeros contratos de tools. | **Shell flotante** con datos fijos: lienzo, sidebar (`sidebar` de shadcn, flotante) con selector Beto/Ana, barra de conversación abajo. Sin agente todavía. | **3 tools de lectura**: `consultar_perfil`, `consultar_tarjeta`, `consultar_movimientos`, con tests y `scripts/humo.sh`. | `README.md` con comandos reales en cuanto exista `dev.sh`; dominio `.tech` comprado y apuntando al VPS; registro en Devpost/MLH si aplica. |
| **Salida H8**: `packages/a2ui` con tests en verde; 3 schemas de tools | **Salida H8**: `pnpm dev` abre el shell con la forma de la referencia | **Salida H8**: `humo.sh` lista 3 tools y las llama | **Salida H8**: guion literal, README, dominio |

**H8 (04:00) — `scripts/dev.sh` levanta todo.** Lo escribe quien termine primero su scaffold.

---

## Bloque 2 · H8–H12 · sáb 04:00–08:00 · Fase 1, las piezas

| `contrato` | `web` | `mcp` | `demo` |
|---|---|---|---|
| **8 schemas del catálogo** en `packages/catalogo` (ADR 0004) con `ancho`, `heroe`, `razon` y acciones declaradas; `catalogo.json` generado. → `web` | **4 componentes de fase 1** (`ui-generativa`, `diseno-banorte`): `ResumenTarjeta` (héroe), `PlanDePago` (radio-group), `Confirmacion`, `Calendario`. Cada uno con `.jsonl` de ejemplo y tres estados. | `simular_reestructura` (amortización con CAT → `docs/algoritmos/amortizacion.md`), **`aplicar_plan_pago`** (acción: escribe en `acciones_aplicadas`, idempotente), `consultar_plan`. Test de cambio de estado. | Apps `web` y `mcp` creadas en Coolify desde GitHub (`desplegar`): la GitHub App para repo privado. Sin deploy real aún. |
| **Agente v0** (`agente-host`): `mcp-cliente.ts`, `modelo.ts` (Gemini; `MODELO=claude` de respaldo), `prompt.ts`, structured output contra el catálogo, stream JSONL según el contrato. Primer turno: Beto → `createSurface` + `updateComponents` con `PlanDePago`. | `<Superficie>` de `packages/a2ui` montada en el lienzo con la rejilla bento (`ancho`). Transición de entrada 150 ms. | `reiniciar-estado` como script npm (envuelve `db/reiniciar.sql` o su equivalente en memoria). `FEATURE_POSTGRES` apagado por defecto. | Especificación del **modo transparencia** (panel con las líneas `tool` y `a2ui` del stream) y de los badges LLM · MCP · A2UI. Pitch v0 (`pitch`). |
| **Salida H12**: el agente emite UI válida para el prompt 1 de Beto contra el MCP real | **Salida H12**: los 4 componentes renderizan sus `.jsonl` sin error de consola | **Salida H12**: `aplicar_plan_pago` cambia estado y `consultar_plan` lo refleja; `humo.sh` verde | **Salida H12**: Coolify listo para recibir; pitch v0 |

---

## Bloque 3 · H12–H14 · sáb 08:00–10:00 · Fase 1, integración

Los cuatro sobre el mismo flujo. Nada nuevo entra hasta que esto pase.

| Paso | Quién arregla lo que se rompa |
|---|---|
| Beto: "Quiero pagar menos intereses de mi tarjeta" → `ResumenTarjeta` + `PlanDePago` | `contrato` (prompt/agente), `web` (render) |
| Elige 18 meses, toca **Aplicar plan** → `action` → `aplicar_plan_pago` → `Confirmacion` + `Calendario`; `ResumenTarjeta` dice "plan activo" | `mcp` (tool), `contrato` (ciclo) |
| Ana, misma pregunta → interfaz distinta (sin deuda) | `contrato` (adaptación en el prompt) |
| `pnpm typecheck` · `pnpm test` · `humo.sh` · guion manual (`probar`, 4 niveles) | Todos |
| **`scripts/marcar-estable.sh`** | `demo` |

**Salida H14 (10:00): fase 1 completa y `estable` marcado.** El corte más importante del hack.

---

## Bloque 4 · H14–H20 · sáb 10:00–16:00 · Fase 2 y primer ensayo

`web` y `demo` **duermen H14–H18 (10:00–14:00)**. `contrato` y `mcp` avanzan la fase 2.

| `contrato` | `web` (al despertar, 14:00) | `mcp` | `demo` (al despertar, 14:00) |
|---|---|---|---|
| Prompt: segunda intención ("¿en qué se me va el dinero?") con el plan ya aplicado reflejado; acción `ver_categoria`; línea `razon` en todas las superficies. | `GastoPorCategoria` (`chart`, par oscuro/rojo, `amplio`) y `DetalleCategoria` (`table`). Sus `.jsonl`. | `comparar_periodos`, categoría atípica (`docs/algoritmos/`), `consultar_movimientos` con filtros. Postgres detrás de `FEATURE_POSTGRES` probado contra Coolify (premio Tiger Data, `premio-lateral`). | Pitch v1 con la frase por pantalla; checklist adaptada; plan de grabación. |
| **Salida H20**: Beto pregunta por su gasto y ve el efecto del plan | **Salida H20**: 6 componentes renderizando | **Salida H20**: 6 tools de lectura + 1 de acción; flag Postgres funciona o queda apagado | — |

**H20 (16:00) — Primer ensayo completo con cronómetro** (`checklist-demo`): lo corre
`demo`, `web` teclea. Todo lo que falle → issue `alta`. Si pasa: `estable`.

---

## Bloque 5 · H20–H28 · sáb 16:00–dom 00:00 · Fase 3, extras y pulido

`contrato` y `mcp` **duermen H20–H24 (16:00–20:00)**. `web` y `demo` toman el turno; al
despertar, `contrato` y `mcp` cierran la fase 3.

| `web` | `demo` | `contrato` / `mcp` (desde 20:00) |
|---|---|---|
| `SimuladorMeta` (`slider`) y `MetaActiva` (`progress`); **modo transparencia** y badges LLM · MCP · A2UI; pulido visual con `diseno-banorte` (proyector, 400 px). | Premios laterales con dueño y flag: **voz con ElevenLabs** (`premio-lateral`, `FEATURE_VOZ`), registro del premio de Gemini, `.tech` verificado. Pitch v2. Deploy de `estable` a Coolify (`desplegar`) y URL pública del MCP probada con un cliente externo. | `proyectar_ahorro`, **`crear_apartado`** (acción 2), prompt: Ana obtiene la meta de ahorro como respuesta adaptativa; ensayo del guion con `MODELO=claude` una vez (ADR 0005); nivel de pensamiento de Gemini decidido. |
| **Salida H28**: fase 3 renderiza | **Salida H28**: premios integrados o apagados; deploy arriba | **Salida H28**: Ana crea su apartado y `MetaActiva` refleja el estado |

**H28 (00:00) — Segundo ensayo.** Regla del bloque: si la fase 1 se rompe por algo de
aquí, se apaga el flag y se vuelve a `estable`.

---

## Bloque 6 · H28–H30 · dom 00:00–02:00 · Cierre y congelación

| Todos |
|---|
| **H30 (02:00): nada nuevo entra.** Solo arreglos de lo que el checklist marque `critica`/`alta`. |
| Plan B: grabación de la demo completa desde `estable`, en la máquina de presentación, con audio. |
| `demo`: `vision-general.md`, `trade-offs.md`, `deploy.md`, `datos-mock.md` en `construido`; `README.md` final; skills `scaffold` y `agente-host` describiendo lo real. |
| `contrato`: repaso del repo como lo verá un juez: `README` → `docs/README` → `arquitectura/`. |

---

## Bloque 7 · H30–H36 · dom 02:00–08:00 · Entrega

| Hora | Qué |
|---|---|
| H30–H34 | Sueño en turnos de 1–2 h, uno a la vez. Quien no duerme pule el pitch y las respuestas a jueces (`pitch`). |
| **H34 (06:00)** | **Último ensayo en la máquina de presentación**: `reiniciar-estado`, `.env` con crédito, prompts en archivo, grabación a la mano. |
| H34–H36 | Entrega según lo que dijeron en el stand. Commit final etiquetado `entrega`. |

---

## Turnos de sueño

Con cuatro personas y 33 horas, dos ventanas de 4 h más siestas al final. **Nunca duermen
a la vez `contrato` y `mcp`** (son los dos lados del contrato).

| Ventana | Reloj | Duermen | Despiertos |
|---|---|---|---|
| H14–H18 | sáb 10:00–14:00 | `web`, `demo` | `contrato`, `mcp` |
| H20–H24 | sáb 16:00–20:00 | `contrato`, `mcp` | `web`, `demo` |
| H30–H34 | dom 02:00–06:00 | Turnos de 1–2 h, uno a la vez | Tres |

Si la fase 1 no cierra a H14, la primera ventana se corre; nadie duerme sin `estable`.
La noche del viernes se trabaja entera: es cuando hay más energía y menos
interrupciones.

## Dependencias, en una frase cada una

- `contrato` desbloquea a `web` (schemas del catálogo, decisión del renderer) y a `mcp`
  (schemas de tools). Por eso arranca con el spike y los contratos, no con el agente.
- `mcp` desbloquea a `contrato` (sin tools reales el agente no tiene qué mostrar).
- `web` desbloquea a `demo` (sin pantallas no hay guion que ensayar).
- `demo` desbloquea a todos (nombre, llaves, hora de cierre, `dev.sh` documentado).

## Rituales que no se saltan

- `/inicio` al sentarse, `/cerrar` al levantarse (aunque sea a dormir). El tablero dice
  quién está en qué; la bitácora personal dice dónde se quedó.
- Commit automático al final de cada turno; `/guardar` cuando algo tiene nombre.
- Bug ajeno → `/registrar-issue` y seguir. 45 minutos atorado → preguntar o rodear.
- Ninguna fase se marca `construido` sin los cuatro niveles de `probar`.
