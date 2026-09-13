---
verificado: 2026-09-13 06:40
implementado-en: apps/mcp/src/tools/simular-reestructura.ts, apps/mcp/src/tools/aplicar-plan-pago.ts, apps/mcp/src/dominio/creditos.ts (capacidadParaLaTarjeta)
lenguaje: typescript
---

# Qué plan de pago se ofrece, y cuál se recomienda

## Para cualquiera

Cuando alguien trae la tarjeta al límite, el banco puede convertir esa deuda en
mensualidades fijas a una tasa más baja. Pero "más barato" no es una sola opción: a más
meses, la mensualidad baja y los intereses totales suben. Hay que mostrar varias y decir
cuál conviene.

Este algoritmo decide **qué opciones se muestran, con qué tasa cada una, y cuál lleva la
etiqueta de recomendada**. La regla de la recomendación es la que usaría alguien honesto:
el plazo más corto que la persona de verdad pueda pagar. Más corto es menos intereses;
"que pueda pagar" evita recomendarle algo que va a incumplir el mes que viene.

## La idea

La tasa de un plan **no es una fórmula, es un dato del banco**: cada tarjeta tiene sus
plazos cotizados en `db/datos/planes_reestructura.csv`, y ahí la tasa sube con el plazo
(12 meses al 18.9 %, 18 al 21.9 %, 24 al 24.9 %, 36 al 27.9 % para la tarjeta de Beto). La
tool usa esas ofertas cuando existen; así la pantalla muestra la oferta real y no una
invención del código.

Para un plazo que el banco no cotizó (alguien pregunta "¿y a 9 meses?") hace falta un
respaldo. Es una recta simple, no un modelo: se parte del 18.9 % y se suman 0.5 puntos por
cada mes arriba de 12, con techo de 32.9 %. Y se acota a **la tasa de la tarjeta menos 5
puntos**: una reestructura más cara que el revolvente no es una oferta, es una trampa.

La comparación que convence no es la tasa, es el contraste: contra seguir pagando el
mínimo. Eso se calcula una sola vez por tarjeta (es la misma deuda) y se reparte entre
todas las opciones, en `docs/algoritmos/amortizacion.md`.

## Paso a paso

1. Toma el saldo revolvente de la tarjeta y su tasa. Si ya hay un plan aplicado, la tool
   falla: no se reestructura dos veces la misma deuda.
2. Calcula **una** vez el escenario de pago mínimo sobre ese saldo (meses y total pagado).
3. Decide los plazos a cotizar: los que pidan, o los que el banco tiene cotizados, o
   12/18/24/36 si no hay ninguno.
4. Para cada plazo: tasa del banco si existe, si no la de respaldo. Con esa tasa calcula
   mensualidad, total, intereses, CAT y el ahorro contra el mínimo.
5. Marca `cabeEnCapacidad` comparando la mensualidad con **lo que la persona puede pagar por
   la tarjeta** (`capacidadParaLaTarjeta`, ver abajo). Es el mismo número que reporta
   `capacidadPagoMensualCentavos` y el mismo contra el que `aplicar_plan_pago` avisa.
6. Elige el recomendado: el que el banco ya marcó como recomendado, y si no marcó ninguno,
   **el plazo más corto cuya mensualidad cabe en la capacidad de pago**. Si ninguno cabe,
   el más largo (la mensualidad más chica que existe), y la interfaz lo dirá con
   `cabeEnCapacidad: false`.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | texto | `usr_beto` |
| `tarjetaId` | texto, opcional | `tar_beto_clasica` |
| `plazosMeses` | lista de enteros, opcional | `[12, 18, 24, 36]` |

| Salida | Tipo | Ejemplo (Beto, 18 meses) |
|---|---|---|
| `mensualidadCentavos` | entero | `319335` |
| `cat` | decimal | `0.2858` |
| `ahorroVsMinimoCentavos` | entero | `13206520` ($132,065) |
| `mesesVsMinimo` | entero | `191` |
| `cabeEnCapacidad` | booleano | `true` (capacidad para la tarjeta: $9,564.44) |
| `capacidadPagoMensualCentavos` | entero | `956444` |
| `plazoRecomendado` | entero | `18` |

## Parámetros y umbrales

| Número | Valor | De dónde salió |
|---|---|---|
| Tasa base del respaldo | 18.9 % | La tasa del plazo más corto que el banco cotiza |
| Incremento del respaldo | +0.5 puntos por mes arriba de 12 | Reproduce la pendiente de la tabla real (12→18, 18→24: 3 puntos cada 6 meses) |
| Techo del respaldo | 32.9 % | La tasa de la tarjeta más cara aceptable del catálogo de productos |
| Descuento mínimo vs. la tarjeta | 5 puntos | Debajo de eso la reestructura no vale la pena y no se ofrece |
| Plazos por defecto | 12, 18, 24, 36 | Los que el banco cotiza para la tarjeta de la demo |
| Techo de deuda | comprometido + libre de buró; sin buró, 35 % del ingreso | `techoDeDeudaMensual`, el mismo de [abono-a-capital.md](abono-a-capital.md) |

## Contra qué se compara la mensualidad (`capacidadParaLaTarjeta`)

**Para cualquiera.** Si Beto convierte su tarjeta en un plan, deja de pagar el mínimo de la
tarjeta y empieza a pagar la mensualidad del plan. La pregunta honesta es "¿le alcanza para
pagar esa mensualidad **en lugar** del mínimo?", no "¿le alcanza para pagarla **además** del
mínimo?". Hasta el 13 de septiembre se hacía la segunda: con $4,000 de renta en efectivo, a Beto
le decía que el plan de 12 meses no cabía, aunque sí cabía (issue #25).

**La cuenta.**

```
capacidadParaLaTarjeta = techoDeDeudaMensual − Σ mensualidades de los créditos a plazo
techoDeDeudaMensual    = buro.pago_mensual_comprometido + capacidadPagoMensual
                         (sin buró: 35 % del ingreso − gastos mensuales fuera del banco)
capacidadPagoMensual   = buro.capacidad_pago_mensual − gastos mensuales fuera del banco
```

Las mensualidades de los créditos a plazo son las de `creditosAPlazo`: contrato **más** el abono
a capital programado, porque ese dinero ya está comprometido cada mes.

**Por qué así y no "lo libre + el mínimo".** Buró no trata igual a todos: a Beto le cuenta la
tarjeta como deuda (`cred_beto_tdc`) y su mínimo va dentro de lo comprometido; a Carmen no (su
comprometido es exactamente hipoteca + auto). Sumarle a Carmen su mínimo le inventaría $1,329.92
de holgura. Restar los créditos a plazo del techo da lo correcto en los dos casos sin tener que
saber qué contó buró:

| | Techo | Créditos a plazo | Para la tarjeta | Lo libre de buró (lo de antes) |
|---|---|---|---|---|
| Beto | $12,075.00 | $2,510.56 (nómina) | **$9,564.44** | $6,613.71 |
| Carmen | $40,250.00 | $31,429.71 (hipoteca + auto) | **$8,820.29** | $8,820.29 |
| Beto con $4,000 de renta | $8,075.00 | $2,510.56 | **$5,564.44** | $2,613.71 |

Con los datos del volcado **no cambia nada del guion**: las cuatro opciones de Beto ya cabían y
la recomendada sigue siendo la de 18 meses (la marca el banco). Cambia cuando la capacidad se
aprieta: con renta registrada, o si se piden plazos que el banco no marcó.

**Dónde vive.** `capacidadParaLaTarjeta` en `apps/mcp/src/dominio/creditos.ts`, junto a
`techoDeDeudaMensual`; la usan `simular-reestructura.ts` y `aplicar-plan-pago.ts`.
`capacidadPagoMensual` (lo libre) sigue siendo lo que reportan `panorama_inicial`,
`simular_gasto_externo` y `proyectar_ahorro`: ahí sí se habla de lo que queda libre.

## Límites y supuestos

- **Una sola tarjeta a la vez.** No consolida varias deudas en un plan.
- **Sin comisión de apertura** en la reestructura (el CAT se calcula con comisión 0). El
  producto `prod_reestructura` de `db/datos/productos_credito.csv` sí tiene una; meterla
  cambiaría el CAT unas décimas y un renglón más de explicación en pantalla.
- **La capacidad de pago es un dato estático** de buró (menos los gastos mensuales que la
  persona registró fuera del banco), no se recalcula con el gasto real del mes. `proyectar_ahorro` sí mira el flujo; aquí no, para no dar dos números distintos
  de "lo que puedes pagar" en la misma demo.
- **No modela que la persona siga usando la tarjeta** después de reestructurar, que es
  exactamente cómo la gente vuelve a endeudarse. Fuera de alcance.

## Cómo se probó

`apps/mcp/src/__tests__/lecturas.spec.ts` → `describe("simular_reestructura")`:

- Beto recibe los cuatro plazos, con 18 recomendado, mensualidad `319335` y ahorro
  `13206520`, los mismos números que `db/datos/planes_reestructura.csv`.
- un plazo fuera de la tabla (9 meses) se cotiza y sale más caro al mes que el de 18;
- Ana falla con "no tiene tarjeta de credito", que es lo que el agente convierte en otra
  pantalla.

`apps/mcp/src/__tests__/capacidad-para-la-tarjeta.spec.ts` (issue #25): la capacidad de Beto
($9,564.44) y de Carmen ($8,820.29); un abono a capital la baja; Beto sin cambios conserva sus
cuatro opciones y los 18 meses; con $4,000 de renta todas caben y, sin plazo marcado por el banco
(`[9, 12, 24]`), se recomienda 12 (antes, 24); `aplicar_plan_pago` no avisa en ese caso y sí avisa
con $9,000 de renta, con la cifra de la tarjeta ($564.44). Con las tools de antes, esas cinco
pruebas fallan.

Y por HTTP, en `scripts/humo.sh`: `plazo recomendado = 18`.
