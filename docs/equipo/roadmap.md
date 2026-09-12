---
verificado: 2026-09-12 07:00
estado: vigente
---

# Roadmap de las 36 horas, por rol

Este documento manda sobre las horas del ADR 0004: se escribió a la **hora 11 del reto**
con la base, los datos y el diseño listos y **cero código de la aplicación**. Lo que
sigue está pensado para las ~25 horas que quedan.

**Supuesto de reloj**: el reto arrancó el 2026-09-11 a las 20:00 (`H0`) y cierra 36 h
después, 2026-09-13 08:00 (`H36`). **Se confirma en el stand.** Si el cierre es otro,
los bloques se recorren proporcionalmente; el orden, las dependencias y los cortes no
cambian.

## Cómo se lee

- Cada bloque tiene una **salida**: lo que debe existir al terminar. Si no existe, el
  bloque no terminó, aunque se haya acabado el tiempo.
- Cada quien trabaja **su columna**; las flechas `→ rol` son lo que desbloqueas a otro.
- Las skills entre acentos graves son las que se invocan para esa tarea.
- `probar` define "hecho" en cuatro niveles; ninguna fase cierra sin los cuatro.

## Los cortes que deciden

| Hora | Corte | Si no se cumple |
|---|---|---|
| **H14** | Spike A2UI decidido: renderer oficial o processor propio (ADR 0003) | Se va por processor propio sin discutir más |
| **H16** | `scripts/dev.sh` levanta web + mcp y ambos `/health` responden | Todo el equipo para lo suyo y ayuda al scaffold |
| **H22** | **Fase 1 completa** (Beto → plan → aplica → confirmación; Ana → otra UI), 4 niveles | Fase 3 se cancela; fase 2 se recorta a solo lectura |
| **H26** | Primer ensayo completo con cronómetro; `estable` marcado | Nadie duerme hasta que haya `estable` |
| **H32** | **Congelación.** Nada nuevo. Plan B grabado | — |
| **H35** | Último ensayo en la máquina de presentación | — |

## Estado de partida (H11)

Existe: reglas y 21 skills, 6 ADR, contrato agente↔cliente, sistema de diseño con
tokens, **datos sintéticos completos** (22 CSV, `schema.sql`, `cargar.sql`,
`reiniciar.sql`, tres perfiles: Ana, Beto, Carmen), Postgres 17 + TimescaleDB en
Coolify, `.env.example`. No existe: `apps/`, `packages/`, scaffold, ni una línea de UI
o de agente.

---

## Bloque 0 · H11–H12 · Arranque conjunto (1 h, los cuatro juntos)

| Todos | Salida |
|---|---|
| Nombres a roles en `docs/tablero.md`; cada quien corre `/inicio` | Tablero sin "—" |
| Nombre del producto decidido (Brújula / Tanto / Umbral / otro) | Va en `README.md` y en la cabecera |
| Facturación activa en Google AI Studio; llaves en el `.env` de cada máquina | Un `curl` de prueba a Gemini responde |
| Turnos de sueño acordados (abajo) | Escritos en el tablero |
| `demo` va al stand: registro, hora de cierre, plataforma de entrega, créditos, formato del pitch | `preguntas-para-manana.md` sin pendientes |

---

## Bloque 1 · H12–H15 · Cimientos en paralelo

| `contrato` | `web` | `mcp` | `demo` |
|---|---|---|---|
| **Spike A2UI** (`ui-generativa`, ADR 0003): `@a2ui/react` + `@a2ui/web_core` en un Next mínimo, un componente propio en un `Catalog`, un `.jsonl` a mano que lo pinta, y un `action` que llega a un handler. **Decisión a H14.** | **Scaffold `apps/web`** (`scaffold`, `diseno-banorte`, `shadcn`): Next + Tailwind v4, `shadcn init`, tokens de Banorte en `globals.css`, `add` de los 13 componentes base. Verificar: botón primario rojo. | **Scaffold `apps/mcp`** (`scaffold`, `tool-mcp`): Express + `@modelcontextprotocol/sdk`, Streamable HTTP, `/health`, `MCP_TOKEN`. Capa de datos `memoria` que carga los CSV de `db/datos/` al arrancar (ADR 0007). | **Guion literal** (`guion-demo.md`): los prompts exactos de Beto y Ana, con lo que debe aparecer en cada paso. |
| → `web` y `mcp`: la decisión del renderer | **Shell flotante** con datos fijos: lienzo, sidebar (`sidebar` de shadcn, variante flotante) con selector Beto/Ana, barra de conversación abajo. Sin agente todavía. | **3 tools de lectura**: `consultar_perfil`, `consultar_tarjeta`, `consultar_movimientos`, con schema en `packages/schemas`, tests y `scripts/humo.sh`. | `README.md` con comandos reales en cuanto exista `dev.sh`; registro en Devpost/MLH si aplica; dominio `.tech` comprado y apuntando al VPS. |
| **Salida H15**: decisión A2UI escrita en el ADR 0003; `packages/schemas` con los 3 primeros contratos | **Salida H15**: `pnpm dev` abre el shell con la forma de la referencia | **Salida H15**: `humo.sh` lista 3 tools y las llama | **Salida H15**: guion literal, README, dominio |

**H16 — `scripts/dev.sh` levanta todo.** Lo escribe quien termine primero su scaffold.

---

## Bloque 2 · H15–H19 · Fase 1, las piezas

| `contrato` | `web` | `mcp` | `demo` |
|---|---|---|---|
| **8 schemas del catálogo** en `packages/catalogo` (ADR 0004) con `ancho`, `heroe`, `razon` y las acciones declaradas; `catalogo.json` generado. → `web` | **4 componentes de fase 1** (`ui-generativa`, `diseno-banorte`): `ResumenTarjeta` (héroe), `PlanDePago` (radio-group), `Confirmacion`, `Calendario`. Cada uno con su `.jsonl` de ejemplo y tres estados. | `simular_reestructura` (amortización con CAT → `docs/algoritmos/amortizacion.md`), **`aplicar_plan_pago`** (acción: escribe en `acciones_aplicadas`, idempotente), `consultar_plan`. Test de cambio de estado. | Apps `web` y `mcp` creadas en Coolify desde GitHub (`desplegar`): la GitHub App para repo privado. Aún sin deploy real. |
| **Agente v0** (`agente-host`): `mcp-cliente.ts`, `modelo.ts` (Gemini, `MODELO=claude` de respaldo), `prompt.ts`, structured output contra el catálogo, stream JSONL según el contrato. Primer turno: Beto → `createSurface` + `updateComponents` con `PlanDePago`. | Renderer A2UI en el lienzo (`MessageProcessor`, rejilla bento, `ancho`), o el processor propio si el spike lo decidió. Transición de entrada 150 ms. | `reiniciar-estado` como script npm (envuelve `db/reiniciar.sql` o su equivalente en memoria). `FEATURE_POSTGRES` apagado por defecto. | Especificación del **modo transparencia** (panel con líneas `tool` y `a2ui` del stream) y de los badges LLM · MCP · A2UI; se construyen en el bloque 5. Pitch v0 (`pitch`). |
| **Salida H19**: el agente emite UI válida para el prompt 1 de Beto contra el MCP real | **Salida H19**: los 4 componentes renderizan sus `.jsonl` sin error de consola | **Salida H19**: `aplicar_plan_pago` cambia estado y `consultar_plan` lo refleja; `humo.sh` verde | **Salida H19**: Coolify listo para recibir; pitch v0 |

---

## Bloque 3 · H19–H22 · Fase 1, integración

Los cuatro sobre el mismo flujo. Nada nuevo entra hasta que esto pase.

| Paso | Quién arregla lo que se rompa |
|---|---|
| Beto: "Quiero pagar menos intereses de mi tarjeta" → `ResumenTarjeta` + `PlanDePago` | `contrato` (prompt/agente), `web` (render) |
| Elige 18 meses, toca **Aplicar plan** → `action` → `aplicar_plan_pago` → `Confirmacion` + `Calendario`; `ResumenTarjeta` dice "plan activo" | `mcp` (tool), `contrato` (ciclo) |
| Ana, misma pregunta → interfaz distinta (sin deuda) | `contrato` (adaptación en el prompt) |
| `pnpm typecheck` · `pnpm test` · `humo.sh` · guion manual (`probar`, 4 niveles) | Todos |
| **`scripts/marcar-estable.sh`** | `demo` |

**Salida H22: fase 1 completa y `estable` marcado.** Es el corte más importante del hack.

---

## Bloque 4 · H22–H27 · Fase 2 y primer ensayo

`web` y `demo` **duermen H23–H26** (ver turnos). `contrato` y `mcp` cierran la fase 2 en lectura.

| `contrato` | `web` (antes de dormir) | `mcp` | `demo` (antes de dormir) |
|---|---|---|---|
| Prompt: segunda intención ("¿en qué se me va el dinero?") con el plan ya aplicado reflejado; acción `ver_categoria`; línea `razon` en todas las superficies. | `GastoPorCategoria` (`chart`, par oscuro/rojo, `amplio`) y `DetalleCategoria` (`table`). Sus `.jsonl`. | `comparar_periodos`, categoría atípica (`docs/algoritmos/`), `consultar_movimientos` con filtros. Postgres detrás de `FEATURE_POSTGRES` probado contra Coolify (premio Tiger Data, `premio-lateral`). | Pitch v1 con la frase por pantalla; checklist adaptada; plan de grabación. |
| **Salida H26**: Beto pregunta por su gasto y ve el efecto del plan | **Salida H26**: 6 componentes renderizando | **Salida H26**: 6 tools de lectura + 1 de acción; flag Postgres funciona o queda apagado | — |

**H26 — Primer ensayo completo con cronómetro** (`checklist-demo`), lo corre `contrato`
con `mcp` tecleando. Todo lo que falle → issue `alta`. Si pasa: `estable`.

---

## Bloque 5 · H27–H31 · Fase 3, extras y pulido

`contrato` y `mcp` **duermen H27–H30**. `web` y `demo` toman el turno.

| `web` | `demo` | `contrato` / `mcp` (al despertar, H30) |
|---|---|---|
| `SimuladorMeta` (`slider`) y `MetaActiva` (`progress`); **modo transparencia** y badges LLM · MCP · A2UI; pulido visual con `diseno-banorte` (proyector, 400 px). | Premios laterales con dueño y flag: **voz con ElevenLabs** (`premio-lateral`, `FEATURE_VOZ`), registro del premio de Gemini, `.tech` verificado. Pitch v2. Deploy de `estable` a Coolify (`desplegar`) y URL pública del MCP probada con un cliente externo. | `proyectar_ahorro`, **`crear_apartado`** (acción 2), prompt: Ana obtiene la meta de ahorro como respuesta adaptativa; ensayo del guion con `MODELO=claude` una vez (ADR 0005); nivel de pensamiento decidido. |
| **Salida H31**: fase 3 renderiza | **Salida H31**: premios integrados o apagados; deploy arriba | **Salida H31**: Ana crea su apartado y `MetaActiva` refleja el estado |

Regla del bloque: **si la fase 1 se rompe por algo de aquí, se apaga el flag y se vuelve a `estable`.**

---

## Bloque 6 · H31–H33 · Congelación

| Todos |
|---|
| **H32: nada nuevo entra.** Solo arreglos de lo que el checklist marque `critica`/`alta`. |
| Plan B: grabación de la demo completa desde `estable`, en la máquina de presentación, con audio. |
| `demo`: `vision-general.md`, `trade-offs.md`, `deploy.md`, `datos-mock.md` en `construido`; `README.md` final; skills `scaffold` y `agente-host` describiendo lo real. |
| `contrato`: repaso del repo como lo verá un juez: `README` → `docs/README` → `arquitectura/`. |
| Segundo ensayo con cronómetro. `estable`. |

---

## Bloque 7 · H33–H36 · Entrega

| Hora | Qué |
|---|---|
| H33–H35 | Sueño por turnos cortos; quien no duerme, pule el pitch y las respuestas a jueces (`pitch`). |
| **H35** | **Último ensayo en la máquina de presentación**: `reiniciar-estado`, `.env` con crédito, prompts en archivo, grabación a la mano. |
| H35–H36 | Entrega según lo que dijeron en el stand (repo, video, formulario). Commit final etiquetado `entrega`. |

---

## Turnos de sueño

Con cuatro personas y 25 horas, dos ventanas de 3 h. **Nunca duermen a la vez
`contrato` y `mcp`** (son los dos lados del contrato).

| Ventana | Duermen | Despiertos |
|---|---|---|
| H23–H26 (tras cerrar fase 1) | `web`, `demo` | `contrato`, `mcp` |
| H27–H30 (tras el primer ensayo) | `contrato`, `mcp` | `web`, `demo` |
| H33–H35 | Turnos de 1 h, uno a la vez | Tres |

Si la fase 1 no cierra a H22, la primera ventana se corre; nadie duerme sin `estable`.

## Dependencias, en una frase cada una

- `contrato` desbloquea a `web` (schemas del catálogo, decisión del renderer) y a `mcp`
  (schemas de tools). Por eso arranca con el spike y los contratos, no con el agente.
- `mcp` desbloquea a `contrato` (sin tools reales el agente no tiene qué mostrar).
- `web` desbloquea a `demo` (sin pantallas no hay guion que ensayar).
- `demo` desbloquea a todos (nombre, llaves, hora de cierre, `dev.sh` documentado).

## Rituales que no se saltan

- `/inicio` al sentarse, `/cerrar` al levantarse (aunque sea a dormir 3 h). El tablero
  dice quién está en qué; la bitácora personal dice dónde se quedó.
- Commit automático al final de cada turno; `/guardar` cuando algo tiene nombre.
- Bug ajeno → `/registrar-issue` y seguir. 45 minutos atorado → preguntar o rodear.
- Ninguna fase se marca `construido` sin los cuatro niveles de `probar`.
