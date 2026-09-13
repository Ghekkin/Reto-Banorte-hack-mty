-- Migracion 0008 — las preguntas a una tarjeta de Inicio tambien son corridas
-- (docs/como-funciona/corridas-en-db.md, issue #35)
--
-- Con widgets vivos, preguntarle a una tarjeta (`POST /api/inicio/widget`) llama al modelo, y
-- hasta ahora no dejaba nada en la base: ni tokens, ni pasos, ni tools. Era el unico consumo
-- del modelo que no se podia medir. Desde esta migracion se graba como cualquier corrida, con
-- `tipo = 'widget'`.
--
-- Lo unico que cambia es el CHECK de `corridas.tipo` (lo creo la 0004 con `turno` y `portada`;
-- Postgres le puso el nombre `corridas_tipo_check`). Se quita y se vuelve a poner con los tres
-- valores, asi que correrla dos veces deja lo mismo.
--
-- Mientras no se aplique, el codigo nuevo intenta grabar y la base lo rechaza: la grabadora lo
-- avisa una vez en consola y la persona recibe su respuesta igual. El codigo anterior no
-- escribe `widget`, asi que no le afecta.
--
-- Se aplica sola con `pnpm datos:migrar`; es idempotente.

ALTER TABLE banorte.corridas DROP CONSTRAINT IF EXISTS corridas_tipo_check;
ALTER TABLE banorte.corridas
    ADD CONSTRAINT corridas_tipo_check CHECK (tipo IN ('turno', 'portada', 'widget'));
