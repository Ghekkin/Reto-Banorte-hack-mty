-- Migracion 0005 — widgets vivos (docs/como-funciona/widgets-vivos.md, ADR 0011)
--
-- Una portada armada por fuentes guarda DE DONDE salio cada tarjeta: la tool del MCP, los
-- argumentos con que se llamo, los parametros y variantes que eligio el modelo y la huella
-- (sha256) del resultado. Es lo que permite:
--   - preguntarle a UNA tarjeta y re-consultar solo su fuente, sin rearmar el dashboard;
--   - auditar que las cifras en pantalla son exactamente lo que devuelve el MCP.
--
-- `referencias` dice a que tarjeta y campo apunta cada cifra de apoyo de la Conclusion,
-- para rehacerlas cuando su tarjeta cambie.
--
-- Una portada del modo anterior (FEATURE_WIDGETS_VIVOS=0) deja las dos en su default.
-- Se aplica sola con `pnpm datos:migrar`; es idempotente.

ALTER TABLE banorte.pantallas_inicio
    ADD COLUMN IF NOT EXISTS procedencias JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS referencias  JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Cuando una pregunta cambio una tarjeta en su lugar (null si nunca).
    ADD COLUMN IF NOT EXISTS ajustada_en  TIMESTAMPTZ;
