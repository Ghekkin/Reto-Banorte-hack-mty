---
verificado: 2026-09-13 03:05
implementado-en: apps/mcp/src/dominio/abonos.ts (simulación y pedido), apps/mcp/src/dominio/creditos.ts (estado encima, carga de deuda, compararPago), apps/mcp/src/dominio/finanzas.ts (simularConCuota)
lenguaje: typescript
---

# Abono a capital: «¿y si pago $6,000 al mes?»

## Para cualquiera

Ana tiene un crédito personal: le faltan 15 pagos de $4,570.95. Pregunta en el chat «¿y si
pago $6,000 al mes?». La tarjeta de su crédito que ya está en pantalla se recalcula ahí
mismo: con $6,000 lo liquida en **11 meses en vez de 15** y paga **$3,470.21 menos de
intereses**. Si le gusta, toca «Programar este pago» y queda guardado: desde su próximo
pago, lo que pase de $4,570.95 se va directo a capital cada mes.

Así funciona en un banco de verdad. La mensualidad del contrato no se toca; lo que pagas
encima **abona a capital**, la deuda baja más rápido y cada mes se generan menos intereses.
Por eso hay dos cosas que este camino no puede hacer, y lo dice en vez de inventar:

- **Pagar menos** que el contrato («¿y si pago $4,000?»): eso es reestructurar el crédito.
- **Tardar más** meses de los que faltan («quiero liquidarlo en 20 meses» cuando faltan 15):
  también es reestructurar.

Y si lo que pide sí se puede pero aprieta —toda su deuda al mes rebasaría lo que buró
estima que puede pagar—, la tarjeta lo avisa con una frase («Pagarías $12,075.31 al mes de
deuda (37.7 % de tu ingreso): rebasa tu capacidad estimada de $11,200.00»). Se avisa, no se
bloquea: quien decide es la persona.

## La idea

**La tabla del banco ya es una simulación con cuota fija.** Partiendo del saldo insoluto de
hoy y pagando la mensualidad del contrato, la misma aritmética de
[la tabla de amortización](amortizacion.md) reproduce **al centavo** las filas pendientes de
`banorte.amortizaciones` de los cuatro créditos (Ana 15 filas, Beto 14, la hipoteca de
Carmen 142 y su auto 17: cero diferencias). Eso significa que «pagar $6,000» no es un
modelo aparte: es la misma cuenta con otra cuota. Con abono 0 la simulación **es** la tabla,
y por eso `consultar_creditos` puede cambiar de fuente sin contar dos historias.

«Liquidarlo en N meses» se traduce a una cuota con la fórmula de pagos iguales, la misma
con la que se calculó el contrato. Como todo va en centavos redondeados, a veces esa cuota
deja un residuo de centavos que se vuelve un pago extra (Ana a 12 meses: $5,503.20 da 13
pagos); se sube un centavo a la vez hasta que cierra en N. En los cuatro créditos y todos
sus plazos posibles hace falta, como mucho, un centavo.

## Paso a paso

### Simular con una cuota (`simularConCuota`, `simularCredito`)

1. Parte de `saldo = saldo_insoluto_centavos`.
2. Cada mes: `interés = round(saldo × tasa / 12)`, `IVA = round(interés × 0.16)`,
   `capital = cuota − interés − IVA`.
3. Si `capital ≥ saldo`, es el último pago: `capital = saldo` y la cuota de ese mes es
   `capital + interés + IVA` (solo lo que falta).
4. `saldo −= capital`; se repite hasta cero.
5. Si la cuota no cubre ni el interés con IVA del primer mes, devuelve `null` (la deuda no
   bajaría nunca). Tope de seguridad: 1,200 meses.
6. Con las filas arma el escenario: `mensualidadCentavos` (la del primer pago),
   `plazoRestanteMeses` (filas), `totalInteresesEstimadosCentavos` (Σ interés + IVA),
   `fechaLiquidacion` (`sumarMeses(fechaProximoPago, n − 1)`) y los hitos.

### Hitos (`hitosDe`)

Cuatro posiciones: `1`, `round(n/3)`, `round(2n/3)` y `n`, acotadas a `[1, n]`, sin repetir.
Cada hito lleva `numeroPago = pagosRealizados + k`, `periodo = sumarMeses(fechaProximoPago,
k − 1)`, el capital, **interés + IVA** juntos (capital + interés = lo que se paga ese mes) y el
saldo final. Con 11 pagos: k = 1, 4, 7, 11 → pagos 10, 13, 16 y 20 de Ana.

### El pedido (`evaluarPedido`)

1. Simula con la cuota del contrato: su número de pagos es el **plazo máximo**.
2. Si pidió mensualidad: menor que el contrato → `posible: false` con motivo y el monto del
   contrato en pesos. Si no, esa es la cuota.
3. Si pidió plazo: mayor que el máximo → `posible: false` con motivo, el máximo y la
   mensualidad del contrato. Si no, `cuota = max(contrato, cuotaParaPlazo(N))`.
4. Simula con la cuota. `abono = mensualidad simulada − contrato` (nunca negativo).

### Contra lo de hoy (`compararPago`)

1. `actual` = simulación con **contrato + abono ya programado** (el último
   `programar_abono_capital` de ese crédito; 0 si no hay).
2. `ahorroInteresesCentavos = actual − simulado` en intereses; `mesesMenos = actual −
   simulado` en pagos. Pueden ser negativos si la persona pide menos abono del que ya tiene.
3. **Carga de deuda** (`cargaDeDeudaCon`): `mensualidadDeudaTotal = mensualidad total de hoy
   (créditos + tarjeta o su plan) − la de este crédito + la simulada`. El techo es
   `buro.pago_mensual_comprometido + buro.capacidad_pago_mensual`. Si el total lo rebasa,
   `aviso` con la frase. Sin escenario posible no hay aviso.

### Programar (`programar_abono_capital`)

1. Si la `idempotencyKey` ya se usó en ese crédito, devuelve lo que se programó esa vez.
2. Re-simula con `compararPago`; si no es posible, lanza el motivo (la tool devuelve error).
3. Guarda con `aplicarAccion` (tipo `programar_abono_capital`, `objeto_tipo = credito`) el
   abono, la fecha desde la que aplica (`fechaProximoPago`), y los escenarios `antes` y
   `despues`. Gana el último: reprogramar reemplaza, y programar la mensualidad del
   contrato deja el abono en 0.

### El estado encima (`creditos.ts`)

Con abono > 0, `creditosAPlazo` devuelve `mensualidadCentavos = contrato + abono`,
`mensualidadContratoCentavos`, `abonoMensualCentavos` y `pagosRestantes` de la simulación;
`proximosPagosDe` genera las filas desde la simulación (`estatus: "pendiente"`). Sin abono,
todo sale de la tabla como antes.

## Entradas y salidas

| Entrada (`simular_pago_credito`) | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | id | `usr_ana` |
| `creditoId` | id de `creditos` (no la tarjeta) | `cred_ana_personal` |
| `mensualidadCentavos` **o** `plazoMeses` | exactamente uno | `600000` / `12` |

| Salida | Tipo | Ana con $6,000 |
|---|---|---|
| `actual` | escenario | $4,570.95 · 15 pagos · $12,781.15 de intereses · liquida 2027-12-05 |
| `posible` / `motivo` | boolean / texto | `true` / `null` |
| `simulado` | escenario | $6,000.00 · 11 pagos · $9,310.94 · liquida 2027-08-05 |
| `abonoMensualCentavos` | centavos | 142,905 |
| `ahorroInteresesCentavos` / `mesesMenos` | centavos / meses | 347,021 / 4 |
| `capacidadPagoMensualCentavos` | centavos | 1,120,000 (techo) |
| `mensualidadDeudaTotalCentavos` / `pctDelIngreso` | centavos / fracción | 600,000 / 0.1875 |
| `aviso` | texto o `null` | `null` |

Cifras de referencia (volcado de pruebas):

| Caso | Mensualidad | Pagos | Intereses con IVA | Ahorro | Meses menos | Aviso |
|---|---|---|---|---|---|---|
| Ana hoy | $4,570.95 | 15 | $12,781.15 | — | — | — |
| Ana $6,000 | $6,000.00 | 11 | $9,310.94 | $3,470.21 | 4 | no |
| Ana 12 meses | $5,503.21 | 12 | $10,255.33 | $2,525.82 | 3 | no |
| Ana 5 meses | $12,075.31 | 5 | $4,593.45 | $8,187.70 | 10 | sí (37.7 %) |
| Beto hoy | $2,510.56 | 14 | $5,607.15 | — | — | — |
| Beto $6,000 | $6,000.00 | 6 | $2,294.29 | $3,312.86 | 8 | no (25.9 %) |
| Beto 12 meses | $2,863.65 | 12 | $4,823.05 | $784.10 | 2 | no |
| Carmen hipoteca $6,000 | — | — | — | — | — | `posible: false`: menos que $18,914.08 |

## Parámetros y umbrales

| Número | Valor | De dónde sale |
|---|---|---|
| IVA sobre intereses | 0.16 | Ley; el mismo `IVA` de `finanzas.ts` |
| Hitos | 4 (1, n/3, 2n/3, n) | Lo que cabe en `ProyeccionPagoCredito` sin volverse tabla |
| Tope de simulación | 1,200 meses | Seguridad contra una cuota que apenas cubre el interés |
| Techo de deuda | comprometido + libre de buró | `capacidad_pago_mensual_centavos` es lo **libre** (35 % del ingreso menos lo comprometido, ver `docs/como-funciona/base-de-datos.md`); compararla contra el total avisaría siempre a Carmen. Sin fila de buró, 35 % del ingreso |

## Límites y supuestos

- **Sin comisiones ni penalización por prepago.** Se asume que abonar a capital no cuesta
  nada; si un producto cobrara por pagar antes, el ahorro saldría inflado.
- **El abono aplica desde `fechaProximoPago`**, no retroactivo, y no hay abonos únicos
  («abono $20,000 hoy»): solo mensuales.
- **Saldo de hoy.** La simulación parte del `saldo_insoluto_centavos` de la base; no
  descuenta pagos que ya tocaba hacer y no están marcados (la hipoteca de Carmen tiene
  `fecha_proximo_pago` en julio y tres filas `vencido`, así que sus hitos empiezan en el
  pasado).
- **La carga de deuda suma la mensualidad de la tarjeta** (mínimo o plan), que buró no
  siempre tiene fichada (Carmen). El techo sí sale de buró.
- **`avancePct` y `plazoMeses` siguen siendo los del contrato.** Con abono,
  `pagosRealizados + pagosRestantes` ya no suma `plazoMeses`: es a propósito, el contrato
  no cambió.
- **Un solo pago que liquida**: `mensualidadCentavos` es lo que falta, no lo pedido, y el
  escenario trae un solo hito (`ProyeccionPagoCredito` hoy pide mínimo 2).

## Cómo se probó

`apps/mcp/src/__tests__/abonos.spec.ts` (37 pruebas, contra el volcado, sin base):

- La simulación con la cuota del contrato reproduce cada fila pendiente de los 4 créditos, y
  `actual` cuadra con la tabla (pagos, fecha de liquidación, intereses).
- Ana $6,000 → 11 pagos y 931,094; Beto → 6 y 229,429; hitos 10, 13, 16, 20.
- Todo plazo posible de los 4 créditos cierra justo en ese plazo; Ana a 12 → 550,321.
- Menos que el contrato y más plazo → `posible: false` con el monto en pesos.
- Aviso: Ana en 5 meses sí; Beto con $6,000 y Carmen sin cambio, no.
- Programar cambia `consultar_creditos` (mensualidad, pagos restantes, tabla de 11 filas que
  cierra en cero) y `simular_pago_credito.actual`; idempotencia; reprogramar reemplaza;
  programar el contrato devuelve exactamente la lectura original; por `ejecutar_decision`
  igual; `reiniciarEstado` lo limpia.
