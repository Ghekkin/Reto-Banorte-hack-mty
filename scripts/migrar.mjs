#!/usr/bin/env node
// Aplica en orden los .sql de db/migraciones. Cada migracion es idempotente, asi que
// correr esto dos veces no hace dano.
//
//   pnpm datos:migrar
//
// Lee DATABASE_URL del entorno o del .env de la raiz.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.DATABASE_URL && existsSync(join(RAIZ, '.env'))) {
  for (const linea of readFileSync(join(RAIZ, '.env'), 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('falta DATABASE_URL (ponla en .env o en el entorno)');
  process.exit(1);
}

const carpeta = join(RAIZ, 'db', 'migraciones');
const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.sql')).sort();

const cliente = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
await cliente.connect();
console.log(`Conectado a ${url.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASS@')}`);
for (const archivo of archivos) {
  process.stdout.write(`  ${archivo} … `);
  await cliente.query(readFileSync(join(carpeta, archivo), 'utf8'));
  console.log('ok');
}
await cliente.end();
console.log(`${archivos.length} migracion(es) aplicada(s).`);
