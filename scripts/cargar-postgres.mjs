#!/usr/bin/env node
// Crea el esquema en PostgreSQL y sube los 22 CSV de db/datos.
//
//   node scripts/cargar-postgres.mjs --inspeccionar   # solo reporta el estado, no toca nada
//   node scripts/cargar-postgres.mjs                  # crea el esquema y carga (aborta si ya existe)
//   node scripts/cargar-postgres.mjs --recrear        # DESTRUCTIVO: tira el esquema banorte y lo rehace
//   node scripts/cargar-postgres.mjs --reiniciar      # solo revierte lo que las acciones escribieron
//
// Existe porque `db/cargar.sql` usa `\copy`, que es un meta-comando de psql: si no tienes
// psql instalado, no hay forma de correrlo. Este script hace lo mismo con el driver `pg`.
// Las dos rutas son equivalentes; usa la que tengas a mano.
//
// A diferencia de `\copy`, aqui cada INSERT lleva la lista explicita de columnas tomada del
// encabezado del CSV, asi que el orden de columnas deja de importar.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = join(RAIZ, 'db', 'datos');

const banderas = new Set(process.argv.slice(2));
const SOLO_INSPECCIONAR = banderas.has('--inspeccionar');
const RECREAR = banderas.has('--recrear');
const SOLO_REINICIAR = banderas.has('--reiniciar');

// El orden importa: es el de dependencia entre tablas.
const TABLAS = ['usuarios', 'cuentas', 'tarjetas', 'categorias', 'comercios', 'movimientos',
  'suscripciones', 'productos_credito', 'creditos', 'amortizaciones', 'planes_reestructura',
  'buro', 'instrumentos', 'perfiles_inversion', 'modelos_portafolio', 'portafolios',
  'posiciones', 'precios_historicos', 'metas', 'topes_gasto', 'diagnostico_habitos',
  'acciones_aplicadas'];

// ===========================================================================
// .env
// ===========================================================================
// Parser minimo en vez de dotenv: una dependencia menos y son diez lineas. Soporta
// comentarios, comillas y valores con `=` dentro (una URL de conexion los tiene).
function leerEnv() {
  let texto;
  try {
    texto = readFileSync(join(RAIZ, '.env'), 'utf8');
  } catch {
    return {};
  }
  const env = {};
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const corte = limpia.indexOf('=');
    if (corte === -1) continue;
    const clave = limpia.slice(0, corte).trim();
    let valor = limpia.slice(corte + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    env[clave] = valor;
  }
  return env;
}

const env = { ...leerEnv(), ...process.env };
const URL_CONEXION = env.POSTGRE_BANORTE_URL ?? env.DATABASE_URL;

if (!URL_CONEXION) {
  console.error('\nFalta POSTGRE_BANORTE_URL en .env (o DATABASE_URL en el entorno).\n');
  process.exit(1);
}

// Nunca se imprime la URL completa: lleva la contraseña.
function describirDestino(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || 5432}${u.pathname} como ${u.username}`;
  } catch {
    return '(no se pudo interpretar la URL)';
  }
}

// Los Postgres gestionados casi siempre exigen TLS y muchos presentan un certificado que
// no cadena con una CA publica. Si la URL pide sslmode, se habilita TLS sin verificar la
// cadena: es un dato mock en un hackathon, no vale trabar la carga por esto.
function opcionesSsl(url) {
  const m = /[?&]sslmode=([^&]+)/.exec(url);
  const modo = m ? m[1] : null;
  if (!modo || modo === 'disable') return false;
  return { rejectUnauthorized: false };
}

// ===========================================================================
// CSV
// ===========================================================================
function leerCsv(nombre) {
  const texto = readFileSync(join(DATOS, `${nombre}.csv`), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  const lineas = texto.split('\n');
  const columnas = lineas[0].split(',');
  const filas = [];

  for (const linea of lineas.slice(1)) {
    if (!linea) continue;
    const campos = [];
    let actual = '';
    let enComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') {
        if (enComillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else enComillas = !enComillas;
      } else if (ch === ',' && !enComillas) { campos.push(actual); actual = ''; }
      else actual += ch;
    }
    campos.push(actual);
    // Campo vacio = NULL, igual que hace \copy con FORMAT csv.
    filas.push(campos.map((c) => (c === '' ? null : c)));
  }

  return { columnas, filas };
}

/** Quita los meta-comandos de psql (`\echo`, `\copy`) que no son SQL valido. */
const soloSql = (texto) => texto.split('\n').filter((l) => !l.trimStart().startsWith('\\')).join('\n');

// ===========================================================================
// Carga
// ===========================================================================
const LOTE = 500;   // filas por INSERT; con 2 265 movimientos son 5 viajes

async function cargarTabla(cliente, nombre) {
  const { columnas, filas } = leerCsv(nombre);
  if (filas.length === 0) return 0;

  const listaColumnas = columnas.map((c) => `"${c}"`).join(', ');
  let insertadas = 0;

  for (let inicio = 0; inicio < filas.length; inicio += LOTE) {
    const lote = filas.slice(inicio, inicio + LOTE);
    const valores = [];
    const marcadores = lote.map((fila, f) =>
      '(' + fila.map((v, c) => { valores.push(v); return `$${f * columnas.length + c + 1}`; }).join(', ') + ')');
    await cliente.query(
      `INSERT INTO banorte.${nombre} (${listaColumnas}) VALUES ${marcadores.join(', ')}`,
      valores,
    );
    insertadas += lote.length;
  }

  return insertadas;
}

async function estadoDelEsquema(cliente) {
  const { rows } = await cliente.query(`
    SELECT c.relname AS tabla, COALESCE(s.n_live_tup, 0) AS filas
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
     WHERE n.nspname = 'banorte' AND c.relkind = 'r'
     ORDER BY c.relname`);
  return rows;
}

async function conteoReal(cliente) {
  const consultas = TABLAS.map((t) => `SELECT '${t}' AS tabla, count(*)::int AS filas FROM banorte.${t}`);
  const { rows } = await cliente.query(consultas.join(' UNION ALL ') + ' ORDER BY tabla');
  return rows;
}

// ===========================================================================
// Principal
// ===========================================================================
const cliente = new pg.Client({ connectionString: URL_CONEXION, ssl: opcionesSsl(URL_CONEXION) });

try {
  console.log(`\nConectando a ${describirDestino(URL_CONEXION)}`);
  await cliente.connect();

  const { rows: [info] } = await cliente.query(
    'SELECT current_database() AS db, current_user AS usuario, version() AS version');
  console.log(`  ${info.version.split(',')[0]}`);
  console.log(`  base "${info.db}", usuario "${info.usuario}"`);

  const existentes = await estadoDelEsquema(cliente);

  // --- Inspeccionar -----------------------------------------------------------
  if (SOLO_INSPECCIONAR) {
    if (existentes.length === 0) {
      console.log('\nEl esquema "banorte" no existe. Se puede crear sin destruir nada.\n');
    } else {
      console.log(`\nEl esquema "banorte" YA EXISTE con ${existentes.length} tablas:\n`);
      for (const r of await conteoReal(cliente)) {
        console.log(`  ${r.tabla.padEnd(22)} ${String(r.filas).padStart(6)} filas`);
      }
      console.log('\nCargar de nuevo requiere --recrear, que TIRA el esquema y todo lo que tenga.\n');
    }
    process.exit(0);
  }

  // --- Reiniciar --------------------------------------------------------------
  if (SOLO_REINICIAR) {
    if (existentes.length === 0) {
      console.error('\nEl esquema "banorte" no existe: no hay nada que reiniciar.\n');
      process.exit(1);
    }
    await cliente.query(soloSql(readFileSync(join(RAIZ, 'db', 'reiniciar.sql'), 'utf8')));
    console.log('\nDemo reiniciada: acciones_aplicadas vacia, topes y metas restaurados.\n');
    process.exit(0);
  }

  // --- Guardia contra el borrado accidental ----------------------------------
  if (existentes.length > 0 && !RECREAR) {
    console.error(`\nEl esquema "banorte" ya existe con ${existentes.length} tablas.`);
    console.error('No se toca nada. Para verlo:      node scripts/cargar-postgres.mjs --inspeccionar');
    console.error('Para rehacerlo (DESTRUCTIVO):     node scripts/cargar-postgres.mjs --recrear\n');
    process.exit(1);
  }

  // --- Esquema ----------------------------------------------------------------
  console.log('\nCreando el esquema (db/schema.sql)');
  await cliente.query(soloSql(readFileSync(join(RAIZ, 'db', 'schema.sql'), 'utf8')));
  console.log('  22 tablas, FKs, CHECK e indices');

  // --- Datos ------------------------------------------------------------------
  // Todo en una transaccion: si una FK falla a media carga, no queda una base a medias que
  // parezca cargada. O entran los 22 archivos o no entra ninguno.
  console.log('\nCargando db/datos/ en una sola transaccion');
  await cliente.query('BEGIN');
  try {
    for (const tabla of TABLAS) {
      const n = await cargarTabla(cliente, tabla);
      console.log(`  ${tabla.padEnd(22)} ${String(n).padStart(6)} filas`);
    }
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  }

  // --- Verificacion -----------------------------------------------------------
  const conteo = await conteoReal(cliente);
  const total = conteo.reduce((s, r) => s + r.filas, 0);

  // Se compara contra el CSV, no contra un numero escrito a mano: si el generador cambia,
  // esta comprobacion sigue siendo valida.
  let discrepancias = 0;
  for (const tabla of TABLAS) {
    const esperadas = leerCsv(tabla).filas.length;
    const cargadas = conteo.find((r) => r.tabla === tabla).filas;
    if (esperadas !== cargadas) {
      console.error(`  DISCREPANCIA  ${tabla}: el CSV tiene ${esperadas}, la base ${cargadas}`);
      discrepancias++;
    }
  }

  if (discrepancias > 0) {
    console.error(`\n${discrepancias} tablas no cuadran con su CSV.\n`);
    process.exit(1);
  }

  console.log(`\nOK  22 tablas, ${total} filas, todas cuadran con su CSV.`);
  console.log('    Antes de cada ensayo:  node scripts/cargar-postgres.mjs --reiniciar\n');
} catch (error) {
  // El mensaje de pg incluye detalle util (que CHECK, que FK) pero nunca la URL.
  console.error(`\nFallo: ${error.message}`);
  if (error.detail) console.error(`Detalle: ${error.detail}`);
  if (error.hint) console.error(`Sugerencia: ${error.hint}`);
  if (error.table) console.error(`Tabla: ${error.table}`);
  if (error.constraint) console.error(`Restriccion: ${error.constraint}`);
  console.error('');
  process.exit(1);
} finally {
  await cliente.end().catch(() => {});
}
