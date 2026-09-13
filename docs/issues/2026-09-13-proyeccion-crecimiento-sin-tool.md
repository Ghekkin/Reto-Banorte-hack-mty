---
estado: abierto
severidad: media
area: web
github: 19
encontrado: 2026-09-13 01:32
---

# `ProyeccionCrecimiento` le dice al modelo que ya llamó `proyectar_inversion`, una tool que no existe en `main`

**Dónde:** `packages/catalogo/src/proyeccion-crecimiento/schema.ts:33` (`cuandoUsarlo`), que
viaja al system prompt y a `catalogo.json`.

**Qué esperaba:** que la descripción del componente nombre la tool que llena sus cifras
(`totalAportadoCentavos`, `rendimientoEstimadoCentavos`, `valorFinalEstimadoCentavos`, `hitos`).

**Qué pasa:** la tool `proyectar_inversion` (y `simular_credito`) llegaron en el commit
grande del sábado 22:08 y se revirtieron (`6e29175`, `e7dda81`), pero `df5dfae` volvió a
meter la descripción que las nombra. Ninguna tool del MCP de `main` devuelve esos campos
(`grep valorFinalEstimadoCentavos apps/mcp/src packages/schemas/src` no encuentra nada), así
que para pintar la tarjeta el modelo tiene que inventar el valor futuro, que es justo lo que
la descripción le prohíbe.

**Cómo lo reproduje:** leyendo el catálogo contra la lista de `/health` del MCP (24 tools,
ninguna `proyectar_inversion`). No se corrigió aquí: la decisión es del dueño del catálogo
(rescatar la tool de `2a60a89` o reescribir la descripción).

**Impacto en la demo:** se nota si alguien pide "¿cuánto crecería mi dinero si invierto?":
la tarjeta sale con cifras que no calculó ninguna tool, o no sale.
