-- Migracion 0003 — agrega rebalancear_portafolio y confirmar_rebalanceo al CHECK de acciones_aplicadas
ALTER TABLE banorte.acciones_aplicadas
    DROP CONSTRAINT IF EXISTS acciones_aplicadas_accion_check;
ALTER TABLE banorte.acciones_aplicadas
    ADD CONSTRAINT acciones_aplicadas_accion_check
    CHECK (accion IN ('aplicar_plan_pago','crear_tope_gasto','crear_apartado','rebalancear','cancelar_suscripcion','rebalancear_portafolio','confirmar_rebalanceo'));
