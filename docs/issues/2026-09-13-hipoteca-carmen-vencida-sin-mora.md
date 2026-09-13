---
estado: resuelto
severidad: media
area: mcp
encontrado: 2026-09-13 03:15
github: 24
resuelto-en:
---

# La hipoteca de Carmen tiene pagos vencidos pero `dias_mora: 0` y `estatus: vigente`

**Dónde:** datos de `banorte.creditos` / `banorte.amortizaciones`, fila `cred_carmen_hipotecario`
(igual en el volcado `apps/mcp/src/__tests__/datos-de-prueba.json`); lo leen
`apps/mcp/src/dominio/creditos.ts` (`creditosAPlazo`, `proximosPagosDe`).

**Qué esperaba:** un crédito con `fecha_proximo_pago` en el pasado y filas `vencido` en su tabla
debería traer días de mora y estatus `vencido`; uno al corriente, próximo pago en el futuro.

**Qué pasa:** `fecha_proximo_pago` es `2026-07-10` (dos meses antes de hoy), las filas 99, 100 y 101
de `amortizaciones` están en `estatus = 'vencido'`, pero el crédito dice `dias_mora = 0` y
`estatus = 'vigente'`. Los hitos de `consultar_creditos` y `simular_pago_credito` para Carmen
arrancan en fechas pasadas.

**Cómo lo reproduje / por qué estoy seguro:** lo encontró la batería de `abonos.spec.ts` al simular
los 4 créditos: la simulación cuadra con la tabla, pero las fechas del primer hito de la hipoteca
son de julio de 2026.

**Impacto en la demo:** se nota si se muestra la hipoteca de Carmen (hitos «10 jul 2026» como
«próximo pago»); los pasos del guion son de Beto y Ana.

## Resolución (2026-09-13 07:00)

**Era un dato, no el dominio.** Buró reporta a Carmen 100 % puntual y sin atrasos, el perfil demo
dice "hipoteca y auto al corriente" y los otros tres créditos ya traen septiembre pagado. Derivar
mora de las filas `vencido` habría contradicho a buró, al diagnóstico de salud y al perfil.

- `db/migraciones/0009-hipoteca-carmen-al-corriente.sql` (idempotente, **sin aplicar todavía**):
  pagos 99–101 a `pagado` con `fecha_pago` = su fecha; el crédito a 101 pagos, próximo pago
  2026-10-10 y saldo 137,691,032 (el saldo final del pago 101); y `buro.deuda_total_centavos` de
  Carmen a 156,757,128, para que siga siendo la suma de sus saldos insolutos. Tras aplicarla hay que
  reiniciar el MCP.
- El volcado `apps/mcp/src/__tests__/datos-de-prueba.json` trae el mismo cambio (5 filas).
- `apps/mcp/src/__tests__/integridad-creditos.spec.ts`: para cada crédito a plazo, pagos hechos =
  filas `pagado`, próximo pago = primera fila sin pagar, sin filas `vencido` si no hay mora, y buró =
  suma de saldos; más `consultar_creditos` de la hipoteca. Con el volcado viejo fallan 2 de 6.

| Hipoteca de Carmen | Antes | Después |
|---|---|---|
| Saldo insoluto | $1,389,854.69 | $1,376,910.32 |
| Pagos hechos / restantes | 98 / 142 | 101 / 139 |
| Próximo pago (primer hito) | 2026-07-10 (pago 99) | 2026-10-10 (pago 102) |
| Deuda de créditos a plazo | $1,580,515.65 | $1,567,571.28 |
| Liquidación con la mensualidad del contrato | 2038-04-10 | 2038-04-10 |

Sin cambios: mensualidades, lo comprometido de buró, capacidad de pago, `panorama_inicial` (campos
escalares) y el diagnóstico de salud.
