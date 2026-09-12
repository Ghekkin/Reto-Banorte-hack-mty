#!/usr/bin/env node
// Integridad de los CSV generados. Es el "hecho" de la skill probar aplicado a los datos:
// si esto pasa en verde, los CSV se pueden cargar a Postgres sin que reviente un CHECK ni
// una FK, y los numeros que la demo pone en pantalla no se contradicen entre si.
//
//   node scripts/validar-datos.mjs
//
// Sale con codigo 1 si hay algun error, para que sirva en CI o en un hook.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = join(RAIZ, 'db', 'datos');

const errores = [];
const avisos = [];
const fallo = (msg) => errores.push(msg);
const aviso = (msg) => avisos.push(msg);

// --- Lectura de CSV -----------------------------------------------------------
// Parser minimo pero correcto para el formato que escribe generar-datos.mjs: comillas
// dobles con "" como escape, sin saltos de linea dentro de un campo.
function leerCsv(nombre) {
  const texto = readFileSync(join(DATOS, `${nombre}.csv`), 'utf8').trim();
  const lineas = texto.split('\n');
  const columnas = lineas[0].split(',');
  return lineas.slice(1).filter((l) => l.length > 0).map((linea) => {
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
    return Object.fromEntries(columnas.map((c, k) => [c, campos[k] === '' ? null : campos[k]]));
  });
}

const t = {};
for (const nombre of ['usuarios', 'cuentas', 'tarjetas', 'categorias', 'comercios', 'movimientos',
  'suscripciones', 'productos_credito', 'creditos', 'amortizaciones', 'planes_reestructura', 'buro',
  'instrumentos', 'perfiles_inversion', 'modelos_portafolio', 'portafolios', 'posiciones',
  'precios_historicos', 'metas', 'topes_gasto', 'diagnostico_habitos', 'acciones_aplicadas']) {
  t[nombre] = leerCsv(nombre);
}

const num = (v) => (v === null ? null : Number(v));
const idsDe = (tabla, col = 'id') => new Set(t[tabla].map((f) => f[col]));

// ===========================================================================
// 1. Integridad referencial
// ===========================================================================
const REFERENCIAS = [
  ['cuentas', 'usuario_id', 'usuarios'],
  ['tarjetas', 'usuario_id', 'usuarios'], ['tarjetas', 'cuenta_id', 'cuentas'],
  ['comercios', 'categoria_id', 'categorias'],
  ['movimientos', 'usuario_id', 'usuarios'], ['movimientos', 'cuenta_id', 'cuentas'],
  ['movimientos', 'categoria_id', 'categorias'], ['movimientos', 'comercio_id', 'comercios'],
  ['suscripciones', 'usuario_id', 'usuarios'], ['suscripciones', 'cuenta_id', 'cuentas'],
  ['suscripciones', 'comercio_id', 'comercios'],
  ['creditos', 'usuario_id', 'usuarios'], ['creditos', 'producto_id', 'productos_credito'],
  ['creditos', 'tarjeta_id', 'tarjetas'],
  ['amortizaciones', 'credito_id', 'creditos'],
  ['planes_reestructura', 'usuario_id', 'usuarios'], ['planes_reestructura', 'tarjeta_id', 'tarjetas'],
  ['buro', 'usuario_id', 'usuarios'],
  ['perfiles_inversion', 'usuario_id', 'usuarios'],
  ['modelos_portafolio', 'instrumento_id', 'instrumentos'],
  ['portafolios', 'usuario_id', 'usuarios'], ['portafolios', 'cuenta_id', 'cuentas'],
  ['posiciones', 'portafolio_id', 'portafolios'], ['posiciones', 'instrumento_id', 'instrumentos'],
  ['precios_historicos', 'instrumento_id', 'instrumentos'],
  ['metas', 'usuario_id', 'usuarios'], ['metas', 'cuenta_origen_id', 'cuentas'],
  ['topes_gasto', 'usuario_id', 'usuarios'], ['topes_gasto', 'categoria_id', 'categorias'],
  ['diagnostico_habitos', 'usuario_id', 'usuarios'],
];

for (const [tabla, columna, destino] of REFERENCIAS) {
  const validos = idsDe(destino);
  for (const fila of t[tabla]) {
    const v = fila[columna];
    if (v !== null && !validos.has(v)) fallo(`${tabla}.${columna} = "${v}" no existe en ${destino}`);
  }
}

// --- Ids unicos ---------------------------------------------------------------
for (const tabla of ['usuarios', 'cuentas', 'tarjetas', 'categorias', 'comercios', 'movimientos',
  'suscripciones', 'productos_credito', 'creditos', 'planes_reestructura', 'instrumentos',
  'portafolios', 'posiciones', 'metas', 'topes_gasto']) {
  const vistos = new Set();
  for (const fila of t[tabla]) {
    if (vistos.has(fila.id)) fallo(`${tabla}: id duplicado "${fila.id}"`);
    vistos.add(fila.id);
  }
}

// ===========================================================================
// 2. Montos enteros en centavos
// ===========================================================================
// Un monto con decimales significa que en algun lado se escapo una division sin
// redondear, y ese es el bug que produce totales que no cuadran por un centavo.
for (const [tabla, filas] of Object.entries(t)) {
  for (const fila of filas) {
    for (const [col, val] of Object.entries(fila)) {
      if (!col.endsWith('_centavos') || val === null) continue;
      if (!Number.isInteger(Number(val))) fallo(`${tabla}.${col} = ${val} no es entero`);
    }
  }
}

// ===========================================================================
// 3. Movimientos: signo, categoria y coherencia del saldo
// ===========================================================================
for (const m of t.movimientos) {
  if (num(m.monto_centavos) <= 0) fallo(`movimientos ${m.id}: monto ${m.monto_centavos} no es positivo`);
  if (!['cargo', 'abono'].includes(m.tipo)) fallo(`movimientos ${m.id}: tipo "${m.tipo}" invalido`);
}

// El saldo posterior de cada movimiento debe ser el del anterior mas el efecto de este, y
// el ultimo de cada cuenta debe coincidir con el saldo que declara cuentas.csv. Si esto
// falla, la tabla de movimientos y el encabezado de la cuenta se contradicen en pantalla.
for (const cuenta of t.cuentas) {
  const propios = t.movimientos.filter((m) => m.cuenta_id === cuenta.id);
  if (propios.length === 0) {
    aviso(`cuentas ${cuenta.id}: sin movimientos`);
    continue;
  }
  let anterior = null;
  for (const m of propios) {
    const delta = m.tipo === 'abono' ? num(m.monto_centavos) : -num(m.monto_centavos);
    if (anterior !== null && num(m.saldo_posterior_centavos) !== anterior + delta) {
      fallo(`movimientos ${m.id}: saldo_posterior no encadena (esperado ${anterior + delta}, dice ${m.saldo_posterior_centavos})`);
      break;
    }
    anterior = num(m.saldo_posterior_centavos);
  }
  if (anterior !== num(cuenta.saldo_centavos)) {
    fallo(`cuentas ${cuenta.id}: saldo declarado ${cuenta.saldo_centavos} != ultimo saldo_posterior ${anterior}`);
  }
}

// Cada movimiento con comercio debe usar una categoria compatible con la del comercio.
// Se admite `cat_retiros` porque el cajero es un comercio de giro banca.
const catDeComercio = new Map(t.comercios.map((c) => [c.id, c.categoria_id]));
for (const m of t.movimientos) {
  if (!m.comercio_id) continue;
  const esperada = catDeComercio.get(m.comercio_id);
  if (esperada !== m.categoria_id && !['cat_suscripciones', 'cat_retiros', 'cat_financiero'].includes(m.categoria_id)) {
    aviso(`movimientos ${m.id}: categoria ${m.categoria_id} no es la del comercio (${esperada})`);
  }
}

// El canal de pago tiene que ser coherente con el giro del comercio. Un juez que ve
// "Mercado Libre, efectivo" deja de creer en toda la tabla.
const giroDeComercio = new Map(t.comercios.map((c) => [c.id, c.giro]));
const GIROS_SIN_EFECTIVO = ['comercio_electronico', 'streaming', 'software', 'nube', 'movilidad', 'entrega_a_domicilio'];
for (const m of t.movimientos) {
  if (!m.comercio_id || m.canal !== 'efectivo') continue;
  const giro = giroDeComercio.get(m.comercio_id);
  if (GIROS_SIN_EFECTIVO.includes(giro)) {
    fallo(`movimientos ${m.id}: "${m.descripcion}" (giro ${giro}) no se puede pagar en efectivo`);
  }
}

// ===========================================================================
// 4. Amortizaciones: la tabla tiene que cerrar en cero
// ===========================================================================
const porCredito = new Map();
for (const a of t.amortizaciones) {
  if (!porCredito.has(a.credito_id)) porCredito.set(a.credito_id, []);
  porCredito.get(a.credito_id).push(a);
}

for (const [creditoId, filas] of porCredito) {
  filas.sort((x, y) => num(x.numero_pago) - num(y.numero_pago));
  const credito = t.creditos.find((c) => c.id === creditoId);

  for (const f of filas) {
    const si = num(f.saldo_inicial_centavos), sf = num(f.saldo_final_centavos);
    const cap = num(f.capital_centavos), int = num(f.interes_centavos), iva = num(f.iva_interes_centavos);
    const cuota = num(f.mensualidad_centavos);
    if (sf !== si - cap) fallo(`amortizaciones ${creditoId}#${f.numero_pago}: saldo_final != saldo_inicial - capital`);
    if (cuota !== cap + int + iva) fallo(`amortizaciones ${creditoId}#${f.numero_pago}: mensualidad != capital + interes + IVA`);
  }

  if (num(filas[0].saldo_inicial_centavos) !== num(credito.monto_original_centavos)) {
    fallo(`amortizaciones ${creditoId}: el primer saldo_inicial no es el monto original`);
  }
  if (num(filas.at(-1).saldo_final_centavos) !== 0) {
    fallo(`amortizaciones ${creditoId}: la tabla cierra en ${filas.at(-1).saldo_final_centavos}, no en 0`);
  }
  // El saldo insoluto del credito debe ser el que la tabla deja tras los pagos hechos.
  const pagados = num(credito.pagos_realizados);
  if (pagados > 0 && pagados <= filas.length) {
    const esperado = num(filas[pagados - 1].saldo_final_centavos);
    if (num(credito.saldo_insoluto_centavos) !== esperado) {
      fallo(`creditos ${creditoId}: saldo_insoluto ${credito.saldo_insoluto_centavos} != saldo tras ${pagados} pagos (${esperado})`);
    }
  }
  const cuantosPagados = filas.filter((f) => f.estatus === 'pagado').length;
  if (cuantosPagados !== pagados) {
    fallo(`amortizaciones ${creditoId}: ${cuantosPagados} filas pagadas pero el credito dice ${pagados}`);
  }
}

// Un credito de pagos fijos sin tabla de amortizacion es un error, salvo el revolvente.
for (const c of t.creditos) {
  const esRevolvente = c.tarjeta_id !== null;
  if (!esRevolvente && !porCredito.has(c.id)) fallo(`creditos ${c.id}: sin tabla de amortizacion`);
  if (num(c.saldo_insoluto_centavos) > num(c.monto_original_centavos)) {
    fallo(`creditos ${c.id}: saldo insoluto mayor al monto original`);
  }
}

// ===========================================================================
// 5. Tarjetas
// ===========================================================================
const IVA = 0.16;
for (const tar of t.tarjetas) {
  if (tar.tipo !== 'credito') continue;
  const saldo = num(tar.saldo_centavos), limite = num(tar.limite_centavos);
  if (saldo > limite) fallo(`tarjetas ${tar.id}: saldo mayor al limite`);

  // El pago minimo debe seguir la misma formula que usa el escenario de pago minimo:
  // intereses del periodo con IVA mas 1.5 % del capital. Si se desincronizan, la UI
  // muestra un minimo y el simulador compara contra otro.
  const interes = Math.round(saldo * (num(tar.tasa_anual) / 12));
  const esperado = Math.max(interes + Math.round(interes * IVA) + Math.round(saldo * 0.015), 20000);
  if (Math.abs(num(tar.pago_minimo_centavos) - esperado) > 100) {
    fallo(`tarjetas ${tar.id}: pago_minimo ${tar.pago_minimo_centavos} != formula (${esperado})`);
  }
}

// ===========================================================================
// 6. Inversiones
// ===========================================================================
// Los pesos objetivo de cada perfil deben sumar exactamente 1: si no, el rebalanceo
// propone mover a un objetivo imposible.
const porPerfil = new Map();
for (const m of t.modelos_portafolio) {
  porPerfil.set(m.perfil, (porPerfil.get(m.perfil) ?? 0) + num(m.peso_objetivo_pct));
}
for (const [perfil, suma] of porPerfil) {
  if (Math.abs(suma - 1) > 0.0001) fallo(`modelos_portafolio: los pesos de "${perfil}" suman ${suma.toFixed(4)}, no 1`);
}

const precioActual = new Map();
for (const p of t.precios_historicos) {
  const previo = precioActual.get(p.instrumento_id);
  if (!previo || p.fecha > previo.fecha) precioActual.set(p.instrumento_id, p);
}
for (const inst of t.instrumentos) {
  const ultimo = precioActual.get(inst.id);
  if (!ultimo) { fallo(`instrumentos ${inst.id}: sin serie de precios`); continue; }
  if (num(inst.precio_actual_centavos) !== num(ultimo.precio_cierre_centavos)) {
    fallo(`instrumentos ${inst.id}: precio_actual != ultimo cierre de precios_historicos`);
  }
}

for (const port of t.portafolios) {
  const suyas = t.posiciones.filter((p) => p.portafolio_id === port.id);
  if (suyas.length === 0) { fallo(`portafolios ${port.id}: sin posiciones`); continue; }

  const sumaPesos = suyas.reduce((s, p) => s + num(p.peso_pct), 0);
  if (Math.abs(sumaPesos - 1) > 0.0002) fallo(`portafolios ${port.id}: los peso_pct suman ${sumaPesos.toFixed(4)}, no 1`);

  const valor = suyas.reduce((s, p) => s + num(p.valor_mercado_centavos), 0);
  const costo = suyas.reduce((s, p) => s + num(p.costo_centavos), 0);
  if (num(port.valor_actual_centavos) !== valor) fallo(`portafolios ${port.id}: valor_actual != suma de posiciones`);
  if (num(port.aportado_centavos) !== costo) fallo(`portafolios ${port.id}: aportado != suma de costos`);
  if (num(port.valor_actual_centavos) !== num(port.aportado_centavos) + num(port.rendimiento_acumulado_centavos)) {
    fallo(`portafolios ${port.id}: valor_actual != aportado + rendimiento`);
  }

  for (const p of suyas) {
    if (num(p.plusvalia_centavos) !== num(p.valor_mercado_centavos) - num(p.costo_centavos)) {
      fallo(`posiciones ${p.id}: plusvalia != valor de mercado - costo`);
    }
    if (num(p.precio_actual_centavos) !== num(precioActual.get(p.instrumento_id).precio_cierre_centavos)) {
      fallo(`posiciones ${p.id}: precio_actual no es el ultimo cierre del instrumento`);
    }
  }
}

// ===========================================================================
// 7. Educacion financiera
// ===========================================================================
for (const d of t.diagnostico_habitos) {
  const esencial = num(d.gasto_esencial_pct), discrecional = num(d.gasto_discrecional_pct);
  if (Math.abs(esencial + discrecional - 1) > 0.0002) {
    fallo(`diagnostico_habitos ${d.usuario_id}/${d.periodo}: esencial + discrecional = ${(esencial + discrecional).toFixed(4)}, no 1`);
  }
  if (num(d.ahorro_centavos) !== num(d.ingreso_centavos) - num(d.gasto_centavos)) {
    fallo(`diagnostico_habitos ${d.usuario_id}/${d.periodo}: ahorro != ingreso - gasto`);
  }
  const p = num(d.puntaje_salud);
  if (p < 0 || p > 100) fallo(`diagnostico_habitos ${d.usuario_id}/${d.periodo}: puntaje ${p} fuera de 0-100`);
}

for (const m of t.metas) {
  if (num(m.monto_actual_centavos) > num(m.monto_objetivo_centavos) && m.estatus !== 'cumplida') {
    aviso(`metas ${m.id}: ya rebaso el objetivo pero no esta "cumplida"`);
  }
}

// db/reiniciar.sql borra lo que no lleve el prefijo `_base_`. Si un dato sembrado no lo
// tiene, el primer reinicio se lo lleva y la demo pierde estado sin que nadie lo note.
for (const m of t.metas) if (!m.id.startsWith('meta_base_')) fallo(`metas ${m.id}: sin prefijo meta_base_, reiniciar.sql lo borraria`);
for (const tp of t.topes_gasto) if (!tp.id.startsWith('tope_base_')) fallo(`topes_gasto ${tp.id}: sin prefijo tope_base_, reiniciar.sql lo borraria`);

// La tabla de estado mutable tiene que arrancar vacia.
if (t.acciones_aplicadas.length !== 0) fallo(`acciones_aplicadas: deberia arrancar vacia, tiene ${t.acciones_aplicadas.length} filas`);

// ===========================================================================
// 8. Datos bancarios visiblemente falsos
// ===========================================================================
for (const c of t.cuentas) {
  if (!/^000\d{15}$/.test(c.clabe)) fallo(`cuentas ${c.id}: CLABE "${c.clabe}" no es del rango falso 000...`);
}
for (const tar of t.tarjetas) {
  if (!tar.mascara.includes('••••')) fallo(`tarjetas ${tar.id}: la mascara no oculta el numero`);
}

// ===========================================================================
// 9. Flujo de caja por perfil
// ===========================================================================
// No es integridad, es credibilidad: si un perfil gasta mucho mas de lo que ingresa, el
// saldo inicial que el generador deduce sale absurdo (medio millon en la cuenta de alguien
// que vive al dia) y un juez que revise el historial lo va a ver.
console.log('\nFlujo de caja por perfil (promedio mensual):\n');
const pesos = (c) => '$' + (c / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 });

for (const u of t.usuarios) {
  const suyos = t.movimientos.filter((m) => m.usuario_id === u.id);
  const propias = t.cuentas.filter((c) => c.usuario_id === u.id).map((c) => c.id);

  // Solo la cuenta principal: los traspasos a ahorro o a la tarjeta son internos.
  const principal = t.cuentas.find((c) => c.usuario_id === u.id && c.es_principal === 'true');
  const enPrincipal = suyos.filter((m) => m.cuenta_id === principal.id);
  const entra = enPrincipal.filter((m) => m.tipo === 'abono').reduce((s, m) => s + num(m.monto_centavos), 0) / 12;
  const sale = enPrincipal.filter((m) => m.tipo === 'cargo').reduce((s, m) => s + num(m.monto_centavos), 0) / 12;

  const primero = enPrincipal[0], ultimo = enPrincipal.at(-1);
  const inicial = num(primero.saldo_posterior_centavos) - (primero.tipo === 'abono' ? num(primero.monto_centavos) : -num(primero.monto_centavos));

  console.log(`  ${u.nombre}`);
  console.log(`    cuenta principal: entra ${pesos(entra)}/mes, sale ${pesos(sale)}/mes, neto ${pesos(entra - sale)}/mes`);
  console.log(`    saldo inicial deducido ${pesos(inicial)} -> saldo final ${pesos(num(ultimo.saldo_posterior_centavos))}`);
  console.log(`    movimientos: ${suyos.length} en ${propias.length} cuentas`);

  // Un saldo inicial negativo en una cuenta de deposito es imposible, y uno
  // desproporcionado respecto al ingreso delata que el gasto esta mal calibrado.
  if (inicial < 0) fallo(`${u.id}: el saldo inicial deducido de ${principal.id} es negativo (${pesos(inicial)}); gasta mas de lo que ingresa`);
  else if (inicial > num(u.ingreso_mensual_centavos) * 3) {
    aviso(`${u.id}: saldo inicial deducido de ${pesos(inicial)}, mas de 3 meses de su ingreso; el gasto puede estar subestimado`);
  }
}

// ===========================================================================
// Resultado
// ===========================================================================
console.log('');
for (const a of avisos) console.log(`  aviso  ${a}`);
if (avisos.length) console.log('');

if (errores.length === 0) {
  const total = Object.values(t).reduce((s, f) => s + f.length, 0);
  console.log(`OK  22 archivos, ${total} filas, sin errores de integridad.\n`);
} else {
  for (const e of errores) console.log(`  ERROR  ${e}`);
  console.log(`\n${errores.length} errores.\n`);
  process.exit(1);
}
