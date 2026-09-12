---
verificado: 2026-09-12 08:50
implementado-en: apps/mcp/src/tools/detectar-fugas.ts
lenguaje: typescript
---

# Detección de fugas de dinero y suscripciones inactivas

## Para cualquiera

El dinero que se va sin darnos cuenta no suele ser un gran cargo inesperado: son las suscripciones mensuales que ya no usamos, membresías que olvidamos cancelar y pagos recurrentes que se cobran en automático. Un servicio de $115 al mes parece poco, pero tras cuatro años representa más de $5,500.

Este algoritmo analiza las suscripciones activas de la persona y las cruza con sus movimientos reales en la cuenta. Responde tres preguntas clave:
1. **¿Cuánto dinero está comprometido en automático cada mes y al año?**
2. **¿Qué suscripciones llevan meses sin usarse o sin registrar actividad?**
3. **¿Qué cargos recurrentes existen fuera de la tabla de suscripciones (como servicios o membresías no registradas)?**

Además, se conecta directamente con la acción `cancelar_suscripcion`: en el momento en que la persona decide cancelar un servicio, el estado se actualiza en vivo y la siguiente lectura muestra de inmediato el ahorro generado.

## La idea

El algoritmo realiza dos detecciones complementarias:

1. **Suscripciones registradas vs. uso real:**
   Toma las suscripciones activas del usuario desde `suscripciones.csv`, superpone las cancelaciones guardadas en `estado.json` y busca para cada una la fecha de su último cargo en `movimientos.csv`. Si una suscripción no presenta cargos en los últimos `mesesSinUso` (por defecto 2 meses), se marca con `sinUsoReciente: true`. También calcula `mesesActiva` a partir de `fecha_inicio`, lo cual permite mostrar el impacto acumulado del gasto en el tiempo.

2. **Detección de recurrentes no suscritos ("fugas invisibles"):**
   Busca movimientos con `es_recurrente = true` y `tipo = cargo` cuyo `comercio_id` **no** figure en las suscripciones del usuario (por ejemplo, pagos de telefonía, luz, gas o colegiaturas). Estos representan compromisos recurrentes que el usuario suele olvidar al presupuestar.

3. **Cálculo de impacto relativo:**
   Contrasta el total mensual de suscripciones contra el ingreso mensual declarado (`usuarios.ingreso_mensual_centavos`), calculando el porcentaje del ingreso absorbido por estos cargos hormiga.

## Paso a paso

1. Filtra `suscripciones` por `usuario_id` donde `activa = true`.
2. Lee las cancelaciones previas en el estado mutable (`accionesDe(usuarioId, "cancelar_suscripcion")`) y excluye las suscripciones canceladas.
3. Para cada suscripción activa:
   - Resuelve el nombre del comercio y giro (`comercios.csv`).
   - Calcula `mesesActiva` desde `fecha_inicio` hasta `hoy()`.
   - Busca en `movimientos` el cargo más reciente correspondiente a ese `comercio_id`.
   - Si no hay cargo o el último cargo es anterior a `sumarMeses(hoy(), -mesesSinUso)`, marca `sinUsoReciente = true`.
4. Suma `montoCentavos` de todas las activas para obtener `totalMensualCentavos` y `totalAnualCentavos = totalMensualCentavos * 12`.
5. Calcula `pctDelIngreso = totalMensualCentavos / ingresoMensual`.
6. Identifica en `movimientos` aquellos cargos recurrentes (`es_recurrente = true`) cuyo `comercio_id` no esté entre las suscripciones del usuario, agrupándolos por comercio con su fecha más reciente.
7. Devuelve el resultado validado contra `SalidaDetectarFugas`.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | texto (`usr_*`) | `usr_ana` |
| `mesesSinUso` | entero, opcional | `2` (default: 2 meses) |

| Salida | Tipo | Ejemplo (Ana) |
|---|---|---|
| `totalMensualCentavos` | entero | `186900` ($1,869.00 MXN) |
| `totalAnualCentavos` | entero | `2242800` ($22,428.00 MXN) |
| `pctDelIngreso` | decimal | `0.0584` (~5.84 % del ingreso) |
| `suscripciones[]` | lista | 7 suscripciones (Adobe, Smart Fit, Netflix, Disney, HBO, Spotify, iCloud) |
| `recurrentesNoSuscritos[]` | lista | CFE, Telmex, Telcel, Agua y Drenaje |

## Parámetros y umbrales

| Parámetro | Valor | Justificación |
|---|---|---|
| `mesesSinUso` por defecto | 2 meses | Un mes sin cargo puede deberse a desfases en cortes o periodos de facturación; 2 meses consecutivos sin cargo es un indicador confiable de inactividad o posible servicio no utilizado |
| Antigüedad (`mesesActiva`) | Meses transcurridos | Muestra al usuario la perspectiva histórica del costo acumulado del servicio |
| Idempotencia en cancelaciones | `idempotencyKey` única | Garantiza que reintentos de red o del agente no apliquen dobles cancelaciones |

## Límites y supuestos

- **No se inventan inactividades:** Si los datos muestran cargos recurrentes mes con mes, `sinUsoReciente` permanece en `false`. Es una señal honesta basada en hechos verificables.
- **Traspasos e ingresos excluidos de recurrentes:** Pagos entre cuentas propias (`cat_transferencias`) o dispersiones de nómina (`cat_nomina`) no constituyen fugas recurrentes no suscritas.
- **Superposición estricta de estado:** La cancelación de una suscripción no altera los archivos CSV de partida; se registra como evento en `estado.json` y se superpone inmediatamente en la memoria de consulta.

## Cómo se probó

`apps/mcp/src/__tests__/suscripciones.spec.ts`:

1. Ana detecta sus 7 suscripciones activas por un total de $1,869.00/mes ($22,428.00/año) y su Spotify activo desde 2022 registra más de 50 meses.
2. Detección exitosa de recurrentes no suscritos (CFE, Telmex, Telcel).
3. Ciclo completo verificado: tras ejecutar `cancelar_suscripcion` sobre HBO Max ($149.00), la lectura posterior devuelve 6 suscripciones y el gasto mensual baja a $1,720.00.
4. Idempotencia y control de pertenencia (rechazo de cancelación de suscripción ajena).
