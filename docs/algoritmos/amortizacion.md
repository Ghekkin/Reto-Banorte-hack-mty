---
verificado: 2026-09-12 01:19
implementado-en: apps/mcp/src/dominio/finanzas.ts (y scripts/lib/finanzas.mjs, el generador)
lenguaje: typescript
---

# Amortización, CAT y el ahorro de una reestructura

## Para cualquiera

Cuando alguien trae una tarjeta al límite y solo paga el mínimo, casi todo lo que paga se
va en intereses y la deuda no baja. La alternativa que ofrece un banco es convertir ese
saldo en mensualidades fijas a una tasa menor: pagas más al mes, pero terminas.

Este módulo calcula las dos rutas y las compara, porque el número que convence no es la
tasa: es **"pagando el mínimo tardarías 17 años; con el plan a 18 meses te ahorras
$132,065"**. Eso hay que calcularlo bien, porque es lo que la interfaz va a poner grande y
lo primero que un juez va a querer verificar.

Tres piezas:

- **La mensualidad**: cuánto pagas al mes si repartes la deuda en N meses parejos.
- **La tabla de amortización**: pago por pago, cuánto se va a intereses y cuánto baja la
  deuda de verdad.
- **El CAT**: el costo real anual del crédito, incluyendo comisiones. Es el número que
  permite comparar dos ofertas.

## La idea

**La mensualidad** viene del sistema francés: pagos iguales donde al principio casi todo
es interés y al final casi todo es capital. La fórmula sale de exigir que el valor
presente de N pagos iguales sea igual a la deuda de hoy.

**El CAT no tiene fórmula cerrada.** Es la tasa que hace que el valor presente de todo lo
que vas a pagar sea igual a lo que de verdad recibiste (el monto menos la comisión de
apertura). Eso es una TIR, y se despeja numéricamente. Aquí se resuelve **por bisección**,
no por Newton-Raphson: la bisección converge siempre en este rango, no necesita derivada y
no depende de una semilla afortunada. 200 iteraciones sobran para precisión de 1e-10, y a
esta escala el costo es irrelevante.

**El pago mínimo no es un porcentaje plano del saldo**, y esto importa mucho. La primera
versión usaba 5 % del saldo, y con una tasa de 48.9 % anual eso apenas cubre los
intereses: la deuda tardaba más de 600 meses en amortizar, el generador topaba su límite y
escupía "te ahorras 582 meses". Cierto en la aritmética, absurdo en pantalla. La fórmula
real en México es **intereses del periodo con IVA más un porcentaje del capital** (1.5 %
es lo típico), con un piso en pesos. Con eso la liquidación es larga pero finita —209
meses para Beto— y el argumento del plan sigue siendo devastador sin dejar de ser
verificable.

## Paso a paso

### Mensualidad

1. Convierte la tasa anual a **tasa mensual efectiva con IVA**: `i = (tasa / 12) × 1.16`.
   El IVA sobre intereses es 16 % en México y va dentro de la cuota, así que tiene que
   estar en la tasa que se usa para calcularla.
2. Aplica `M = P × i / (1 − (1+i)^−n)`.
3. Redondea a centavos enteros.

### Tabla de amortización

Por cada pago, sobre el saldo vivo:

1. `interes = saldo × (tasa_anual / 12)` — sin IVA, porque el IVA se calcula sobre el
   interés y se reporta aparte.
2. `iva = interes × 0.16`.
3. `capital = cuota − interes − iva`.
4. `saldo_final = saldo − capital`.
5. **El último pago absorbe el residuo.** Redondear cada pago a centavos deja unos pocos
   centavos de diferencia acumulada; el último pago se recalcula como
   `capital = saldo restante` y su cuota se ajusta. El lugar honesto para el residuo es el
   último pago, no un centavo perdido en cada fila.

El schema exige las dos identidades con `CHECK`:
`saldo_final = saldo_inicial − capital` y `mensualidad = capital + interés + IVA`.

### CAT por bisección

1. `recibido = monto × (1 − comisión_apertura)`.
2. Define `f(r) = Σ M/(1+r)^k − recibido` para k de 1 a n.
3. Busca la raíz en `[0, 1]` (0 % a 100 % **mensual**, un techo absurdo a propósito).
   Si `f(1) > 0` la deuda es imposible de amortizar y devuelve un centinela.
4. 200 bisecciones, y anualiza: `CAT = (1 + r)^12 − 1`.

### Escenario de pago mínimo

Mes a mes hasta liquidar, con tope de 600 meses:

1. `interes = saldo × tasa/12`, `iva = interes × 0.16`.
2. `pago = max(interes + iva + saldo × 1.5 %, piso)`.
3. Si el pago no cubre ni intereses, devuelve `nunca_liquida: true` en vez de colgarse.
4. `saldo = saldo + interes + iva − pago`; acumula lo pagado.

### Oferta de reestructura

Junta todo: mensualidad y CAT del plan, escenario de mínimo sobre la misma deuda, y
`ahorro_vs_minimo = total_pagado_con_minimo − total_del_plan`. Se calcula aquí y no en el
componente de UI: es el número que decide la conversación, no un detalle de presentación.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `saldoCentavos` | entero | `4738600` ($47,386) |
| `tasaAnual` | decimal | `0.4890` (48.90 %) |
| `plazoMeses` | entero | `18` |
| `comisionPct` | decimal | `0.0250` (2.50 %) |

| Salida | Tipo | Ejemplo |
|---|---|---|
| `mensualidad()` | entero centavos | `319335` ($3,193.35) |
| `tablaAmortizacion()` | array de N filas | `{ numero_pago: 1, capital_centavos: ..., saldo_final_centavos: ... }` |
| `calcularCAT()` | decimal 4 | `0.2858` (28.58 %) |
| `escenarioPagoMinimo()` | `{ meses, total_pagado_centavos, nunca_liquida }` | `{ meses: 209, ... }` |

### Las cuatro ofertas de Beto

Saldo $47,386 al 48.90 % anual. Pagando el mínimo: **209 meses**.

| Plazo | Tasa del plan | Mensualidad | CAT | Ahorro vs. mínimo | Meses menos |
|---|---|---|---|---|---|
| 12 | 18.90 % | $4,433.33 | 24.27 % | $136,346 | 197 |
| **18** | **21.90 %** | **$3,193.35** | **28.58 %** | **$132,065** | **191** |
| 24 | 24.90 % | $2,622.34 | 33.03 % | $126,609 | 185 |
| 36 | 27.90 % | $2,073.45 | 37.62 % | $114,901 | 173 |

El de 18 meses está marcado como recomendado porque es el primero cuya mensualidad cabe en
su capacidad de pago según `buro`.

## Parámetros y umbrales

| Número | Valor | De dónde salió |
|---|---|---|
| `IVA` | 0.16 | IVA sobre intereses en México |
| `pctCapital` del mínimo | 0.015 | 1.5 % del capital, lo típico del mercado. Subirlo acorta el escenario y encoge el ahorro; bajarlo lo vuelve inverosímil |
| Piso del mínimo | $200 | Evita mínimos de centavos en saldos chicos |
| Tope de meses | 600 | 50 años. No es decorativo: con minimos bajos la deuda puede no amortizar nunca, y hay que reportarlo en vez de colgar el proceso |
| Iteraciones de bisección | 200 | Precisión ~1e-10, sobrado |
| Rango de búsqueda del CAT | `[0, 1]` mensual | Techo absurdo para garantizar que la raíz esté dentro |

## Límites y supuestos

- **Todos los pagos son puntuales y del monto exacto.** No modela pago tardío, pago
  parcial, ni intereses moratorios. Beto tiene 12 días de mora como *dato*, pero su tabla
  de amortización no cobra recargos.
- **Tasa fija.** Ningún crédito es a tasa variable, ni se revisa la tasa a mitad del plazo.
- **El CAT ignora seguros y anualidades.** Solo entra la comisión de apertura. Un CAT real
  incluye seguro de vida, seguro de daños y comisiones periódicas.
- **La comisión se descuenta del monto recibido**, no se financia dentro del crédito.
  Ambas prácticas existen; se eligió la que es un renglón más simple de explicar.
- **Meses de 30 días implícitos.** El interés es `tasa/12`, no `tasa × días/360`. La
  diferencia son centavos a este plazo.
- **Sin pagos anticipados.** No hay lógica de amortización parcial ni de recálculo de
  plazo, que es lo primero que preguntaría un usuario real.

## Dos implementaciones, un solo resultado

La misma matemática vive en dos lugares y tiene que dar **el mismo número**:

- `scripts/lib/finanzas.mjs` generó los CSV (es el origen de `planes_reestructura.csv`);
- `apps/mcp/src/dominio/finanzas.ts` es lo que las tools llaman en tiempo de ejecución.

No se comparte un módulo porque el generador es un script suelto de Node y el MCP es un
paquete del workspace con su propio typecheck. Lo que las mantiene juntas es un test:
`apps/mcp/src/__tests__/finanzas.spec.ts` recalcula las cuatro ofertas de Beto y las
compara contra las filas del CSV, campo por campo (mensualidad, CAT, total, intereses,
ahorro y meses). Si alguien cambia una fórmula en un lado, ese test truena.

## Cómo se probó

Las identidades de cada fila las verifican a la vez el `CHECK` del schema
(`ck_amortizacion_cuadra`, `ck_amortizacion_mensualidad`) y `scripts/validar-datos.mjs`,
que además comprueba sobre las 348 filas generadas que:

- el primer `saldo_inicial` es el monto original del crédito;
- la última fila cierra en saldo **exactamente 0**;
- `creditos.saldo_insoluto_centavos` es el saldo que la tabla deja tras los pagos
  realizados;
- el número de filas con estatus `pagado` coincide con `pagos_realizados`;
- el `pago_minimo_centavos` de cada tarjeta reproduce la fórmula del escenario de mínimo
  con tolerancia de un peso.

Caso de referencia verificado a mano: $47,386 al 21.90 % a 18 meses da una mensualidad de
$3,193.35 y un total de $57,480.30, de los cuales $10,094.30 son intereses con IVA.
