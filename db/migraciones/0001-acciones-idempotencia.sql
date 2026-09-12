-- Migracion 0001 — el estado mutable vive en Postgres (ADR 0010)
--
-- Antes, las acciones se guardaban en `apps/mcp/estado.json` y esta tabla quedaba
-- vacia. Ahora las tools escriben aqui, asi que la tabla necesita dos cosas que no
-- tenia:
--
--   1. La llave de idempotencia del contrato agente-cliente, con indice UNICO: es
--      lo que hace que un reintento del agente no aplique el plan dos veces. La
--      garantia la da la base, no el codigo.
--   2. `cancelar_suscripcion` en los CHECK: la tool existe desde que se escribio
--      el esquema y no estaba contemplada.
--
-- Se aplica sola con `pnpm datos:migrar`; es idempotente.

ALTER TABLE banorte.acciones_aplicadas
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_acciones_idempotencia
    ON banorte.acciones_aplicadas (idempotency_key);

ALTER TABLE banorte.acciones_aplicadas
    DROP CONSTRAINT IF EXISTS acciones_aplicadas_accion_check;
ALTER TABLE banorte.acciones_aplicadas
    ADD CONSTRAINT acciones_aplicadas_accion_check
    CHECK (accion IN ('aplicar_plan_pago','crear_tope_gasto','crear_apartado','rebalancear','cancelar_suscripcion'));

ALTER TABLE banorte.acciones_aplicadas
    DROP CONSTRAINT IF EXISTS acciones_aplicadas_objeto_tipo_check;
ALTER TABLE banorte.acciones_aplicadas
    ADD CONSTRAINT acciones_aplicadas_objeto_tipo_check
    CHECK (objeto_tipo IN ('tarjeta','credito','categoria','meta','portafolio','suscripcion'));
