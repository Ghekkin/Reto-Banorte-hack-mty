---
estado: resuelto
severidad: media
area: web
github: 19
encontrado: 2026-09-13 01:32
resuelto-en: aebeb47
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

## Resolución (2026-09-13)

Se verificó que **ninguna** tool del MCP de `main` devuelve una proyección de inversión: de las 29
tools de `apps/mcp/src/tools/`, `proyectar_ahorro` calcula ahorro sin rendimiento,
`consultar_sugerencias_inversion` y `consultar_catalogo_inversiones` dan rendimientos anuales por
instrumento, y ninguna trae `totalAportadoCentavos`, `rendimientoEstimadoCentavos`,
`valorFinalEstimadoCentavos` ni `hitos`. No se rescató la tool: se reescribió la descripción.

- `packages/catalogo/src/proyeccion-crecimiento/schema.ts`: el `cuandoUsarlo` ahora dice **"HOY NO
  LA USES"**, explica por qué (la tarjeta calibra su curva contra el cierre que recibe) y manda
  "¿cuánto crecería mi dinero?" a `SugerenciasInversion` (`consultar_sugerencias_inversion`) o
  `RiesgoRendimiento` (`consultar_catalogo_inversiones`), y el ahorro a plazo a `SimuladorMeta`
  (`proyectar_ahorro`). `catalogo.json` regenerado.
- Prueba nueva `packages/catalogo/src/__tests__/tools-nombradas.spec.ts`: lee los nombres de las
  tools del código del MCP y truena si el `cuandoUsarlo` de cualquier componente nombra un
  `snake_case` que no sea tool del MCP, salida del turno o acción del catálogo. Antes del cambio
  fallaba con `["proyectar_inversion"]`; los otros 20 componentes ya pasaban.
- Docs: README del componente y `docs/como-funciona/componentes-inversion-y-credito.md` (decían
  `proyectar_ahorro` como tool asociada y `simular_inversion` como acción; la acción real es
  `elegir_plan_inversion`).

**Queda:** `apps/web/src/lib/agente/pantalla.ts:755-788` todavía rellena esta tarjeta con cifras
inventadas si el modelo la pinta sin datos (es el issue #23), y su `.jsonl` de ejemplo sigue
entrando al system prompt como few-shot de forma.
