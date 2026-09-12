---
verificado: 2026-09-12 01:19
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
   acotado por la capacidad de buró, menos la mensualidad del plan si hay uno.
4. La aportación es la que pasen; si no, la sugerida de la meta; si no, la capacidad.
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

| Salida | Tipo | Ejemplo |
|---|---|---|
| `faltanteCentavos` | entero | `4785000` |
| `capacidadMensualCentavos` | entero | lo que su flujo y buró permiten |
| `mesesEstimados` | entero | `12` con $5,000 al mes para $60,000 |
| `fechaEstimada` | `AAAA-MM-DD` | `2027-09-12` |
| `escenarios[]` | 3 puntos | mitad / sugerida / vez y media |

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
