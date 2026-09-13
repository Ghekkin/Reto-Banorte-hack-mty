-- Migracion 0009 — la hipoteca de Carmen queda al corriente, como dice buro (issue #24)
--
-- El generador dejo `cred_carmen_hipotecario` a medias: la fila del credito decia 98 pagos,
-- proximo pago el 2026-07-10, saldo de antes de julio y `vigente` sin mora, y en su tabla los
-- pagos 99, 100 y 101 (julio, agosto y septiembre) estaban `vencido`. Pero buro reporta a Carmen
-- 100 % puntual y sin atrasos, el perfil demo la describe con "hipoteca y auto al corriente"
-- (docs/como-funciona/datos-mock.md), y los otros tres creditos de la demo ya traen septiembre
-- pagado. Los hitos de `consultar_creditos` y `simular_pago_credito` arrancaban en julio.
--
-- Se corrige el dato, no se deriva mora en el codigo: derivarla contradiria a buro, al
-- diagnostico de salud y al perfil. Queda como los demas creditos:
--   1. amortizaciones 99-101: `pagado`, con `fecha_pago` = su fecha;
--   2. creditos: 101 pagos, proximo pago 2026-10-10, saldo = saldo final del pago 101;
--   3. buro: `deuda_total_centavos` vuelve a ser la suma de sus saldos insolutos
--      (137,691,032 de la hipoteca + 19,066,096 del auto). Lo comprometido no cambia.
--
-- Idempotente: cada UPDATE solo toca la fila si todavia tiene el valor viejo. Despues de
-- aplicarla hay que reiniciar el MCP: carga las tablas a memoria al arrancar.
-- El volcado de pruebas (`apps/mcp/src/__tests__/datos-de-prueba.json`) ya trae el mismo cambio.

BEGIN;

UPDATE banorte.amortizaciones
   SET estatus = 'pagado',
       fecha_pago = fecha
 WHERE credito_id = 'cred_carmen_hipotecario'
   AND numero_pago BETWEEN 99 AND 101
   AND estatus = 'vencido';

UPDATE banorte.creditos
   SET pagos_realizados = 101,
       fecha_proximo_pago = DATE '2026-10-10',
       saldo_insoluto_centavos = 137691032
 WHERE id = 'cred_carmen_hipotecario'
   AND pagos_realizados = 98;

UPDATE banorte.buro
   SET deuda_total_centavos = 156757128
 WHERE usuario_id = 'usr_carmen'
   AND deuda_total_centavos = 158051565;

COMMIT;
