#!/usr/bin/env node
// Vuelca el esquema `banorte` a un JSON que usan las PRUEBAS.
//
//   pnpm datos:fixture
//
// Por que existe: las pruebas no pueden pegarle a la base de la demo (entre otras
// cosas, `reiniciarEstado` la truncaria), ni depender de que haya red. Este volcado
// es material de prueba, no la fuente de datos: la fuente es PostgreSQL (ADR 0010).
// Se regenera cuando los datos de la base cambien.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'apps', 'mcp', 'src', '__tests__', 'datos-de-prueba.json');

if (!process.env.DATABASE_URL && existsSync(join(RAIZ, '.env'))) {
  for (const linea of readFileSync(join(RAIZ, '.env'), 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.DATABASE_URL) { console.error('falta DATABASE_URL'); process.exit(1); }

// Mismas reglas que apps/mcp/src/datos/postgres.ts: las fechas no se convierten a Date.
for (const oid of [1082, 1114, 1184]) pg.types.setTypeParser(oid, (v) => v);

const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
await cliente.connect();
const { rows: tablas } = await cliente.query(
  "select table_name from information_schema.tables where table_schema = 'banorte' order by table_name",
);
const salida = {};
// Las tablas de historia (corridas, chat, registros) no son datos de negocio y crecen con
// cada turno: no entran al volcado. Misma lista que TABLAS_DE_HISTORIA en apps/mcp/src/datos/postgres.ts.
const HISTORIA = new Set(['prompts', 'corridas', 'corrida_pasos', 'corrida_tools', 'conversaciones', 'mensajes_chat', 'registros']);
for (const { table_name: t } of tablas.filter(({ table_name }) => !HISTORIA.has(table_name))) {
  const { rows } = await cliente.query(`select * from banorte."${t}"`);
  salida[t] = rows.map((fila) => {
    const limpia = {};
    for (const [k, v] of Object.entries(fila)) {
      limpia[k] = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    return limpia;
  });
}
await cliente.end();
writeFileSync(DESTINO, JSON.stringify(salida, null, 1) + '\n');
const filas = Object.values(salida).reduce((n, f) => n + f.length, 0);
console.log(`${Object.keys(salida).length} tablas, ${filas} filas -> ${DESTINO.replace(RAIZ + '/', '')}`);
