---
estado: abierto
severidad: media
area: mcp
encontrado: 2026-09-13 03:15
github: 25
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
