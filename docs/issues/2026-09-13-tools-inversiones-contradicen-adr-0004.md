---
estado: resuelto
severidad: media
area: mcp
encontrado: 2026-09-13 00:00
resuelto: 2026-09-13 00:00 (opción 2 del "Pendiente": se enmienda el ADR 0004, no se retiran las tools)
---

# Las tools de Inversiones exponen al agente lo que el ADR 0004 dijo que era solo consulta programada

> **Resuelto el 2026-09-13**: decisión del equipo — Inversiones **sí** se expone al
> agente vía las tres tools de `luis`, a propósito: es lo que permite completar de
> forma correcta el viaje de Carmen (que hasta ahora no tenía ninguna intención
> propia, solo una pestaña fija en Productos). El ADR 0004 quedó enmendado otra vez
> para reflejarlo — ver `docs/decisiones/0004-caso-de-uso.md`, enmienda del
> 2026-09-13. Lo que se mantiene del hallazgo original: las tools son **de lectura
> únicamente**, y el orden estricto de construcción y la demo con Beto no cambian.

**Dónde:** `apps/mcp/src/tools/consultar-inversiones.ts`,
`apps/mcp/src/tools/consultar-catalogo-inversiones.ts`,
`apps/mcp/src/tools/consultar-historico-inversion.ts`, registradas en
`apps/mcp/src/tools/index.ts:57-59`.

**Qué esperaba:** que Inversiones siguiera fuera del alcance de las tools MCP. La
enmienda del 2026-09-12 a `docs/decisiones/0004-caso-de-uso.md` (líneas 42-44) es
explícita: "Inversiones es una pantalla de consulta programada, **no un flujo
accionable del agente**". El propio `docs/arquitectura/roadmap-mcp.md` (Nivel 4)
también las deja fuera: "las seis tablas de inversión y el perfil de Carmen... Nivel
4 — después de la congelación, o nunca. La decisión pendiente del issue de alcance se
resuelve así: opción 1, dejarlo".

**Qué pasa:** el commit `.` (mensaje vacío, ver `git log`) de `luis` agregó tres tools
de lectura de Inversiones al servidor MCP. Al estar registradas en `TOOLS`, quedan
en `listTools` y el agente (`apps/web/src/lib/agente/agente.ts`) puede llamarlas por
su cuenta en cualquier turno — exactamente lo que la enmienda del ADR dijo que no
pasaría. "Pantalla programada" implica que el dato de Inversiones lo lee
directamente `apps/web/src/app/(app)/productos/page.tsx`, sin pasar por una tool que
el modelo elige invocar.

**Cómo lo reproduje / por qué estoy seguro:** `apps/mcp/src/tools/index.ts` importa y
registra `consultarInversiones`, `consultarCatalogoInversiones` y
`consultarHistoricoInversion` en el arreglo `TOOLS` (líneas 18-20 y 57-59), que es lo
único que decide qué ve el agente vía MCP (`registrarTools` en el mismo archivo).
`docs/decisiones/0004-caso-de-uso.md:42-44` y `docs/arquitectura/roadmap-mcp.md`
(sección "Nivel 4") documentan la decisión contraria.

**Impacto en la demo:** bajo hoy — son tools de lectura, no de acción, y ningún
prompt del guion las ejercita a propósito. El riesgo es que un jurado pruebe algo
fuera del guion ("¿cómo va mi portafolio?") y el agente construya una pantalla de
inversión no ensayada con Beto, rompiendo el argumento de "tres intenciones, un solo
viaje, en orden estricto" que el ADR defiende. También es un desajuste de
documentación: el ADR y el roadmap dicen una cosa, el código hace otra, y nadie lo
resolvió con una enmienda nueva.

**Pendiente:** decidir con `luis` (o quien tenga el rol `contrato`/`mcp` en la
siguiente sesión) entre (1) sacar las tres tools de `TOOLS` y dejar Inversiones como
lectura directa de la página, como decía la enmienda, o (2) enmendar el ADR otra vez
para admitir explícitamente que Inversiones sí es una intención del agente. No lo
resuelvo de paso: es una decisión de arquitectura, no una corrección de docs.
