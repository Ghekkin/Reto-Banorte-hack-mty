-- Migracion 0002 — el Inicio personalizado que arma Maya (docs/como-funciona/inicio-personalizado.md)
--
-- Una fila por persona: la ultima pantalla A2UI que un modelo chico armo para su
-- portada, con la `huella` de los datos con los que se armo. La huella es lo que
-- evita gastar modelo en una cuenta que no se ha movido: si la de hoy es igual a
-- la guardada, no hay nada que rearmar.
--
-- Va en `banorte` como el resto del estado mutable. NO la toca `reiniciar.sql`: al
-- reiniciar la demo cambia la huella (se van las acciones) y la pantalla queda
-- desactualizada sola; el siguiente tick del reloj o la siguiente visita la rearma.
--
-- Se aplica sola con `pnpm datos:migrar`; es idempotente.

CREATE TABLE IF NOT EXISTS banorte.pantallas_inicio (
    usuario_id      TEXT        PRIMARY KEY REFERENCES banorte.usuarios(id),
    -- Con que datos se armo (ver apps/web/src/lib/inicio/huella.ts).
    huella          TEXT        NOT NULL,
    -- Los tres mensajes A2UI ya validados (createSurface, updateComponents, updateDataModel).
    mensajes        JSONB       NOT NULL,
    -- Lo que Maya le dice de frente, y por que ESTA portada.
    texto           TEXT        NOT NULL,
    razon           TEXT        NOT NULL,
    sugerencias     JSONB       NOT NULL DEFAULT '[]'::jsonb,
    -- Trazabilidad: que modelo, que tools, cuanto costo. Es lo que se ensena en el stand.
    modelo          TEXT        NOT NULL,
    tools           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    entrada_tokens  INTEGER,
    salida_tokens   INTEGER,
    cache_tokens    INTEGER,
    ms              INTEGER     NOT NULL,
    generada_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
