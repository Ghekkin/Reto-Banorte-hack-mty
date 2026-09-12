// Comprueba que el orden de columnas de cada CSV coincida con el de su tabla en
// schema.sql. Es critico y silencioso: `\copy ... WITH (FORMAT csv, HEADER true)` IGNORA
// los nombres del encabezado y mapea por POSICION, asi que un orden distinto no da error
// de columna desconocida: mete los datos en la columna equivocada, y solo se nota cuando
// un CHECK o un tipo revienta (o peor, cuando no revienta).
//
//   node scripts/verificar-orden-columnas.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(RAIZ, 'db', 'schema.sql'), 'utf8');

// Columnas declaradas en cada CREATE TABLE, en orden. Se ignoran las lineas de
// CONSTRAINT/PRIMARY KEY/UNIQUE/CHECK, que no son columnas.
function columnasDeTabla(nombre) {
  const inicio = sql.indexOf(`CREATE TABLE ${nombre} (`);
  if (inicio === -1) return null;
  const cuerpo = sql.slice(inicio + `CREATE TABLE ${nombre} (`.length);
  const fin = cuerpo.indexOf('\n);');
  const lineas = cuerpo.slice(0, fin).split('\n');

  const columnas = [];
  for (const linea of lineas) {
    const limpia = linea.replace(/--.*$/, '').trim();
    if (!limpia) continue;
    if (/^(CONSTRAINT|PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY)\b/i.test(limpia)) continue;
    const m = limpia.match(/^([a-z_][a-z0-9_]*)\s+/i);
    if (m) columnas.push(m[1]);
  }
  return columnas;
}

// `acciones_aplicadas` se carga con lista explicita de columnas en cargar.sql porque su
// `id` es BIGSERIAL y no viene en el CSV: se compara contra esa lista, no contra la tabla.
const CON_LISTA_EXPLICITA = {
  acciones_aplicadas: ['usuario_id', 'accion', 'objeto_tipo', 'objeto_id', 'contexto', 'resultado'],
};

const TABLAS = ['usuarios', 'cuentas', 'tarjetas', 'categorias', 'comercios', 'movimientos',
  'suscripciones', 'productos_credito', 'creditos', 'amortizaciones', 'planes_reestructura',
  'buro', 'instrumentos', 'perfiles_inversion', 'modelos_portafolio', 'portafolios',
  'posiciones', 'precios_historicos', 'metas', 'topes_gasto', 'diagnostico_habitos',
  'acciones_aplicadas'];

let errores = 0;

for (const tabla of TABLAS) {
  const esperadas = CON_LISTA_EXPLICITA[tabla] ?? columnasDeTabla(tabla);
  if (!esperadas) {
    console.log(`  ERROR  ${tabla}: no aparece en schema.sql`);
    errores++;
    continue;
  }

  const encabezado = readFileSync(join(RAIZ, 'db', 'datos', `${tabla}.csv`), 'utf8')
    .split('\n')[0].trim().split(',');

  if (esperadas.join(',') === encabezado.join(',')) {
    console.log(`  ok     ${tabla.padEnd(22)} ${encabezado.length} columnas`);
    continue;
  }

  errores++;
  console.log(`  ERROR  ${tabla}`);
  console.log(`         tabla: ${esperadas.join(', ')}`);
  console.log(`         csv:   ${encabezado.join(', ')}`);
  const faltan = esperadas.filter((c) => !encabezado.includes(c));
  const sobran = encabezado.filter((c) => !esperadas.includes(c));
  if (faltan.length) console.log(`         faltan en el CSV: ${faltan.join(', ')}`);
  if (sobran.length) console.log(`         no existen en la tabla: ${sobran.join(', ')}`);
  if (!faltan.length && !sobran.length) console.log('         mismas columnas, ORDEN distinto');
}

console.log('');
if (errores === 0) console.log('OK  el orden de columnas de los 22 CSV coincide con schema.sql.\n');
else { console.log(`${errores} tablas con el orden o las columnas mal.\n`); process.exit(1); }
