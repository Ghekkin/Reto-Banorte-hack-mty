---
verificado: 2026-09-12 01:19
implementado-en: apps/mcp/src/tools/comparar-periodos.ts
lenguaje: typescript
---

# Qué cuenta como gasto y cuál categoría se resalta

## Para cualquiera

Cuando alguien pregunta "¿en qué se me va el dinero?", la respuesta obvia es inútil: se le
va en la renta. La renta es siempre el gasto más grande y no hay nada que hacer con ese
dato. Lo que sirve es lo **que se salió de lo normal este mes**: los $4,600 de retiros de
efectivo cuando lo habitual son $2,800.

Este algoritmo hace dos cosas. Primero decide qué movimientos son gasto de verdad (mover
dinero de tu cuenta de ahorro a tu cuenta de nómina no es gastar). Y luego elige **una**
categoría para resaltar: la que más se salió de su propio patrón, no la más grande.

## La idea

**Gasto** es todo cargo del periodo excepto dos cosas: las categorías de ingreso y las que
solo mueven dinero de un bolsillo a otro (`cat_transferencias`, `cat_inversion`). Es la
misma definición con la que se generaron los datos (`scripts/generar-datos.mjs`,
`NO_ES_GASTO`), y por eso el total de la tool cuadra al centavo con
`db/datos/diagnostico_habitos.csv`. Si no cuadrara, el juez que sumara dos pantallas
distintas encontraría números distintos.

**Atípico** se mide contra la propia historia de cada categoría, no contra las demás. La
línea base es el promedio de los tres meses anteriores. Un mes solo no sirve de base:
cualquier gasto que cae quincenalmente parecería un brinco.

Para no resaltar ruido se exigen dos cosas a la vez: que el brinco sea grande **en
porcentaje** (≥ 40 % sobre su base) y **en pesos** (≥ $500). Lo primero evita señalar la
renta porque subió $300; lo segundo evita señalar que el café pasó de $40 a $80. Entre las
que pasan el filtro, gana la del brinco más grande en pesos: es la que de verdad explica
a dónde se fue el dinero.

Una categoría sin historia previa (aparece este mes por primera vez) cuenta como brinco
completo: es, literalmente, gasto nuevo.

## Paso a paso

1. Agrupa los cargos del periodo por categoría, saltando ingresos y traspasos.
2. Hace lo mismo con el periodo anterior (para la columna de comparación) y con los tres
   meses previos (para la línea base).
3. Para cada categoría calcula `brinco = gasto del periodo − promedio de la base`.
4. Descarta las que tengan `brinco < $500`, y las que tengan base y `brinco / base < 40 %`.
5. De las que quedan, gana la de mayor `brinco`. Si ninguna pasa, no hay atípica (`null`):
   un mes normal no tiene por qué tener una anomalía inventada.
6. Ordena las categorías de mayor a menor gasto y calcula la participación de cada una
   sobre el total del periodo.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | texto | `usr_beto` |
| `periodo` | `AAAA-MM`, opcional | `2026-08` (default: el mes con datos más reciente) |
| `periodoAnterior` | `AAAA-MM`, opcional | `2026-07` (default: el mes anterior) |

| Salida | Tipo | Ejemplo (Beto, agosto 2026) |
|---|---|---|
| `gastoCentavos` | entero | `3334950` |
| `gastoAnteriorCentavos` | entero | `3107400` |
| `variacionPct` | decimal | `0.0732` |
| `categorias[]` | lista | `cat_vivienda` $7,200 (21.6 %), `cat_financiero` $5,326… |
| `categoriaAtipicaId` | texto o null | `cat_retiros` |
| `efectoDelPlan` | objeto o null | `null` si no hay plan aplicado |

## Parámetros y umbrales

| Número | Valor | Qué pasa si se mueve |
|---|---|---|
| Meses de línea base | 3 | Con 1 mes, cualquier gasto quincenal parece anomalía. Con 6 se diluye un cambio reciente, que es justo lo que hay que ver |
| Brinco mínimo en % | 40 % | Más bajo empieza a señalar variación normal; más alto deja meses sin atípica |
| Brinco mínimo en pesos | $500 | Evita resaltar categorías chicas que se duplicaron sin importar |
| Categorías que no son gasto | `cat_transferencias`, `cat_inversion` | Quitarlas de la lista infla el gasto y rompe el cuadre con `diagnostico_habitos.csv` |

## Límites y supuestos

- **Los abonos no restan.** Un reembolso no baja el gasto de su categoría; es un abono y
  se cuenta aparte. Modelarlo bien pedía reconciliar cargo y devolución, que no cabe.
- **Una sola atípica por periodo.** Si dos categorías brincaron, la segunda se ve en la
  lista pero sin resaltar. La pantalla tiene una sola idea principal a propósito.
- **Los meses parciales cuentan completos.** Si el periodo es el mes en curso y va a la
  mitad, el gasto es el de medio mes contra bases de meses completos, y todo parece bajar.
  La tool no lo corrige: el agente pregunta por meses cerrados.
- **`es_atipico` de los movimientos no se usa aquí.** Ese campo marca el movimiento raro
  (`consultar_movimientos` con `soloAtipicos`); esto mide la categoría.

## Cómo se probó

`apps/mcp/src/__tests__/lecturas.spec.ts` → `describe("comparar_periodos")`:

- el gasto de Beto en agosto es `3334950`, **exactamente** el de
  `db/datos/diagnostico_habitos.csv`, y el de julio `3107400`;
- `cat_transferencias` no aparece en la lista;
- la categoría más grande es `cat_vivienda` y la atípica **no** es `cat_vivienda`;
- las participaciones suman 1.

Y por HTTP en `scripts/humo.sh`: `gasto de agosto = 3334950`.
