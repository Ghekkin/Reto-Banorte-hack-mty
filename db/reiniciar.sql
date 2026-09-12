-- Deja la demo en el punto de partida. Se corre ANTES de cada ensayo y antes del pitch
-- (ver skill checklist-demo).
--
--   psql "$DATABASE_URL" -f db/reiniciar.sql
--
-- No borra ni recarga los datos base: solo revierte lo que las tools de accion
-- escribieron. Es rapido a proposito, porque se corre con el jurado esperando.

SET search_path TO banorte;

BEGIN;

-- 1. Todo lo que aplicaron las acciones durante el ensayo.
TRUNCATE acciones_aplicadas RESTART IDENTITY;

-- 2. Los planes de reestructura vuelven a ser ofertas, no planes aplicados.
UPDATE creditos
   SET estatus = 'vigente'
 WHERE estatus = 'reestructurado';

-- 3. Los topes que la demo creo o movio. Los cuatro topes base se restauran desde el
--    CSV; cualquier otro lo creo una accion y no deberia sobrevivir al reinicio.
DELETE FROM topes_gasto
 WHERE id NOT LIKE 'tope_base_%';

UPDATE topes_gasto
   SET gastado_actual_centavos = 0,
       estatus                 = 'dentro';

-- 4. Las metas creadas por `crear_apartado` y el apartado automatico que activaron.
DELETE FROM metas
 WHERE id NOT LIKE 'meta_base_%';

UPDATE metas
   SET apartado_automatico = false
 WHERE apartado_automatico;

\echo '== estado tras el reinicio =='
SELECT (SELECT count(*) FROM acciones_aplicadas) AS acciones,
       (SELECT count(*) FROM topes_gasto)        AS topes,
       (SELECT count(*) FROM metas)              AS metas,
       (SELECT count(*) FROM creditos WHERE estatus = 'reestructurado') AS reestructurados;

COMMIT;
