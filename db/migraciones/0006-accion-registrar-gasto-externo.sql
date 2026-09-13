-- Migracion 0006 — agrega registrar_gasto_externo al CHECK de acciones_aplicadas
--
-- `registrar_gasto_externo` guarda gastos que la persona paga fuera del banco (renta en
-- efectivo, apoyo a un familiar): `objeto_tipo = 'categoria'`, ya permitido desde la 0001,
-- con `objeto_id` = la categoria `ext_<slug>` que crea. Sin esta migracion la base rechaza
-- el insert y «Guardar gasto» falla en la demo.
-- Algoritmo en `docs/algoritmos/gastos-fuera-del-banco.md`.
--
-- Rehace el CHECK con TODOS los valores de la 0005 mas el nuevo. Idempotente.
ALTER TABLE banorte.acciones_aplicadas
    DROP CONSTRAINT IF EXISTS acciones_aplicadas_accion_check;
ALTER TABLE banorte.acciones_aplicadas
    ADD CONSTRAINT acciones_aplicadas_accion_check
    CHECK (accion IN ('aplicar_plan_pago','crear_tope_gasto','crear_apartado','rebalancear','cancelar_suscripcion','rebalancear_portafolio','confirmar_rebalanceo','programar_abono_capital','registrar_gasto_externo'));
