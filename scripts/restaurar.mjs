#!/usr/bin/env node
// Repuebla el esquema `banorte` desde el volcado de datos.
//
//   pnpm datos:restaurar            # inserta lo que falte (no borra nada)
//   pnpm datos:restaurar --recrear  # DESTRUCTIVO: vacia las tablas y las vuelve a llenar
//
// Existe como red de seguridad: desde el ADR 0010 la fuente de datos es PostgreSQL y
// ya no hay CSV que recargar. Si alguien vacia la base por accidente a las 3 am, esto
// la devuelve al punto de partida sin depender de nadie.
//
// El volcado (apps/mcp/src/__tests__/datos-de-prueba.json) se regenera desde la base
// con `pnpm datos:fixture`.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const VOLCADO = join(RAIZ, 'apps', 'mcp', 'src', '__tests__', 'datos-de-prueba.json');

if (!process.env.DATABASE_URL && existsSync(join(RAIZ, '.env'))) {
  for (const linea of readFileSync(join(RAIZ, '.env'), 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.DATABASE_URL) { console.error('falta DATABASE_URL'); process.exit(1); }

const RECREAR = process.argv.includes('--recrear');

// El orden importa: es el de dependencia entre tablas (las llaves foraneas). Primero las
// cuatro que no dependen de nadie, luego las demas.
//
// Ojo: este orden solo se puede verificar contra una base VACIA. Contra la base de la
// demo, que ya tiene los datos, cada insert cae en `on conflict do nothing` y un orden
// malo pasa desapercibido. Asi estuvo: `modelos_portafolio` iba antes que `instrumentos`,
// y el plan B —Postgres local para presentar sin red— fallaba con una violacion de
// llave foranea la primera vez que alguien lo intentara.
const ORDEN = [
  // sin dependencias
  'usuarios', 'categorias', 'instrumentos', 'productos_credito',
  // primer nivel
  'cuentas', 'comercios', 'buro', 'diagnostico_habitos', 'perfiles_inversion',
  'modelos_portafolio', 'precios_historicos',
  // dependen de cuentas / categorias / comercios
  'tarjetas', 'movimientos', 'suscripciones', 'metas', 'topes_gasto', 'portafolios',
  // dependen de tarjetas / portafolios
  'creditos', 'planes_reestructura', 'posiciones',
  // dependen de creditos
  'amortizaciones',
  // estado mutable
  'acciones_aplicadas',
];

const datos = JSON.parse(readFileSync(VOLCADO, 'utf8'));
const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
await cliente.connect();
console.log(`Conectado a ${process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASS@')}`);

if (RECREAR) {
  console.log('  --recrear: vaciando las tablas…');
  await cliente.query(`truncate table ${ORDEN.map((t) => `banorte."${t}"`).join(', ')} restart identity cascade`);
}

let total = 0;
for (const tabla of ORDEN) {
  const filas = datos[tabla] ?? [];
  if (filas.length === 0) continue;
  const columnas = Object.keys(filas[0]);
  let insertadas = 0;
  for (const fila of filas) {
    const valores = columnas.map((c) => (fila[c] === '' ? null : fila[c]));
    const marcas = columnas.map((_, i) => `$${i + 1}`).join(', ');
    let rowCount = 0;
    try {
      ({ rowCount } = await cliente.query(
        `insert into banorte."${tabla}" (${columnas.map((c) => `"${c}"`).join(', ')}) values (${marcas}) on conflict do nothing`,
        valores,
      ));
    } catch (error) {
      console.error(`\nFallo insertando en banorte.${tabla}: ${error.message}`);
      if (error.detail) console.error(`  ${error.detail}`);
      console.error('  Si es una llave foranea, la tabla de la que depende va despues en ORDEN.');
      await cliente.end();
      process.exit(1);
    }
    insertadas += rowCount ?? 0;
  }
  total += insertadas;
  if (insertadas > 0) console.log(`  ${tabla}: ${insertadas} fila(s)`);
}
await cliente.end();
console.log(total === 0 ? 'La base ya estaba completa; no se inserto nada.' : `${total} filas restauradas.`);
