---
estado: resuelto
severidad: media
area: mcp
encontrado: 2026-09-13 06:59
github: 45
resuelto-en: d9840cc
---

# «La meta para diciembre»: `proyectar_ahorro` dice $32,000 al mes en el aviso y $16,000 en el escenario

**Dónde:** `apps/mcp/src/tools/proyectar-ahorro.ts` (`aportacionParaFecha`/`mesesHasta`, ~64-94 y 186-229) y el
parche determinista con que el host ajusta el `SimuladorMeta` en su lugar; caso «Ana · la meta para diciembre» de
`scripts/probar-guion.mjs`.

**Qué esperaba:** que el aviso, el escenario y la tarjeta digan la misma aportación para la misma fecha.

**Qué pasa:** con `{"fechaObjetivo":"2026-12-31","montoObjetivoCentavos":9600000}` sin `metaId`, el resultado trae
`aviso: "Para llegar al 31 de diciembre necesitas apartar $32,000.00 al mes…"` y
`escenarios[0]: {aportacionCentavos: 1600000, mesesEstimados: 6, fechaEstimada: "2027-03-12"}`. El guion esperaba
`aportacionCentavos: 1595000` (el valor con `metaId`, que a las 04:31 dio otra cifra: 797500).

**Cómo lo sé:** ensayo del guion contra producción (`8060918`) el 13 a las 06:55: FALLA «la pantalla no dice
aportacionCentavos 1595000»; llamadas de `proyectar_ahorro` con `fechaObjetivo` en `banorte.corrida_tools`.

**Impacto en la demo:** medio: el texto de Maya y la tarjeta pueden contradecirse en una cifra.

**Arreglo:** una sola aportación por fecha en el resultado cuando hay `fechaObjetivo`, la que usan el aviso, el
escenario y el parche; y la expectativa del guion calculada por la misma regla.

## Resolución

Resuelto en `d9840cc`. **Corrección al diagnóstico:** la tool no se contradecía: `escenarios[0]` es el conservador (la mitad); la aportación de la fecha es `aportacionCentavos` = `aportacionNecesariaCentavos` = `escenarios[1]` = la cifra del aviso, y es la que el host escribe en la tarjeta. El fallo era que el modelo manda el objetivo de la tarjeta sin `metaId` y la tool lo trataba como meta nueva desde cero, ignorando los $48,150 que Ana ya tiene en su fondo de $96,000 ($32,000 al mes en vez de $15,950). Ahora un `montoObjetivoCentavos` sin `metaId` igual al objetivo de una meta activa de la persona es esa meta (`metaActivaConObjetivo` en `apps/mcp/src/tools/proyectar-ahorro.ts`); si hay varias, la que más lleva ahorrado; cualquier otro monto sigue siendo meta nueva. La expectativa del guion (`1595000`) ya no depende de que el modelo mande `metaId`. Pruebas en `ahorro-por-fecha.spec.ts` con los argumentos reales del ensayo (contra el código anterior fallan 3). Algoritmo en `docs/algoritmos/proyeccion-de-ahorro.md`.
