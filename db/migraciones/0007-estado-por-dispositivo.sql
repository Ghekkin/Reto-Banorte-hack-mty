-- Migracion 0007 — el estado mutable se aisla por dispositivo
-- (docs/como-funciona/estado-por-dispositivo.md, ADR 0012)
--
-- Muchos visitantes prueban la demo a la vez con las MISMAS tres personas. Antes, el plan
-- que aplicaba uno le aparecia aplicado a todos, y la pregunta que alguien hacia en Inicio
-- le borraba la portada al resto. Ahora cada navegador es un "dispositivo" (cookie
-- `maya_dispositivo`) y lo que muta se guarda con su id:
--
--   1. `acciones_aplicadas.dispositivo_id`: cada lectura del MCP ve solo las suyas.
--      Default `comun`: lo que no trae dispositivo (humo, scripts, codigo viejo) sigue
--      siendo el estado compartido de siempre.
--   2. `pantallas_por_dispositivo`: la portada de Inicio de un dispositivo que ya se aparto
--      de la comun (aplico algo o pregunto algo). La comun sigue en `pantallas_inicio`.
--   3. `corridas.dispositivo_id` y `conversaciones.dispositivo_id`: que hizo cada quien.
--
-- TODO es aditivo a proposito: la base es la misma en local y en produccion, y durante un
-- rato conviven procesos con el codigo anterior. Ese codigo ignora las columnas nuevas y
-- sigue leyendo y escribiendo lo comun sin romperse. Por eso la portada de dispositivo va
-- en OTRA tabla y no con un cambio de llave primaria en `pantallas_inicio`: el
-- `on conflict (usuario_id)` del codigo anterior dejaria de funcionar.
--
-- Se aplica sola con `pnpm datos:migrar`; es idempotente.

ALTER TABLE banorte.acciones_aplicadas
    ADD COLUMN IF NOT EXISTS dispositivo_id TEXT NOT NULL DEFAULT 'comun';

-- La huella del Inicio cuenta las acciones de (dispositivo, persona) en cada visita.
CREATE INDEX IF NOT EXISTS ix_acciones_dispositivo
    ON banorte.acciones_aplicadas (dispositivo_id, usuario_id, id);

-- `pantalla` es la PantallaDeInicio completa en JSON (mensajes, texto, razon, sugerencias,
-- modelo, tools, tokens, procedencias, referencias...), no una columna por campo: asi un
-- campo nuevo de la portada no obliga a migrar dos tablas. Lo que se consulta o se usa de
-- candado vive en columnas.
CREATE TABLE IF NOT EXISTS banorte.pantallas_por_dispositivo (
    dispositivo_id  TEXT        NOT NULL,
    usuario_id      TEXT        NOT NULL REFERENCES banorte.usuarios(id),
    huella          TEXT        NOT NULL,
    pantalla        JSONB       NOT NULL,
    generada_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ajustada_en     TIMESTAMPTZ,
    PRIMARY KEY (dispositivo_id, usuario_id)
);

ALTER TABLE banorte.corridas
    ADD COLUMN IF NOT EXISTS dispositivo_id TEXT;
CREATE INDEX IF NOT EXISTS ix_corridas_dispositivo
    ON banorte.corridas (dispositivo_id, iniciada_en DESC);

ALTER TABLE banorte.conversaciones
    ADD COLUMN IF NOT EXISTS dispositivo_id TEXT;
CREATE INDEX IF NOT EXISTS ix_conversaciones_dispositivo
    ON banorte.conversaciones (dispositivo_id, usuario_id, actualizada_en DESC);
