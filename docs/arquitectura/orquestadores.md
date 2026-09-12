---
estado: propuesta
fecha: 2026-09-12 08:30 (hora de Monterrey)
---

# Orquestadores: plan en 2 bloques para desarrollo en paralelo

> **Lectura de 30 segundos.** El MCP ya tiene 18 tools (14 lectura + 4 acción) que cubren
> los tres viajes (Beto/deuda, Ana/gasto, Carmen/ahorro-inversión). Con la superficie de
> datos completa, lo que falta no es más tool: es **orquestación** — que el modelo pida
> menos viajes redondos y que el ciclo de acción sea más corto. Esto ya estaba propuesto
> en `docs/arquitectura/roadmap-mcp.md` (sección 4, O1–O4) y **O1 (`panorama_inicial`) ya
> está hecho**; este doc concreta O2, O3 y O4 en tareas de archivo y las reparte en **dos
> bloques independientes** para que dos personas los construyan a la vez sin pisarse:
> **Bloque A vive en `apps/mcp`** (rol `mcp`), **Bloque B vive en `apps/web/src/lib/agente`**
> (rol `contrato`). Convergen en un solo punto de integración al final.

## 0. Por qué esto y por qué ahora

Confirmado en el código a esta hora (`apps/mcp/src/tools/index.ts`, 18 tools):

- **O1 — `panorama_inicial`**: hecho. Colapsa perfil + tarjeta + diagnóstico + deuda en
  una llamada con un campo `situacion`.
- **O2 — `ejecutar_decision`**: no existe. El ciclo de acción sigue en 3 pasos (`acción →
  tool de mutación → tool de lectura → pintar`).
- **O3 — prefetch determinista**: no existe. `agente.ts` no llama nada antes de que el
  modelo decida; el modelo sigue abriendo cada turno a ciegas y puede olvidar llamar
  `panorama_inicial` primero (hoy es una instrucción de prompt, no una garantía).
- **O4 — fachada de dos niveles**: con 18 tools ya se pasó el umbral de 13-14 que el
  propio roadmap-mcp marcaba para evaluarla. Solo la deuda tiene fachada
  (`panorama_inicial`); gasto y ahorro/inversión siguen siendo 2-3 llamadas atómicas
  sueltas por turno.

No se toca nada de `packages/catalogo`, del renderer A2UI ni de las tools atómicas
existentes — siguen expuestas para el detalle, tal como manda O4. Esto es orquestación
**encima** de lo que ya existe, no un reemplazo.

## 1. El contrato compartido — antes de separarse (~30–45 min, los dos juntos)

Regla del repo: "contrato primero, mock primero" y "un cambio de schema no está
terminado hasta que todos sus consumidores cambiaron". Como aquí hay dos consumidores en
dos bloques distintos, esta parte se acuerda **junta** antes de repartirse, para que cada
bloque pueda avanzar solo contra un contrato fijo:

1. **Nombres de las 3 tools nuevas**, todas registradas en `apps/mcp/src/tools/index.ts`:
   - `analizar_gasto(usuarioId)` — lectura compuesta para el viaje de Ana.
   - `analizar_ahorro(usuarioId)` — lectura compuesta para el viaje de Carmen.
   - `ejecutar_decision(usuarioId, accion, context)` — acción compuesta, para los 4
     viajes.
2. **Schemas Zod** en `packages/schemas/src/tools/analizar-gasto.ts`,
   `analizar-ahorro.ts`, `ejecutar-decision.ts`, siguiendo el patrón exacto de
   `packages/schemas/src/tools/panorama-inicial.ts` (`EntradaX`/`SalidaX`, un enum
   `SituacionX` si aplica, `.describe()` en cada campo que el modelo necesite entender).
   Se escriben junto con las 4 entradas/salidas ya decididas abajo (§2, §3) para que
   nadie improvise un shape distinto al que el otro bloque ya está mockeando.
3. **La tabla de despacho de `ejecutar_decision`** ya sale gratis del código actual: en
   `packages/a2ui/src/acciones.ts:42` (`esAccionDeMutacion`) las acciones que mutan
   **se llaman igual que su tool**. La tabla es literal:

   ```ts
   const TOOLS_DE_MUTACION = {
     aplicar_plan_pago: aplicarPlanPago,
     crear_apartado: crearApartado,
     cancelar_suscripcion: cancelarSuscripcion,
     crear_tope_gasto: crearTopeGasto,
   } as const;
   ```

   No hay que inventar un mapeo nuevo ni acoplar nada que no esté acoplado ya.
4. **Quién es dueño de qué feedback loop**: si `ejecutar_decision` falla, sigue el mismo
   contrato de error que ya usa `registro.ts` (`isError`, nunca lanza). Bloque B lo
   consume igual que hoy consume el error de una tool suelta.

Con esto fijo, los dos bloques trabajan en paralelo **sin esperarse**: Bloque A implementa
contra el schema real, Bloque B implementa contra el mismo schema con un mock en sus
tests (`apps/web/src/lib/agente/__tests__`, que ya usa `herramientas` inyectadas en
`OpcionesDeTurno` en vez de un MCP real).

## 2. Bloque A — Orquestador del MCP

**Rol:** `mcp` · **Dueño sugerido:** Luis (ya dueño del dominio; hizo el paquete de
Inversiones y las 3 tools de Paquete 2).
**Dónde:** `apps/mcp/`. No toca `apps/web/`.

### A1 · `analizar_gasto(usuarioId)` — fachada de lectura para Ana

Junta lo que hoy son 2-3 llamadas sueltas del viaje de gasto en una:

- Reusa `comparar_periodos` (gasto del mes, categoría atípica) y `detectar_fugas`
  (suscripciones + recurrentes no suscritos) — mismo patrón que `panorama-inicial.ts`
  hace con `resumenDeDeuda`: llamar directo a las funciones de `apps/mcp/src/dominio/`
  que ya usan esas tools (`dominio/suscripciones.ts`, y lo que respalde
  `comparar-periodos.ts`), no a las tools MCP entre sí.
- Suma el estatus de `topes_gasto` si existen (`dominio/topes.ts`), ya que hoy no hay
  ninguna tool que lo exponga fuera de `crear_tope_gasto`.
- Devuelve un campo de clasificación tipo `situacion` — p. ej. `patronGasto`: enum como
  `fuga_detectada | gasto_estable | sobre_tope`. Si el umbral que decide esto es no
  trivial, va su doc en `docs/algoritmos/` (mismo patrón que
  `docs/algoritmos/deteccion-de-fugas.md`, que probablemente ya cubre parte de esto —
  revisar antes de escribir un doc nuevo, puede bastar con extenderlo).
- Archivo: `apps/mcp/src/tools/analizar-gasto.ts`. Registrar en
  `apps/mcp/src/tools/index.ts`, bloque de lectura, junto a las otras compuestas.

### A2 · `analizar_ahorro(usuarioId)` — fachada de lectura para Carmen y Ana

- Reusa `proyectar_ahorro` (capacidad, meta activa, escenarios) y, cuando el segmento del
  usuario es patrimonial, `consultar_inversiones` (posición del portafolio). Mismo
  patrón: llamar a las funciones de `dominio/` (`consultas.ts`, `tiempo.ts`,
  `inversiones.ts`), no encadenar tools.
- Para Beto y Ana (sin portafolio) el bloque de inversión sale `null` — mismo criterio
  que `tarjeta: null` en `panorama_inicial` cuando no aplica.
- Archivo: `apps/mcp/src/tools/analizar-ahorro.ts`.

### A3 · `ejecutar_decision(usuarioId, accion, context)` — orquestador de acción (O2)

- Recibe el nombre de la acción tal como llega del `action` de la UI (`aplicar_plan_pago`,
  `crear_apartado`, `cancelar_suscripcion` o `crear_tope_gasto`) y el `context` ya resuelto
  (incluida `idempotencyKey`).
- Despacha a la tabla `TOOLS_DE_MUTACION` de §1.3, ejecuta la mutación existente **sin
  reimplementar su lógica** (llama a la función `manejar` de la tool atómica
  correspondiente — no la reescribas), y **encadena la lectura post-acción** que hoy el
  agente pide aparte (`consultar_plan` tras `aplicar_plan_pago`, `proyectar_ahorro` tras
  `crear_apartado`, etc.).
- Devuelve `{ accion, resultadoAccion, estadoPosterior }` en una sola respuesta. El ciclo
  pasa de 3 pasos a 2: `acción → ejecutar_decision → pintar`.
- Si `accion` no está en la tabla, error de tool normal (`isError`), nunca lanza — mismo
  contrato que toda tool de este repo.
- Archivo: `apps/mcp/src/tools/ejecutar-decision.ts`. Clase `"accion"` en `registro.ts`
  (para que las anotaciones MCP salgan correctas: `idempotentHint: true`).
- **No agregues lógica de negocio nueva aquí** — es la advertencia del propio
  roadmap-mcp.md: `ejecutar_decision` solo despacha y relee, si acumula reglas propias
  vuelve a acoplar el MCP a la UI de una forma que sí sería un problema.

### Salida de Bloque A

- 3 tools nuevas registradas, con tests (`apps/mcp/src/tools/__tests__` o donde vivan hoy
  los tests de tools) que cubren: el shape de salida contra el schema, el caso `null`
  cuando no aplica, y que `ejecutar_decision` deja el mismo estado que la secuencia
  manual de 3 pasos dejaría hoy.
- `pnpm humo` lista las 21 tools y las 3 nuevas responden.
- Doc en `docs/como-funciona/` para cada una (plantilla de dos niveles).

## 3. Bloque B — Orquestador del agente

**Rol:** `contrato` · **Dueño sugerido:** quien tome ese rol ahora (fila `contrato` del
tablero está vacía).
**Dónde:** `apps/web/src/lib/agente/`. No toca `apps/mcp/`.

### B1 · Prefetch determinista (O3)

- En `agente.ts`, después de `conectarMcp()`/`herramientasDelMcp()` (línea ~66-71) y
  antes de `streamText`, una llamada directa y determinista a `panorama_inicial` para
  `peticion.usuarioId` — sin pasar por el bucle de tools del modelo. El resultado se
  inyecta en el bloque de contexto que arma `historial.ts` (`bloqueDeContexto`, hoy en
  `apps/web/src/lib/agente/historial.ts:31-67`) como un bloque nuevo, p. ej.
  `panorama ya calculado: {...}`.
- `mensajesDelTurno` en `historial.ts` necesita recibir ese panorama como parámetro
  (cambia su firma: hoy solo toma `PeticionAgente`). Actualiza `usar-agente.ts` y
  `tipos.ts` si el tipo de retorno de `mensajesDelTurno` o `PeticionAgente` cambia.
- **Solo el primer turno de una conversación** necesita el prefetch — si ya hay
  `peticion.superficie` (turno ≥ 2), no tiene sentido repetirlo; el dato ya vive en el
  data model de la pantalla.
- Actualiza `prompt.ts`: decirle al modelo que el panorama ya viene en el contexto, que
  **no vuelva a llamar `panorama_inicial`** en el primer turno (ahorra un round trip que
  hoy sí ocurre).
- Si el prefetch falla (MCP caído), no debe tumbar el turno: cae a como está hoy (el
  modelo decide sin panorama), mismo criterio de degradación que ya usa el resto de
  `agente.ts` (errores de tool no lanzan).

### B2 · El prompt prefiere las compuestas (parte de O4)

- Una vez que Bloque A registre `analizar_gasto` y `analizar_ahorro`, actualizar
  `prompt.ts` con la regla del roadmap: *"empieza siempre por la tool compuesta que
  corresponda al tema (`panorama_inicial`, `analizar_gasto`, `analizar_ahorro`); baja a
  una atómica (`consultar_movimientos`, `consultar_creditos`, etc.) solo si necesitas un
  detalle que la compuesta no trae"*.
- Esto es prompt, no código: bloquea con el resto de Bloque B hasta que el contrato de
  §1 esté fijo (los nombres y qué trae cada una), pero no depende de que Bloque A
  termine de implementarlas — se puede escribir contra el schema acordado y probar con
  un mock en `__tests__` antes de que la tool real exista.

### B3 · El ciclo de acción usa `ejecutar_decision` (parte de O2)

- En `historial.ts`, la rama de `peticion.accion` (líneas 50-59) hoy le dice al modelo
  que llame **la tool de mutación por su nombre**. Cambia el texto para que instruya
  llamar `ejecutar_decision` con `accion: name` y el mismo `context` — el nombre de la
  acción no cambia (sigue siendo `aplicar_plan_pago`, etc.), solo cambia qué tool la
  ejecuta.
- Este es el punto de integración real con Bloque A: hasta que `ejecutar_decision` no
  esté registrada en el MCP, Bloque B prueba esto con una tool mock del mismo nombre en
  sus tests (`herramientas` en `OpcionesDeTurno`, ya soportado por `correrTurno`).

### B4 · Cerrar el canal `alFallar` — si sobra tiempo, no bloquea lo anterior

- `<Superficie alFallar>` (`packages/a2ui`) ya emite cuando un mensaje A2UI no valida en
  el cliente, pero nada lo escucha (gap real, visto en `apps/web/src/components/maya/
  lienzo.tsx` y `consola-maya.tsx`). El contrato para esto **ya existe**:
  `PeticionAgente.error` en `tipos.ts` y el manejo en `historial.ts:43-48` — es
  literalmente lo que O3/B1 usa como patrón para inyectar contexto extra.
  Conectar `alFallar` para que dispare el mismo camino que hoy usa el error de servidor
  (`VALIDATION_FAILED` → siguiente petición con `error` poblado) es completar un ciclo
  que ya está diseñado, no diseñar uno nuevo. Vive en `usar-agente.ts` +
  `lienzo.tsx`/`consola-maya.tsx`, no en `agente.ts`.

### Salida de Bloque B

- El primer turno de cualquier conversación arranca con panorama precargado: un round
  trip menos, visible en las líneas `tool` del stream de transparencia.
- El ciclo de acción de Beto pasa de 3 líneas `tool` a 2 en el panel de transparencia.
- `pnpm typecheck` y `pnpm test` en verde en `apps/web`.

## 4. Punto de integración (los dos juntos, al final)

1. `pull` de ambos lados; typecheck limpio en los 5 paquetes.
2. `pnpm dev` + `pnpm humo` con las 21 tools.
3. Guion manual (`probar`, nivel 4) con los tres prompts (Beto, Ana, Carmen):
   revisar en el panel de transparencia que el turno de Beto arranca sin llamar
   `panorama_inicial` explícitamente (ya vino del prefetch) y que "Aplicar plan" deja
   **2** líneas `tool` en vez de 3.
4. Actualizar `docs/arquitectura/roadmap-mcp.md` §4-5: marcar O2/O3/O4 como hechos con
   fecha, igual que ya se hizo con O1.
5. `docs/como-funciona/` para las 3 tools nuevas (dueño: quien las escribió).
6. Cada quien actualiza **solo su fila** de `docs/tablero.md`.
7. Si algo de esto rompe la Fase 1/2/3 ya estable: se apaga (no se deja a medias) y
   `docs/issues/` + `gh issue create`, como manda la regla 2 de `CLAUDE.md`.

## 5. Qué no cambia

- Las 18 tools atómicas actuales siguen expuestas y con sus tests — nadie las borra.
- `ADR 0004` (los tres viajes) no se toca; esto es rendimiento y forma de llamar, no
  alcance nuevo.
- Ninguna tool nueva genera texto/prosa — siguen siendo datos y clasificaciones sobre
  umbrales fijos, igual que `situacion` en `panorama_inicial` (regla de la sección 3 de
  `roadmap-mcp.md`, "tools de mejora de lenguaje: no").
- `packages/catalogo` y el renderer A2UI no cambian: esto vive completo por debajo del
  contrato tool ↔ agente.

## 6. Riesgo del reloj

Este trabajo es exactamente el "Nivel 1" (O3+O1) y "Nivel 3" (O2) que
`docs/arquitectura/roadmap-mcp.md` ya había calendarizado para H18-H28, **después** de
que Fase 1 cierre en H14. Si Fase 1 (Beto aplica su plan, Ana ve otra UI) todavía no pasa
los 4 niveles de `probar`, eso manda sobre esto: los orquestadores no valen nada si el
flujo base no está `estable`. Confirmen con `docs/tablero.md` antes de arrancar los dos
bloques que Fase 1 ya cerró.
