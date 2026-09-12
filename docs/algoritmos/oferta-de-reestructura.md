---
verificado: 2026-09-12 01:19
implementado-en: apps/mcp/src/tools/simular-reestructura.ts
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
5. Marca `cabeEnCapacidad` comparando la mensualidad con la capacidad de pago de buró
   (`buro.capacidad_pago_mensual_centavos`; sin buró, 30 % del ingreso).
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
| `cabeEnCapacidad` | booleano | `true` (capacidad: $6,613.71) |
| `plazoRecomendado` | entero | `18` |

## Parámetros y umbrales

| Número | Valor | De dónde salió |
|---|---|---|
| Tasa base del respaldo | 18.9 % | La tasa del plazo más corto que el banco cotiza |
| Incremento del respaldo | +0.5 puntos por mes arriba de 12 | Reproduce la pendiente de la tabla real (12→18, 18→24: 3 puntos cada 6 meses) |
| Techo del respaldo | 32.9 % | La tasa de la tarjeta más cara aceptable del catálogo de productos |
| Descuento mínimo vs. la tarjeta | 5 puntos | Debajo de eso la reestructura no vale la pena y no se ofrece |
| Plazos por defecto | 12, 18, 24, 36 | Los que el banco cotiza para la tarjeta de la demo |
| Capacidad sin buró | 30 % del ingreso | Límite prudencial de uso común |

## Límites y supuestos

- **Una sola tarjeta a la vez.** No consolida varias deudas en un plan.
- **Sin comisión de apertura** en la reestructura (el CAT se calcula con comisión 0). El
  producto `prod_reestructura` de `db/datos/productos_credito.csv` sí tiene una; meterla
  cambiaría el CAT unas décimas y un renglón más de explicación en pantalla.
- **La capacidad de pago es un dato estático** de buró, no se recalcula con el gasto real
  del mes. `proyectar_ahorro` sí mira el flujo; aquí no, para no dar dos números distintos
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

Y por HTTP, en `scripts/humo.sh`: `plazo recomendado = 18`.
