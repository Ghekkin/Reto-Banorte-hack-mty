---
verificado: 2026-09-12 01:19 · 2026-09-13 04:20 (fecha objetivo)
implementado-en: apps/mcp/src/tools/proyectar-ahorro.ts
lenguaje: typescript
---

# Cuánto puede ahorrar y cuándo llega

## Para cualquiera

Es la respuesta para quien **no** tiene una deuda que resolver. Si Ana pregunta lo mismo
que Beto y resulta que no trae tarjeta de crédito, lo que el agente puede hacer por ella es
otra cosa: ayudarla a llegar a una meta.

El cálculo tiene dos mitades. La primera es cuánto le sobra de verdad al mes, y sale de su
historia: lo que entró menos lo que salió, promediado en tres meses, y nunca más de lo que
su capacidad de pago permite. La segunda es aritmética honesta: dividir lo que falta entre
la aportación. Se devuelven tres escenarios para que el slider del simulador tenga de dónde
tirar, y con eso la persona ve la fecha moverse mientras arrastra.

También funciona al revés. Con el simulador en pantalla, Ana dice «lo quiero para diciembre»
y la pregunta ya no es cuándo llega, sino **cuánto tiene que apartar para llegar a tiempo**.
Le faltan $47,850 y de hoy (12 de septiembre) al 31 de diciembre caben tres meses: necesita
$15,950 al mes. Como solo le quedan $4,986.17 libres, la tarjeta se lo dice con esas cifras.
Si la fecha ya pasó o no deja ni un mes, no se inventa una aportación: se dice, y se proyecta
con lo que sí le queda libre.

Lo que este cálculo **no** hace es prometer rendimientos. Un apartado guarda dinero, no lo
invierte. Inventar un interés compuesto haría la fecha más bonita y el producto menos
honesto.

## La idea

La capacidad de ahorro es el mínimo entre dos cosas que se contradicen a propósito: **lo
que su flujo dejó libre** (ingresos menos gastos, promedio de tres meses, sin contar los
meses en rojo como negativos) y **lo que buró dice que aguanta**. Si el flujo dice $5,000 y
buró $3,000, se promete $3,000. Prometer más de lo que sobra es prometer que va a fallar.

Y si la persona ya tiene un plan de pago aplicado, su mensualidad se resta: ese dinero ya
está comprometido. Es el mismo estado mutable que mueve todo lo demás, así que la fase 3
sabe lo que pasó en la fase 1.

Un `montoObjetivoCentavos` sin `metaId` es una meta **nueva** y arranca en cero: si
heredara lo que ya lleva ahorrado en otra meta, el simulador abriría con avance que no le
corresponde.

## Paso a paso

1. Elige la meta base: la que pidan por `metaId`, o —si no se está simulando una meta
   nueva— la meta activa con la fecha objetivo más cercana. Los apartados que la propia
   demo creó cuentan como metas.
2. `faltante = objetivo − lo que ya lleva`.
3. Calcula la capacidad: promedio de `max(0, ingresos − gastos)` de los últimos tres meses,
   acotado por la capacidad de buró, menos la mensualidad del plan si hay uno (y los abonos a
   capital programados). Los gastos **mensuales fuera del banco** que la persona guardó se
   restan del flujo y de la capacidad de buró antes de comparar
   ([gastos-fuera-del-banco.md](gastos-fuera-del-banco.md)).
4. La aportación es la que pasen; si no, la sugerida de la meta; si no, la capacidad.
   **Con `fechaObjetivo` gana la fecha** (aunque venga `aportacionCentavos`):
   1. `M` = cuántos meses caben: el mayor `M` con `hoy + M meses ≤ fechaObjetivo` (`mesesHasta`).
      Es la misma suma de meses con la que se pone la fecha estimada, así que la proyección
      nunca cae después de la fecha pedida. Del 12 de septiembre al 31 de diciembre, `M = 3`.
   2. Si `M ≥ 1`: `aportación = techo(faltante / (M × periodos por mes))` (quincenal = 2). Se
      devuelve en `aportacionNecesariaCentavos` y con ella se proyecta. Si por mes rebasa la
      capacidad, `aviso`: «Para llegar al 31 de diciembre necesitas apartar $X al mes, más de
      los $Y que te quedan libres al mes.» (en quincenal dice las dos cifras).
   3. Si `M = 0` (ya pasó, o no deja ni un mes): `aportacionNecesariaCentavos: null`, se
      proyecta con la capacidad y `aviso` dice la fecha más cercana posible (`hoy + 1 mes`) y
      cuándo llegaría con lo libre.
5. `meses = techo(faltante / aportación por mes)`, con la quincenal contando doble. Mínimo
   1 mes, tope 480 (40 años).
6. `fechaEstimada = hoy + meses`.
7. Tres escenarios con la mitad, la aportación y vez y media, cada uno con su fecha y con
   `cabeEnCapacidad`.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | texto | `usr_ana` |
| `metaId` | texto, opcional | `meta_base_ana_emergencia` |
| `montoObjetivoCentavos` | entero, opcional | `6000000` |
| `aportacionCentavos` | entero, opcional | `500000` |
| `frecuencia` | `mensual` \| `quincenal` | `mensual` |
| `fechaObjetivo` | `AAAA-MM-DD`, opcional | `2026-12-31` («para diciembre»: el modelo manda el último día del mes) |

| Salida | Tipo | Ejemplo |
|---|---|---|
| `faltanteCentavos` | entero | `4785000` |
| `capacidadMensualCentavos` | entero | lo que su flujo y buró permiten |
| `mesesEstimados` | entero | `12` con $5,000 al mes para $60,000 |
| `fechaEstimada` | `AAAA-MM-DD` | `2027-09-12` |
| `escenarios[]` | 3 puntos | mitad / sugerida / vez y media |
| `aportacionNecesariaCentavos` | entero o `null` | `1595000` para Ana «para diciembre»; `null` sin fecha o si la fecha no deja un mes |
| `aviso` | texto o `null` | «Para llegar al 31 de diciembre necesitas apartar $15,950.00 al mes, más de los $4,986.17 que te quedan libres al mes.» |

## Parámetros y umbrales

| Número | Valor | De dónde salió |
|---|---|---|
| Meses de flujo | 3 | Igual que la línea base del gasto: un mes es ruido, seis diluye |
| Meses en rojo | cuentan como 0, no negativos | Un mes malo no debe borrar la capacidad de los otros dos |
| Tope de proyección | 480 meses (40 años) | Más allá el número no informa, asusta |
| Escenarios | ×0.5, ×1, ×1.5 | Tres puntos bastan para que el slider se sienta; más es ruido en pantalla |
| Rendimiento | 0 | Decisión: un apartado no invierte (ver arriba) |

## Límites y supuestos

- **`aportacionCentavos: 0` (o negativa) vale como "no me dijiste nada"** y se usa la
  capacidad calculada. El cero llega por dos caminos reales: el slider del
  `SimuladorMeta` en su mínimo, y el modelo cuando no sabe qué poner. Rechazarlo tumbaba
  la pantalla completa (ensayo del 2026-09-12).
- Si la capacidad calculada **también** es cero —alguien con la deuda al límite, como
  Beto— no hay de dónde proyectar y la tool sí falla, diciendo que hace falta una
  aportación explícita. El agente entonces propone el monto, que es lo correcto: la
  decisión es suya, no del cálculo.

- **La fecha objetivo cuenta meses enteros desde hoy.** «Para el 31 de diciembre» y «para el
  12 de diciembre» dan lo mismo (3 meses); «para el 11 de diciembre», 2. Con quincenal no se
  cuentan quincenas reales del calendario sino dos por mes, igual que la proyección.
- **El aviso no bloquea.** Si la aportación que hace falta rebasa lo libre, se proyecta con
  ella de todos modos: la persona pidió esa fecha y el aviso le dice el costo.
- **Sin rendimiento y sin inflación.** El objetivo es nominal.
- **Aportaciones iguales y puntuales.** No modela que un mes no alcance.
- **La quincenal es "dos por mes"**, no 26 al año. Simplifica la fecha y la diferencia es
  de días.
- **La capacidad es histórica.** Si la persona acaba de cambiar de trabajo, los tres meses
  previos no la describen.
- **Un apartado nace en cero.** El dinero que ya tenía sigue siendo saldo de su cuenta; el
  apartado no se lo "lleva" para que el avance del primer día sea honesto.

## Cómo se probó

`apps/mcp/src/__tests__/acciones.spec.ts` → `describe("crear_apartado y proyectar_ahorro")`:

- la meta activa de Ana se proyecta con tres escenarios, y aportar más tarda menos;
- $12,000 con $1,000 al mes son 12 meses; con $4,000, 3 meses, y la fecha se adelanta;
- `crear_apartado` de $60,000 a $5,000 al mes da 12 meses, y la proyección siguiente ya
  toma esa meta: el ciclo se cierra;
- no crea dos apartados con el mismo nombre ni acepta una aportación mayor que el objetivo.

`apps/mcp/src/__tests__/ahorro-por-fecha.spec.ts` (fecha objetivo):

- Ana «para diciembre» (2026-12-31): $15,950 al mes, 3 meses, fecha estimada 2026-12-12 y aviso
  exacto; la meta nueva de $96,000 desde cero pide $32,000;
- 2027-12-31: $3,190 al mes, 15 meses, sin aviso; para seis fechas, la estimada nunca pasa de la
  objetivo y un centavo menos ya no llegaría;
- quincenal: $7,975 por quincena; con fecha y aportación a la vez gana la fecha;
- fecha pasada y fecha sin un mes: `aportacionNecesariaCentavos: null`, aviso y proyección con lo
  libre (10 meses);
- sin fecha, la proyección de siempre con los campos nuevos en `null`.
