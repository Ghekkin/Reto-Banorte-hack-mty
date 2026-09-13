---
estado: abierto
severidad: media
area: mcp
encontrado: 2026-09-13 03:15
github: 24
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
