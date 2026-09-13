---
estado: resuelto
severidad: media
area: mcp
encontrado: 2026-09-13 03:15
github: 25
resuelto-en: e6f4b43
---

# `simular_reestructura` y `aplicar_plan_pago` comparan la mensualidad del plan contra lo LIBRE de buró, sin sumar el mínimo que el plan reemplaza

**Dónde:** `apps/mcp/src/tools/simular-reestructura.ts:41` y `:62` (`cabeEnCapacidad`),
`apps/mcp/src/tools/aplicar-plan-pago.ts:54-55` (`aprieta`), `apps/mcp/src/dominio/consultas.ts:55-60`
(`capacidadPagoMensual`).

**Qué esperaba:** que «cabe en tu capacidad» compare contra lo que la persona puede pagar de verdad
con el plan puesto: lo libre de buró **más** el pago mínimo de la tarjeta, que el plan sustituye.

**Qué pasa:** `buro.capacidad_pago_mensual_centavos` es 35 % del ingreso **menos lo ya comprometido**
(`docs/como-funciona/base-de-datos.md`), y ese compromiso incluye el mínimo de la tarjeta. Las dos
tools lo comparan contra la mensualidad completa del plan, así que un plan que solo cambia el mínimo
por una mensualidad parecida sale como «no cabe» y puede cambiar el plazo recomendado. Además, sin
fila de buró la función cae a 30 % del ingreso, que es un techo y no lo libre: mezcla dos
significados en un mismo número.

**Cómo lo reproduje / por qué estoy seguro:** al construir el aviso de `simular_pago_credito` se
comparó contra lo libre y Carmen salía con aviso en cualquier simulación (compromete $31,429 contra
$8,820 libres); la tool nueva usa `techoDeDeudaMensual` (comprometido + libre). Las dos de la tarjeta
siguen con la comparación vieja.

**Impacto en la demo:** se nota si el plazo recomendado de Beto no es el que el guion espera (18
meses): hoy lo decide la oferta marcada por el banco, así que en el guion no se ve.

## Resolución (2026-09-13 06:45)

Una sola función, `capacidadParaLaTarjeta` en `apps/mcp/src/dominio/creditos.ts`:
**techo de deuda − mensualidades de los créditos a plazo** (contrato + abono programado). La usan
`simular_reestructura` (`cabeEnCapacidad`, plazo recomendado y `capacidadPagoMensualCentavos`) y
`aplicar_plan_pago` (el aviso «arriba de tu capacidad»). No se tocó `capacidadPagoMensual` (lo libre),
que siguen usando `panorama_inicial`, `simular_gasto_externo` y `proyectar_ahorro`.

No es "lo libre + el mínimo": buró le cuenta la tarjeta a Beto pero no a Carmen (su comprometido es
exactamente hipoteca + auto), y sumarle el mínimo a Carmen le inventaría holgura. Del techo también
sale bien el caso sin buró: 35 % del ingreso, el mismo de `techoDeDeudaMensual`, en vez del 30 % que
mezclaba techo con libre.

| | Antes (lo libre) | Ahora (para la tarjeta) |
|---|---|---|
| Beto | $6,613.71 | $9,564.44 |
| Carmen | $8,820.29 | $8,820.29 |
| Ana | sin tarjeta | sin tarjeta |
| Beto con $4,000 de renta | $2,613.71 (12, 18 y 24 meses «no cabían») | $5,564.44 (caben las cuatro) |

**Guion:** sin cambios con los datos del volcado. Beto sigue con 12/18/24/36 meses, las cuatro caben
y la recomendada es 18 (la marca el banco).

**Pruebas:** `apps/mcp/src/__tests__/capacidad-para-la-tarjeta.spec.ts` (8). Con las tools de antes
fallan las 5 que pasan por `simular_reestructura` y `aplicar_plan_pago`. Doc:
`docs/algoritmos/oferta-de-reestructura.md`, sección «Contra qué se compara la mensualidad».
