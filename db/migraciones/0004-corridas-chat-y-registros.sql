-- Migracion 0004 — todo lo que pasa queda en la base (docs/como-funciona/corridas-en-db.md)
--
-- Tres familias de tablas, todas en `banorte` y todas FUERA de `reiniciar.sql`: reiniciar
-- la demo borra el estado de las acciones, no la historia de lo que se probo.
--
--  1. CORRIDAS: cada vez que un modelo trabaja (un turno del chat o una portada del
--     Inicio) queda una fila con que modelo, que opciones, que tools se le ofrecieron,
--     que se le mando, cada paso con su uso de tokens, cada tool con sus argumentos y su
--     resultado, y cada linea que salio hacia el navegador.
--  2. CHAT: las conversaciones y sus mensajes, ligados a la corrida que los produjo.
--  3. REGISTROS: los logs estructurados de la web y del MCP, con la corrida si la hay.
--
-- Nada aqui se lee para decidir algo del producto: es para depurar. Por eso las
-- escrituras son "mejor esfuerzo" (si fallan, el turno sigue) y ninguna prueba las toca.
--
-- Se aplica sola con `pnpm datos:migrar`; es idempotente.

-- Textos grandes que se repiten en cada corrida (el system prompt, las definiciones de
-- tools). Se guardan una vez por hash y la corrida guarda solo el hash.
CREATE TABLE IF NOT EXISTS banorte.prompts (
    hash        TEXT        PRIMARY KEY,
    tipo        TEXT        NOT NULL CHECK (tipo IN ('sistema', 'tools')),
    contenido   TEXT        NOT NULL,
    bytes       INTEGER     NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banorte.corridas (
    id                  TEXT        PRIMARY KEY,
    -- `turno`: una peticion a /api/agente. `portada`: una generacion del Inicio.
    tipo                TEXT        NOT NULL CHECK (tipo IN ('turno', 'portada')),
    usuario_id          TEXT,
    conversacion_id     TEXT,
    -- Por que corrio una portada (reloj, visita, accion, api); en un turno, si vino de
    -- texto, de una accion de la interfaz o de un aviso de error del renderer.
    motivo              TEXT,
    -- corriendo -> ok | sin_pantalla | error | timeout | cortada
    estado              TEXT        NOT NULL DEFAULT 'corriendo',
    proveedor           TEXT,
    modelo              TEXT,
    opciones_proveedor  JSONB       NOT NULL DEFAULT '{}'::jsonb,
    -- Flags y limites con los que corrio: agenteLigero, maxPasos, timeoutMs...
    config              JSONB       NOT NULL DEFAULT '{}'::jsonb,
    version_app         TEXT,
    prompt_sistema_hash TEXT        REFERENCES banorte.prompts(hash),
    tools_hash          TEXT        REFERENCES banorte.prompts(hash),
    -- Nombres de las tools que se le ofrecieron al modelo, con su origen (mcp|host|cierre).
    tools_ofrecidas     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- La peticion del cliente tal cual llego (turno) o los datos reunidos (portada).
    peticion            JSONB,
    -- Los mensajes que vio el modelo SIN el system prompt (ese va por hash).
    mensajes_modelo     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- Cada linea JSONL que salio hacia el navegador, en orden.
    lineas              JSONB       NOT NULL DEFAULT '[]'::jsonb,
    cierre              TEXT,
    pasos               INTEGER,
    tokens_entrada      INTEGER,
    tokens_salida       INTEGER,
    tokens_cache        INTEGER,
    tokens_razonamiento INTEGER,
    texto               TEXT,
    error               TEXT,
    ms                  INTEGER,
    iniciada_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    terminada_en        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_corridas_iniciada ON banorte.corridas (iniciada_en DESC);
CREATE INDEX IF NOT EXISTS ix_corridas_conversacion ON banorte.corridas (conversacion_id, iniciada_en);
CREATE INDEX IF NOT EXISTS ix_corridas_usuario ON banorte.corridas (usuario_id, iniciada_en DESC);

-- Una fila por peticion al modelo dentro de la corrida.
CREATE TABLE IF NOT EXISTS banorte.corrida_pasos (
    corrida_id          TEXT        NOT NULL REFERENCES banorte.corridas(id) ON DELETE CASCADE,
    paso                INTEGER     NOT NULL,
    -- Las tools que el modelo podia llamar en ESTE paso (prepareStep puede recortarlas).
    tools_activas       JSONB,
    tool_choice         TEXT,
    finish_reason       TEXT,
    modelo_respuesta    TEXT,
    respuesta_id        TEXT,
    tokens_entrada      INTEGER,
    tokens_salida       INTEGER,
    tokens_cache        INTEGER,
    tokens_razonamiento INTEGER,
    texto               TEXT,
    razonamiento        TEXT,
    llamadas            JSONB       NOT NULL DEFAULT '[]'::jsonb,
    advertencias        JSONB       NOT NULL DEFAULT '[]'::jsonb,
    metadata_proveedor  JSONB,
    terminado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (corrida_id, paso)
);

-- Una fila por llamada a una tool, con lo que entro y lo que salio.
CREATE TABLE IF NOT EXISTS banorte.corrida_tools (
    id              BIGSERIAL   PRIMARY KEY,
    corrida_id      TEXT        NOT NULL REFERENCES banorte.corridas(id) ON DELETE CASCADE,
    -- El paso del modelo en que se pidio; -1 para lo que el host consulto antes del modelo.
    paso            INTEGER     NOT NULL,
    tool_call_id    TEXT,
    nombre          TEXT        NOT NULL,
    -- mcp | host | cierre | prefetch
    origen          TEXT        NOT NULL,
    argumentos      JSONB,
    resultado       JSONB,
    ok              BOOLEAN     NOT NULL,
    error           TEXT,
    ms              INTEGER,
    llamada_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_corrida_tools_corrida ON banorte.corrida_tools (corrida_id, id);
CREATE INDEX IF NOT EXISTS ix_corrida_tools_nombre ON banorte.corrida_tools (nombre, llamada_en DESC);

CREATE TABLE IF NOT EXISTS banorte.conversaciones (
    id              TEXT        PRIMARY KEY,
    usuario_id      TEXT        NOT NULL,
    turnos          INTEGER     NOT NULL DEFAULT 0,
    creada_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conversaciones_usuario ON banorte.conversaciones (usuario_id, actualizada_en DESC);

CREATE TABLE IF NOT EXISTS banorte.mensajes_chat (
    id              BIGSERIAL   PRIMARY KEY,
    conversacion_id TEXT        NOT NULL REFERENCES banorte.conversaciones(id) ON DELETE CASCADE,
    corrida_id      TEXT        REFERENCES banorte.corridas(id) ON DELETE SET NULL,
    -- usuario | accion | aviso_interfaz | agente
    rol             TEXT        NOT NULL,
    texto           TEXT,
    -- En los del agente: los mensajes A2UI que pinto, la razon, las sugerencias, el cierre.
    -- En los de accion o aviso: el `action` o el `error` completos que mando la interfaz.
    datos           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_mensajes_chat_conversacion ON banorte.mensajes_chat (conversacion_id, id);

CREATE TABLE IF NOT EXISTS banorte.registros (
    id          BIGSERIAL   PRIMARY KEY,
    -- web | agente | inicio | mcp
    fuente      TEXT        NOT NULL,
    -- debug | info | warn | error
    nivel       TEXT        NOT NULL DEFAULT 'info',
    evento      TEXT        NOT NULL,
    corrida_id  TEXT,
    usuario_id  TEXT,
    datos       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_registros_creado ON banorte.registros (creado_en DESC);
CREATE INDEX IF NOT EXISTS ix_registros_corrida ON banorte.registros (corrida_id);
