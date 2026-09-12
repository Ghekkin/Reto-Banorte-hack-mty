-- Carga de los 22 CSV en orden de dependencia.
--
--   psql "$DATABASE_URL" -f db/schema.sql
--   psql "$DATABASE_URL" -f db/cargar.sql
--
-- Se usa \copy (cliente) y no COPY (servidor) para que las rutas sean relativas al
-- repo y no haga falta que el archivo viva en la maquina del servidor. Correr desde
-- la raiz del repo.

SET search_path TO banorte;

\echo '== nucleo =='
\copy usuarios            FROM 'db/datos/usuarios.csv'            WITH (FORMAT csv, HEADER true)
\copy cuentas             FROM 'db/datos/cuentas.csv'             WITH (FORMAT csv, HEADER true)
\copy tarjetas            FROM 'db/datos/tarjetas.csv'            WITH (FORMAT csv, HEADER true)

\echo '== banca personal =='
\copy categorias          FROM 'db/datos/categorias.csv'          WITH (FORMAT csv, HEADER true)
\copy comercios           FROM 'db/datos/comercios.csv'           WITH (FORMAT csv, HEADER true)
\copy movimientos         FROM 'db/datos/movimientos.csv'         WITH (FORMAT csv, HEADER true)
\copy suscripciones       FROM 'db/datos/suscripciones.csv'       WITH (FORMAT csv, HEADER true)

\echo '== credito =='
\copy productos_credito   FROM 'db/datos/productos_credito.csv'   WITH (FORMAT csv, HEADER true)
\copy creditos            FROM 'db/datos/creditos.csv'            WITH (FORMAT csv, HEADER true)
\copy amortizaciones      FROM 'db/datos/amortizaciones.csv'      WITH (FORMAT csv, HEADER true)
\copy planes_reestructura FROM 'db/datos/planes_reestructura.csv' WITH (FORMAT csv, HEADER true)
\copy buro                FROM 'db/datos/buro.csv'                WITH (FORMAT csv, HEADER true)

\echo '== inversiones =='
\copy instrumentos        FROM 'db/datos/instrumentos.csv'        WITH (FORMAT csv, HEADER true)
\copy perfiles_inversion  FROM 'db/datos/perfiles_inversion.csv'  WITH (FORMAT csv, HEADER true)
\copy modelos_portafolio  FROM 'db/datos/modelos_portafolio.csv'  WITH (FORMAT csv, HEADER true)
\copy portafolios         FROM 'db/datos/portafolios.csv'         WITH (FORMAT csv, HEADER true)
\copy posiciones          FROM 'db/datos/posiciones.csv'          WITH (FORMAT csv, HEADER true)
\copy precios_historicos  FROM 'db/datos/precios_historicos.csv'  WITH (FORMAT csv, HEADER true)

\echo '== educacion financiera =='
\copy metas               FROM 'db/datos/metas.csv'               WITH (FORMAT csv, HEADER true)
\copy topes_gasto         FROM 'db/datos/topes_gasto.csv'         WITH (FORMAT csv, HEADER true)
\copy diagnostico_habitos FROM 'db/datos/diagnostico_habitos.csv' WITH (FORMAT csv, HEADER true)

\echo '== estado mutable (arranca vacia) =='
\copy acciones_aplicadas (usuario_id, accion, objeto_tipo, objeto_id, contexto, resultado) FROM 'db/datos/acciones_aplicadas.csv' WITH (FORMAT csv, HEADER true)

\echo '== conteo =='
SELECT 'usuarios' AS tabla, count(*) FROM usuarios
UNION ALL SELECT 'cuentas',             count(*) FROM cuentas
UNION ALL SELECT 'tarjetas',            count(*) FROM tarjetas
UNION ALL SELECT 'categorias',          count(*) FROM categorias
UNION ALL SELECT 'comercios',           count(*) FROM comercios
UNION ALL SELECT 'movimientos',         count(*) FROM movimientos
UNION ALL SELECT 'suscripciones',       count(*) FROM suscripciones
UNION ALL SELECT 'productos_credito',   count(*) FROM productos_credito
UNION ALL SELECT 'creditos',            count(*) FROM creditos
UNION ALL SELECT 'amortizaciones',      count(*) FROM amortizaciones
UNION ALL SELECT 'planes_reestructura', count(*) FROM planes_reestructura
UNION ALL SELECT 'buro',                count(*) FROM buro
UNION ALL SELECT 'instrumentos',        count(*) FROM instrumentos
UNION ALL SELECT 'perfiles_inversion',  count(*) FROM perfiles_inversion
UNION ALL SELECT 'modelos_portafolio',  count(*) FROM modelos_portafolio
UNION ALL SELECT 'portafolios',         count(*) FROM portafolios
UNION ALL SELECT 'posiciones',          count(*) FROM posiciones
UNION ALL SELECT 'precios_historicos',  count(*) FROM precios_historicos
UNION ALL SELECT 'metas',               count(*) FROM metas
UNION ALL SELECT 'topes_gasto',         count(*) FROM topes_gasto
UNION ALL SELECT 'diagnostico_habitos', count(*) FROM diagnostico_habitos
UNION ALL SELECT 'acciones_aplicadas',  count(*) FROM acciones_aplicadas
ORDER BY 1;
