#!/usr/bin/env node
// Produce db/cargar-completo.sql: UN solo archivo con el esquema y los 3 690 INSERT.
//
//   node scripts/generar-sql-completo.mjs
//
// Para que existe: las otras dos rutas de carga necesitan algo que no siempre se tiene.
// `db/cargar.sql` necesita psql (usa `\copy`), y `scripts/cargar-postgres.mjs` necesita
// alcanzar el puerto de Postgres por red. Este archivo no necesita ninguna de las dos: se
// puede pegar en una consola web, correr desde el propio servidor, o mandarse por donde
// sea. Es la ruta de escape cuando el puerto esta cerrado desde donde estas trabajando.
//
// Se regenera desde los CSV, nunca se edita a mano.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = join(RAIZ, 'db', 'datos');

const TABLAS = ['usuarios', 'cuentas', 'tarjetas', 'categorias', 'comercios', 'movimientos',
  'suscripciones', 'productos_credito', 'creditos', 'amortizaciones', 'planes_reestructura',
  'buro', 'instrumentos', 'perfiles_inversion', 'modelos_portafolio', 'portafolios',
  'posiciones', 'precios_historicos', 'metas', 'topes_gasto', 'diagnostico_habitos',
  'acciones_aplicadas'];

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
    filas.push(campos.map((c) => (c === '' ? null : c)));
  }
  return { columnas, filas };
}

// Comilla simple duplicada: el unico escape que necesita un literal de texto en Postgres.
// Los valores vienen todos de nuestro generador, no de entrada externa, pero se escapa
// igual porque este archivo se va a ejecutar tal cual contra la base.
const literal = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const partes = [];
const LOTE = 200;
let totalFilas = 0;

partes.push(`-- Reto Banorte — Hack Monterrey 2026
-- Esquema + datos mock en un solo archivo. GENERADO, no editar a mano:
--   node scripts/generar-sql-completo.mjs
--
-- Correr completo contra una base vacia. Empieza tirando el esquema "banorte" si existe.
-- Todo va en una transaccion: o entra completo o no entra nada.
--
-- Los valores van como literales de texto y Postgres los castea a bigint, date, numeric y
-- boolean segun la columna. Es a proposito: evita repetir aqui los tipos del schema.
`);

partes.push('BEGIN;\n');
partes.push(readFileSync(join(RAIZ, 'db', 'schema.sql'), 'utf8')
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('\\'))
  .join('\n'));
partes.push('\n');

for (const tabla of TABLAS) {
  const { columnas, filas } = leerCsv(tabla);
  partes.push(`\n-- ${tabla}: ${filas.length} filas`);
  if (filas.length === 0) {
    partes.push(`-- (arranca vacia a proposito: la escriben las tools de accion)\n`);
    continue;
  }
  totalFilas += filas.length;
  const lista = columnas.map((c) => `"${c}"`).join(', ');

  for (let inicio = 0; inicio < filas.length; inicio += LOTE) {
    const lote = filas.slice(inicio, inicio + LOTE);
    partes.push(`INSERT INTO banorte.${tabla} (${lista}) VALUES`);
    partes.push(lote.map((f) => '  (' + f.map(literal).join(', ') + ')').join(',\n') + ';');
  }
  partes.push('');
}

// Verificacion dentro del propio archivo: al terminar imprime el conteo por tabla, para que
// quien lo corra vea si entro todo sin tener que escribir una consulta.
partes.push('\n-- Conteo final');
partes.push(TABLAS.map((t, i) =>
  `${i === 0 ? 'SELECT' : 'UNION ALL SELECT'} '${t}' AS tabla, count(*) AS filas FROM banorte.${t}`).join('\n') + '\nORDER BY 1;');

partes.push('\nCOMMIT;\n');

const salida = join(RAIZ, 'db', 'cargar-completo.sql');
const contenido = partes.join('\n');
writeFileSync(salida, contenido, 'utf8');

const kb = (Buffer.byteLength(contenido, 'utf8') / 1024).toFixed(0);
console.log(`\ndb/cargar-completo.sql  ${kb} KB, ${totalFilas} filas en 22 tablas\n`);
console.log('Correrlo desde donde tengas acceso a la base:');
console.log('  psql "$POSTGRE_BANORTE_URL" -f db/cargar-completo.sql');
console.log('o pegar su contenido en una consola SQL web.\n');
