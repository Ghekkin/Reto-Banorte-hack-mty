-- Migracion 0005 — agrega programar_abono_capital al CHECK de acciones_aplicadas
--
-- `programar_abono_capital` guarda un abono a capital mensual sobre un credito a plazo
-- (`objeto_tipo = 'credito'`, que ya estaba permitido desde la 0001). Sin esta
-- migracion la base rechaza el insert y la accion falla en la demo.
-- Algoritmo en `docs/algoritmos/abono-a-capital.md`.
--
-- Rehace el CHECK con TODOS los valores de la 0003 mas el nuevo. Idempotente.
ALTER TABLE banorte.acciones_aplicadas
    DROP CONSTRAINT IF EXISTS acciones_aplicadas_accion_check;
ALTER TABLE banorte.acciones_aplicadas
    ADD CONSTRAINT acciones_aplicadas_accion_check
    CHECK (accion IN ('aplicar_plan_pago','crear_tope_gasto','crear_apartado','rebalancear','cancelar_suscripcion','rebalancear_portafolio','confirmar_rebalanceo','programar_abono_capital'));
