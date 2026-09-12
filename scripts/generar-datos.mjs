#!/usr/bin/env node
// Generador determinista de los datos mock. Semilla fija: mismo comando, mismos bytes.
//
//   node scripts/generar-datos.mjs
//
// Escribe los 22 CSV en db/datos/. Los CSV se commitean: la demo NO depende de correr
// esto (ADR 0005). Node puro, sin dependencias, sin build.
//
// La logica de patrones, estacionalidad y anomalias esta explicada en
// docs/algoritmos/generacion-de-datos.md; la de credito en docs/algoritmos/amortizacion.md.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { categorias, comercios, productosCredito, instrumentos, modelosPortafolio, perfilesInversion } from './lib/catalogos.mjs';
import { HOY, usuarios, cuentas, tarjetas, patrones, suscripciones, atipicos, estacionalidad, aguinaldos } from './lib/perfiles.mjs';
import { mensualidad, tablaAmortizacion, calcularCAT, escenarioPagoMinimo, ofertaReestructura } from './lib/finanzas.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'db', 'datos');

const SEMILLA = 20260911;   // hora de arranque del reto. Fija a proposito.

// ===========================================================================
// Aleatoriedad determinista
// ===========================================================================
// mulberry32: PRNG de 32 bits, ~10 lineas, sin dependencias y reproducible entre
// versiones de Node (Math.random no lo es ni se puede sembrar).
function crearRng(semilla) {
  let a = semilla >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash estable de una cadena (FNV-1a de 32 bits) para derivar una semilla por flujo.
function hash(texto) {
  let h = 0x811C9DC5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// UN FLUJO POR PERFIL, no uno global.
//
// Con una sola secuencia compartida, agregar un movimiento a Beto corre todos los sorteos
// posteriores y los datos de Carmen cambian sin que nadie la haya tocado. Eso hace que
// calibrar el gasto de un perfil descalibre a los otros, y que un diff de este script sea
// ilegible. Sembrando cada flujo con el hash de su clave, cada perfil es reproducible e
// independiente: se puede ajustar a Beto sin mover una sola cifra de Ana ni de Carmen.
let rngActual = crearRng(SEMILLA);
const usarFlujo = (clave) => { rngActual = crearRng(SEMILLA ^ hash(clave)); };

const rng = () => rngActual();
const entre = (min, max) => min + rng() * (max - min);
const enteroEntre = (min, max) => Math.floor(entre(min, max + 1));
const deLista = (lista) => lista[Math.floor(rng() * lista.length)];
/** Redondea a la moneda que se ve en un ticket real: multiplos de 50 centavos. */
const aCentavosPlausibles = (v) => Math.max(50, Math.round(v / 50) * 50);

// ===========================================================================
// Fechas
// ===========================================================================
const pad = (n) => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;
const diasDelMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Suma meses conservando el dia, recortando si el mes destino es mas corto. */
function sumarMeses(fechaIso, meses) {
  const [a, m, d] = fechaIso.split('-').map(Number);
  const total = (a * 12 + (m - 1)) + meses;
  const na = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return iso(na, nm, Math.min(d, diasDelMes(na, nm)));
}

/** Los 12 periodos 'YYYY-MM' del historial, del mas viejo al mas nuevo. */
function periodos() {
  const salida = [];
  const [ha, hm] = HOY.split('-').map(Number);
  for (let k = 11; k >= 0; k--) {
    const total = (ha * 12 + (hm - 1)) - k;
    salida.push(`${Math.floor(total / 12)}-${pad((total % 12) + 1)}`);
  }
  return salida;
}

const PERIODOS = periodos();
const DIA_HOY = Number(HOY.split('-')[2]);

// ===========================================================================
// CSV
// ===========================================================================
// Escapado minimo pero correcto: comillas dobles solo cuando el valor las necesita,
// null como campo vacio (que es como \copy lee NULL por omision).
function campo(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escribirCsv(nombre, columnas, filas) {
  const lineas = [columnas.join(',')];
  for (const fila of filas) lineas.push(columnas.map((c) => campo(fila[c])).join(','));
  writeFileSync(join(SALIDA, `${nombre}.csv`), lineas.join('\n') + '\n', 'utf8');
  console.log(`  ${nombre}.csv`.padEnd(30) + String(filas.length).padStart(6) + ' filas');
}

// ===========================================================================
// MOVIMIENTOS
// ===========================================================================

const movimientos = [];
let ordinal = 0;

function agregarMovimiento(m) {
  movimientos.push({
    orden: ordinal++,
    moneda: 'MXN',
    comercio_id: null,
    es_recurrente: false,
    es_atipico: false,
    fecha_valor: m.fecha,
    ...m,
  });
}

const referencia = (prefijo, n) => `${prefijo}${String(n).padStart(9, '0')}`;

// El canal se deduce del giro del comercio, no se sortea a ciegas: nadie paga Mercado
// Libre ni un Uber en efectivo, y un retiro de cajero no es un pago con tarjeta. Un solo
// movimiento incoherente le cuesta credibilidad a toda la tabla.
const GIROS_SIN_EFECTIVO = ['comercio_electronico', 'streaming', 'software', 'nube', 'movilidad', 'entrega_a_domicilio'];

function canalDe(comercio) {
  // Se sortea SIEMPRE, incluso cuando el giro ya determina el canal. Si el numero de
  // sorteos dependiera del comercio que salio, agregar un comercio correria la secuencia
  // de todos los movimientos siguientes y descalibraria el perfil entero.
  const r = rng();
  if (comercio.giro === 'banca') return 'cajero';
  if (GIROS_SIN_EFECTIVO.includes(comercio.giro)) return 'tarjeta';
  if (comercio.giro === 'transporte_publico') return r < 0.5 ? 'tarjeta' : 'efectivo';
  return r < 0.8 ? 'tarjeta' : 'efectivo';
}

for (const usuario of usuarios) {
  usarFlujo(usuario.id);
  const patron = patrones[usuario.id];
  const cuentaGasto = patron.cuenta_gasto;

  for (const periodo of PERIODOS) {
    const [anio, mes] = periodo.split('-').map(Number);
    const ultimoDia = diasDelMes(anio, mes);
    const esMesEnCurso = periodo === PERIODOS[PERIODOS.length - 1];
    const diaTope = esMesEnCurso ? DIA_HOY : ultimoDia;
    const factor = estacionalidad[periodo] ?? 1;

    // --- Ingresos ---------------------------------------------------------
    if (patron.nomina) {
      for (const dia of patron.nomina.dias) {
        const d = dia === 0 ? ultimoDia : dia;
        if (d > diaTope) continue;
        agregarMovimiento({
          cuenta_id: cuentaGasto, usuario_id: usuario.id, fecha: iso(anio, mes, d),
          tipo: 'abono', monto_centavos: patron.nomina.monto_centavos,
          categoria_id: patron.nomina.categoria_id, descripcion: patron.nomina.descripcion,
          canal: 'spei', referencia: referencia('NOM', ordinal), es_recurrente: true,
        });
      }
    }

    if (patron.honorarios) {
      // Ingreso variable: pocos depositos grandes y de monto muy dispar. Es lo que hace
      // que el diagnostico de Carmen no se pueda calcular como "ingreso fijo menos gasto".
      const pagos = enteroEntre(patron.honorarios.pagos[0], patron.honorarios.pagos[1]);
      for (let k = 0; k < pagos; k++) {
        const d = enteroEntre(3, Math.min(26, diaTope));
        if (d > diaTope) continue;
        agregarMovimiento({
          cuenta_id: cuentaGasto, usuario_id: usuario.id, fecha: iso(anio, mes, d),
          tipo: 'abono',
          monto_centavos: aCentavosPlausibles(entre(patron.honorarios.monto[0], patron.honorarios.monto[1])),
          categoria_id: patron.honorarios.categoria_id,
          descripcion: `${patron.honorarios.descripcion} ${periodo}`,
          canal: 'spei', referencia: referencia('HON', ordinal),
        });
      }
    }

    // --- Cargos recurrentes de dia fijo -----------------------------------
    for (const rec of patron.recurrentes) {
      if (rec.dia > diaTope) continue;
      const variacion = rec.variacion ? 1 + entre(-rec.variacion, rec.variacion) : 1;
      const monto = aCentavosPlausibles(rec.monto_centavos * variacion);
      const fecha = iso(anio, mes, rec.dia);
      agregarMovimiento({
        cuenta_id: rec.cuenta ?? cuentaGasto, usuario_id: usuario.id, fecha,
        tipo: 'cargo', monto_centavos: monto,
        categoria_id: rec.categoria_id, comercio_id: rec.comercio_id ?? null,
        descripcion: rec.descripcion, canal: rec.canal,
        referencia: referencia('REC', ordinal), es_recurrente: true,
      });
      // Un traspaso a otra cuenta propia (pago de tarjeta, aportacion al portafolio) sale
      // de la cuenta corriente y entra a la otra. Sin el segundo asiento el saldo de la
      // cuenta destino no cuadra con nada.
      if (rec.cuenta_espejo) {
        agregarMovimiento({
          cuenta_id: rec.cuenta_espejo, usuario_id: usuario.id, fecha,
          tipo: 'abono', monto_centavos: monto,
          categoria_id: 'cat_transferencias', descripcion: 'Traspaso recibido',
          canal: 'app', referencia: referencia('ESP', ordinal), es_recurrente: true,
        });
      }
    }

    // --- Suscripciones ----------------------------------------------------
    for (const sus of suscripciones.filter((s) => s.usuario_id === usuario.id)) {
      if (sus.dia_cargo > diaTope) continue;
      const fecha = iso(anio, mes, sus.dia_cargo);
      if (fecha < sus.fecha_inicio) continue;
      if (sus.fecha_cancelacion && fecha >= sus.fecha_cancelacion) continue;
      agregarMovimiento({
        cuenta_id: sus.cuenta_id, usuario_id: usuario.id, fecha,
        tipo: 'cargo', monto_centavos: sus.monto_centavos,
        categoria_id: 'cat_suscripciones', comercio_id: sus.comercio_id,
        descripcion: sus.concepto, canal: 'domiciliacion',
        referencia: referencia('SUS', ordinal), es_recurrente: true,
      });
    }

    // --- Gasto discrecional ------------------------------------------------
    for (const grupo of patron.discrecional) {
      const compras = Math.max(0, Math.round(enteroEntre(grupo.compras[0], grupo.compras[1]) * factor));
      for (let k = 0; k < compras; k++) {
        const d = enteroEntre(1, diaTope);
        const comercioId = deLista(grupo.comercios);
        const comercio = comercios.find((c) => c.id === comercioId);
        agregarMovimiento({
          cuenta_id: grupo.cuenta ?? patron.cuenta_discrecional ?? cuentaGasto, usuario_id: usuario.id, fecha: iso(anio, mes, d),
          tipo: 'cargo',
          monto_centavos: aCentavosPlausibles(entre(grupo.monto[0], grupo.monto[1]) * (0.85 + 0.3 * rng()) * patron.factor_discrecional),
          categoria_id: grupo.categoria_id, comercio_id: comercioId,
          descripcion: comercio.nombre,
          canal: canalDe(comercio),
          referencia: referencia('COM', ordinal),
        });
      }
    }

    // --- Traspaso a ahorro -------------------------------------------------
    if (patron.ahorro && patron.ahorro.dia <= diaTope && rng() < patron.ahorro.probabilidad) {
      const fecha = iso(anio, mes, patron.ahorro.dia);
      const monto = aCentavosPlausibles(patron.ahorro.monto_centavos * (0.8 + 0.4 * rng()));
      agregarMovimiento({
        cuenta_id: cuentaGasto, usuario_id: usuario.id, fecha, tipo: 'cargo',
        monto_centavos: monto, categoria_id: 'cat_transferencias',
        descripcion: 'Traspaso a cuenta de ahorro', canal: 'app',
        referencia: referencia('TRA', ordinal), es_recurrente: true,
      });
      agregarMovimiento({
        cuenta_id: patron.ahorro.cuenta_destino, usuario_id: usuario.id, fecha, tipo: 'abono',
        monto_centavos: monto, categoria_id: 'cat_transferencias',
        descripcion: 'Traspaso desde cuenta principal', canal: 'app',
        referencia: referencia('TRA', ordinal), es_recurrente: true,
      });
    }
  }
}

// Aguinaldo y gastos atipicos: fechas fijas porque el guion de la demo las menciona.
for (const ag of aguinaldos) {
  agregarMovimiento({
    cuenta_id: ag.cuenta_id, usuario_id: ag.usuario_id, fecha: ag.fecha, tipo: 'abono',
    monto_centavos: ag.monto_centavos, categoria_id: 'cat_nomina',
    descripcion: ag.descripcion, canal: 'spei', referencia: referencia('AGU', ordinal),
  });
}

for (const at of atipicos) {
  agregarMovimiento({
    id: at.id, cuenta_id: at.cuenta_id, usuario_id: at.usuario_id, fecha: at.fecha,
    tipo: 'cargo', monto_centavos: at.monto_centavos, categoria_id: at.categoria_id,
    comercio_id: at.comercio_id, descripcion: at.descripcion, canal: at.canal,
    referencia: referencia('ATP', ordinal), es_atipico: true,
  });
}

// Rendimientos de la cuenta de inversion de Ana, para que su saldo no salga de la nada.
for (const periodo of PERIODOS.slice(6)) {
  const [anio, mes] = periodo.split('-').map(Number);
  if (periodo === PERIODOS[PERIODOS.length - 1] && 28 > DIA_HOY) continue;
  agregarMovimiento({
    cuenta_id: 'cta_ana_inversion', usuario_id: 'usr_ana', fecha: iso(anio, mes, 28),
    tipo: 'abono', monto_centavos: aCentavosPlausibles(entre(14000, 23000)),
    categoria_id: 'cat_rendimientos', descripcion: 'Rendimiento del periodo',
    canal: 'app', referencia: referencia('REN', ordinal), es_recurrente: true,
  });
}

// --- Orden cronologico e ids -------------------------------------------------
movimientos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.orden - b.orden));
let secuencia = 0;
for (const m of movimientos) {
  if (!m.id) m.id = `mov_${String(++secuencia).padStart(6, '0')}`;
}

// --- saldo_posterior_centavos ------------------------------------------------
// Los saldos de perfiles.mjs son los de HOY, asi que el saldo inicial de cada cuenta se
// deduce restando el efecto neto de sus movimientos. Asi la serie termina exactamente en
// el saldo que muestra la UI, en vez de acumular deriva.
const delta = (m) => (m.tipo === 'abono' ? m.monto_centavos : -m.monto_centavos);

for (const cuenta of cuentas) {
  const propios = movimientos.filter((m) => m.cuenta_id === cuenta.id);
  const neto = propios.reduce((suma, m) => suma + delta(m), 0);
  let saldo = cuenta.saldo_centavos - neto;
  for (const m of propios) {
    saldo += delta(m);
    m.saldo_posterior_centavos = saldo;
  }
}

// ===========================================================================
// CREDITO
// ===========================================================================
// Definicion minima; el generador deriva mensualidad, CAT, saldo insoluto y la tabla de
// amortizacion, para que ningun numero de la demo este escrito a mano dos veces.
const creditosBase = [
  { id: 'cred_ana_personal',       usuario_id: 'usr_ana',    producto_id: 'prod_personal',     alias: 'Crédito Personal',        monto: 8000000,   tasa: 0.2790, plazo: 24,  pagados: 9,  contratacion: '2025-12-05', estatus: 'al_corriente', mora: 0 },
  { id: 'cred_beto_nomina',        usuario_id: 'usr_beto',   producto_id: 'prod_nomina',       alias: 'Crédito de Nómina',       monto: 6000000,   tasa: 0.2490, plazo: 36,  pagados: 22, contratacion: '2024-11-20', estatus: 'vigente',      mora: 0 },
  { id: 'cred_carmen_hipotecario', usuario_id: 'usr_carmen', producto_id: 'prod_hipotecario',  alias: 'Hipoteca residencia',     monto: 165000000, tasa: 0.1090, plazo: 240, pagados: 98, contratacion: '2018-04-10', estatus: 'vigente',      mora: 0 },
  { id: 'cred_carmen_auto',        usuario_id: 'usr_carmen', producto_id: 'prod_auto_nuevo',   alias: 'Auto 2024',               monto: 45000000,  tasa: 0.1290, plazo: 48,  pagados: 31, contratacion: '2024-02-15', estatus: 'vigente',      mora: 0 },
];

const creditos = [];
const amortizaciones = [];

for (const base of creditosBase) {
  const producto = productosCredito.find((p) => p.id === base.producto_id);
  const cuota = mensualidad(base.monto, base.tasa, base.plazo);
  const cat = calcularCAT(base.monto, cuota, base.plazo, producto.comision_apertura);
  const tabla = tablaAmortizacion(base.monto, base.tasa, base.plazo);

  for (const fila of tabla) {
    const pagado = fila.numero_pago <= base.pagados;
    const fecha = sumarMeses(base.contratacion, fila.numero_pago);
    amortizaciones.push({
      credito_id: base.id, ...fila, fecha,
      estatus: pagado ? 'pagado' : (fecha < HOY ? 'vencido' : 'pendiente'),
      fecha_pago: pagado ? fecha : null,
    });
  }

  creditos.push({
    id: base.id, usuario_id: base.usuario_id, producto_id: base.producto_id, tarjeta_id: null,
    alias: base.alias,
    monto_original_centavos: base.monto,
    saldo_insoluto_centavos: tabla[base.pagados - 1].saldo_final_centavos,
    tasa_anual: base.tasa, cat, plazo_meses: base.plazo, pagos_realizados: base.pagados,
    mensualidad_centavos: cuota,
    fecha_contratacion: base.contratacion,
    fecha_proximo_pago: sumarMeses(base.contratacion, base.pagados + 1),
    dias_mora: base.mora, estatus: base.estatus,
  });
}

// La tarjeta de Beto entra como credito revolvente: no tiene tabla de amortizacion
// (por eso mismo es el problema que la reestructura resuelve).
const tarjetaBeto = tarjetas.find((t) => t.id === 'tar_beto_clasica');
creditos.push({
  id: 'cred_beto_tdc', usuario_id: 'usr_beto', producto_id: 'prod_tdc_clasica',
  tarjeta_id: tarjetaBeto.id, alias: 'Tarjeta Clásica •••• 4821',
  monto_original_centavos: tarjetaBeto.limite_centavos,
  saldo_insoluto_centavos: tarjetaBeto.saldo_centavos,
  tasa_anual: tarjetaBeto.tasa_anual, cat: tarjetaBeto.cat,
  plazo_meses: 1, pagos_realizados: 0,
  mensualidad_centavos: tarjetaBeto.pago_minimo_centavos,
  fecha_contratacion: '2019-07-22', fecha_proximo_pago: '2026-09-30',
  dias_mora: tarjetaBeto.dias_mora, estatus: 'vencido',
});

// --- planes_reestructura ------------------------------------------------------
const productoPlan = productosCredito.find((p) => p.id === 'prod_reestructura');
const planesReestructura = [];

// Beto: cuatro plazos. El de 18 meses es el recomendado porque es el primero cuya
// mensualidad cabe en su capacidad de pago (ver buro).
for (const { tarjeta, plazos, recomendado, tasas } of [
  { tarjeta: tarjetaBeto, plazos: [12, 18, 24, 36], recomendado: 18, tasas: { 12: 0.1890, 18: 0.2190, 24: 0.2490, 36: 0.2790 } },
  { tarjeta: tarjetas.find((t) => t.id === 'tar_carmen_oro'), plazos: [6, 12, 18], recomendado: null, tasas: { 6: 0.1890, 12: 0.1990, 18: 0.2190 } },
]) {
  for (const plazo of plazos) {
    const oferta = ofertaReestructura({
      saldoCentavos: tarjeta.saldo_centavos,
      tasaPlan: tasas[plazo],
      plazoMeses: plazo,
      tasaTarjeta: tarjeta.tasa_anual,
      pctCapitalMinimo: 0.015,
      pisoMinimo: 20000,
    });
    planesReestructura.push({
      id: `plan_${tarjeta.id.replace('tar_', '')}_${plazo}m`,
      usuario_id: tarjeta.usuario_id, tarjeta_id: tarjeta.id, ...oferta,
      es_recomendado: plazo === recomendado,
      vigente_hasta: '2026-10-15',
    });
  }
}

// --- buro --------------------------------------------------------------------
const deudaDe = (usuarioId) => creditos.filter((c) => c.usuario_id === usuarioId)
  .reduce((s, c) => s + c.saldo_insoluto_centavos, 0);
const pagoMensualDe = (usuarioId) => creditos.filter((c) => c.usuario_id === usuarioId)
  .reduce((s, c) => s + c.mensualidad_centavos, 0);

// La regla: se considera sano comprometer hasta el 35 % del ingreso en pagos de deuda.
// Lo que sobra de ese 35 % es la capacidad de pago, y es lo que decide si precalifica.
const TECHO_ENDEUDAMIENTO = 0.35;

const buro = [
  { usuario_id: 'usr_ana',    score: 742, calificacion: 'bueno',     consultas_12m: 2, cuentas_abiertas: 4,  pagos_puntuales_pct: 0.9800, atrasos_12m: 0 },
  { usuario_id: 'usr_beto',   score: 561, calificacion: 'bajo',      consultas_12m: 7, cuentas_abiertas: 6,  pagos_puntuales_pct: 0.7400, atrasos_12m: 4 },
  { usuario_id: 'usr_carmen', score: 806, calificacion: 'excelente', consultas_12m: 1, cuentas_abiertas: 9,  pagos_puntuales_pct: 1.0000, atrasos_12m: 0 },
].map((b) => {
  const usuario = usuarios.find((u) => u.id === b.usuario_id);
  const comprometido = pagoMensualDe(b.usuario_id);
  const capacidad = Math.round(usuario.ingreso_mensual_centavos * TECHO_ENDEUDAMIENTO) - comprometido;
  const deuda = deudaDe(b.usuario_id);
  const precalifica = capacidad > 100000 && b.score >= 620 && b.atrasos_12m === 0;
  return {
    ...b,
    deuda_total_centavos: deuda,
    pago_mensual_comprometido_centavos: comprometido,
    capacidad_pago_mensual_centavos: capacidad,
    nivel_endeudamiento_pct: Number((comprometido / usuario.ingreso_mensual_centavos).toFixed(4)),
    precalificado: precalifica,
    // Tope de oferta: 24 mensualidades de la capacidad libre, redondeado a miles de pesos.
    precalificado_hasta_centavos: precalifica ? Math.round(capacidad * 24 / 100000) * 100000 : 0,
    fecha_consulta: '2026-09-05',
  };
});

// ===========================================================================
// INVERSIONES
// ===========================================================================
// Serie semanal por movimiento browniano geometrico discreto: cada semana el precio se
// mueve por su deriva (rendimiento esperado / 52) mas un choque proporcional a su
// volatilidad. Los instrumentos de riesgo 1 salen casi rectos y los de riesgo 5 con
// dientes visibles, que es lo que hace legible la grafica.
const SEMANAS = 52;
const preciosHistoricos = [];
const precioActual = {};

for (const inst of instrumentos) {
  usarFlujo(`precios:${inst.id}`);
  const derivaSemanal = inst.rendimiento_anual_esperado / SEMANAS;
  const volSemanal = inst.volatilidad_anual / Math.sqrt(SEMANAS);
  let precio = inst.precio_inicial_centavos;

  for (let s = 0; s <= SEMANAS; s++) {
    const fecha = (() => {
      const base = Date.UTC(2025, 8, 15) + s * 7 * 86400000;   // lunes 2025-09-15
      const d = new Date(base);
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    })();

    let variacion = 0;
    if (s > 0) {
      // Box-Muller para un choque normal, no uniforme: sin esto las series se ven planas.
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      variacion = derivaSemanal + volSemanal * z;
      precio = Math.max(1, Math.round(precio * (1 + variacion)));
    }

    preciosHistoricos.push({
      instrumento_id: inst.id, fecha,
      precio_cierre_centavos: precio,
      variacion_pct: Number(variacion.toFixed(6)),
    });
  }
  precioActual[inst.id] = precio;
}

// --- portafolios y posiciones -------------------------------------------------
// Cada portafolio arranca del modelo de su perfil y se le mete una desviacion
// deliberada, porque un portafolio perfectamente alineado no tiene nada que rebalancear
// y el escenario del ejecutivo se queda sin acción.
const portafoliosBase = [
  { id: 'port_ana',    usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_inversion',    nombre: 'Mi primer portafolio', perfil: 'conservador', aportado: 2400000,   apertura: '2026-03-16' },
  { id: 'port_carmen', usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_inversion', nombre: 'Portafolio patrimonial', perfil: 'agresivo',  aportado: 245000000, apertura: '2016-01-15' },
];

const portafolios = [];
const posiciones = [];
let secuenciaPosicion = 0;

for (const base of portafoliosBase) {
  usarFlujo(`portafolio:${base.id}`);
  const modelo = modelosPortafolio.filter((m) => m.perfil === base.perfil);

  // 1. Desviar los pesos de compra respecto al objetivo y renormalizar a 1.
  const desviados = modelo.map((m) => ({ ...m, peso: m.peso_objetivo_pct * (0.70 + 0.6 * rng()) }));
  const sumaDesviados = desviados.reduce((s, m) => s + m.peso, 0);
  for (const m of desviados) m.peso /= sumaDesviados;

  // 2. Convertir peso a titulos usando el precio de compra (el de hace 52 semanas para
  //    Carmen, el de hace ~26 para Ana, que abrio en marzo).
  const semanasAtras = base.id === 'port_ana' ? 26 : SEMANAS;
  const filas = desviados.map((m) => {
    const serie = preciosHistoricos.filter((p) => p.instrumento_id === m.instrumento_id);
    const precioCompra = serie[Math.max(0, serie.length - 1 - semanasAtras)].precio_cierre_centavos;
    const costo = Math.round(base.aportado * m.peso);
    const titulos = Number((costo / precioCompra).toFixed(6));
    const valorMercado = Math.round(titulos * precioActual[m.instrumento_id]);
    return {
      instrumento_id: m.instrumento_id,
      titulos,
      precio_promedio_compra_centavos: precioCompra,
      precio_actual_centavos: precioActual[m.instrumento_id],
      costo_centavos: costo,
      valor_mercado_centavos: valorMercado,
      plusvalia_centavos: valorMercado - costo,
      peso_objetivo_pct: m.peso_objetivo_pct,
    };
  });

  // 3. Pesos reales sobre valor de mercado. El residuo de redondeo se ajusta en la
  //    posicion mas grande, para que los pesos sumen exactamente 1.0000.
  const valorTotal = filas.reduce((s, f) => s + f.valor_mercado_centavos, 0);
  for (const f of filas) f.peso_pct = Number((f.valor_mercado_centavos / valorTotal).toFixed(4));
  const sumaPesos = filas.reduce((s, f) => s + f.peso_pct, 0);
  const mayor = filas.reduce((a, b) => (a.valor_mercado_centavos >= b.valor_mercado_centavos ? a : b));
  mayor.peso_pct = Number((mayor.peso_pct + (1 - sumaPesos)).toFixed(4));

  for (const f of filas) {
    posiciones.push({
      id: `pos_${String(++secuenciaPosicion).padStart(3, '0')}`,
      portafolio_id: base.id, ...f,
      fecha_compra: base.id === 'port_ana' ? '2026-03-16' : '2025-09-15',
    });
  }

  const costoTotal = filas.reduce((s, f) => s + f.costo_centavos, 0);
  // Desviacion del modelo como tracking error: la mitad de la suma de diferencias
  // absolutas, que es el porcentaje del portafolio que habria que mover para alinearlo.
  const desviacion = filas.reduce((s, f) => s + Math.abs(f.peso_pct - f.peso_objetivo_pct), 0) / 2;

  portafolios.push({
    id: base.id, usuario_id: base.usuario_id, cuenta_id: base.cuenta_id,
    nombre: base.nombre, perfil: base.perfil,
    valor_actual_centavos: valorTotal,
    aportado_centavos: costoTotal,
    rendimiento_acumulado_centavos: valorTotal - costoTotal,
    rendimiento_pct: Number(((valorTotal - costoTotal) / costoTotal).toFixed(4)),
    fecha_apertura: base.apertura, estatus: 'activo',
    desviacion_modelo_pct: Number(desviacion.toFixed(4)),
  });
}

// ===========================================================================
// EDUCACION FINANCIERA
// ===========================================================================
// Los ids llevan prefijo `_base_` porque db/reiniciar.sql borra todo lo que NO lo tenga:
// asi se distingue lo sembrado de lo que creo una accion durante el ensayo.
const metas = [
  { id: 'meta_base_ana_emergencia', usuario_id: 'usr_ana',    cuenta_origen_id: 'cta_ana_ahorro',    nombre: 'Fondo de emergencia',    monto_objetivo_centavos: 9600000,  monto_actual_centavos: 4815000,  fecha_objetivo: '2027-06-30', aportacion_sugerida_centavos: 265000,  frecuencia: 'quincenal', apartado_automatico: false, estatus: 'activa',   fecha_creacion: '2026-02-10' },
  { id: 'meta_base_ana_enganche',   usuario_id: 'usr_ana',    cuenta_origen_id: 'cta_ana_ahorro',    nombre: 'Enganche departamento',  monto_objetivo_centavos: 45000000, monto_actual_centavos: 2530000,  fecha_objetivo: '2029-12-31', aportacion_sugerida_centavos: 520000,  frecuencia: 'mensual',   apartado_automatico: false, estatus: 'activa',   fecha_creacion: '2026-03-16' },
  { id: 'meta_base_beto_liquidar',  usuario_id: 'usr_beto',   cuenta_origen_id: 'cta_beto_ahorro',   nombre: 'Liquidar la tarjeta',    monto_objetivo_centavos: 4738600,  monto_actual_centavos: 63200,    fecha_objetivo: '2028-03-31', aportacion_sugerida_centavos: 263000,  frecuencia: 'mensual',   apartado_automatico: false, estatus: 'pausada',  fecha_creacion: '2026-07-02' },
  { id: 'meta_base_carmen_retiro',  usuario_id: 'usr_carmen', cuenta_origen_id: 'cta_carmen_ahorro', nombre: 'Complemento de retiro',  monto_objetivo_centavos: 900000000,monto_actual_centavos: 287450000,fecha_objetivo: '2036-06-28', aportacion_sugerida_centavos: 5200000, frecuencia: 'mensual',   apartado_automatico: true,  estatus: 'activa',   fecha_creacion: '2024-01-08' },
  { id: 'meta_base_carmen_estudio', usuario_id: 'usr_carmen', cuenta_origen_id: 'cta_carmen_ahorro', nombre: 'Estudio en el jardín',   monto_objetivo_centavos: 35000000, monto_actual_centavos: 35000000, fecha_objetivo: '2026-01-31', aportacion_sugerida_centavos: 2900000, frecuencia: 'mensual',   apartado_automatico: false, estatus: 'cumplida', fecha_creacion: '2025-02-14' },
];

const topesGasto = [
  { id: 'tope_base_ana_restaurantes',  usuario_id: 'usr_ana',    categoria_id: 'cat_restaurantes',  monto_limite_centavos: 450000,  periodo: 'mensual', gastado_actual_centavos: 0, alertar_en_pct: 0.8000, estatus: 'dentro', fecha_creacion: '2026-06-01' },
  { id: 'tope_base_ana_suscripciones', usuario_id: 'usr_ana',    categoria_id: 'cat_suscripciones', monto_limite_centavos: 150000,  periodo: 'mensual', gastado_actual_centavos: 0, alertar_en_pct: 0.9000, estatus: 'dentro', fecha_creacion: '2026-07-15' },
  { id: 'tope_base_beto_conveniencia', usuario_id: 'usr_beto',   categoria_id: 'cat_conveniencia',  monto_limite_centavos: 120000,  periodo: 'mensual', gastado_actual_centavos: 0, alertar_en_pct: 0.8000, estatus: 'dentro', fecha_creacion: '2026-08-03' },
  { id: 'tope_base_carmen_ropa',       usuario_id: 'usr_carmen', categoria_id: 'cat_ropa',          monto_limite_centavos: 2500000, periodo: 'mensual', gastado_actual_centavos: 0, alertar_en_pct: 0.7500, estatus: 'dentro', fecha_creacion: '2026-05-20' },
];

// --- diagnostico_habitos ------------------------------------------------------
// Se calcula DESDE los movimientos, no a mano: si el generador cambia el gasto, el
// diagnostico cambia con el. Es lo que evita que la grafica y el puntaje se contradigan.
const esEsencial = new Map(categorias.map((c) => [c.id, c.es_esencial]));
const esIngreso = new Map(categorias.map((c) => [c.id, c.es_ingreso]));

const diagnosticoHabitos = [];

// El mes en curso esta a medias (la demo corre el dia 12), asi que su ingreso y su gasto
// no son comparables con los de un mes completo: incluirlo produce falsas alarmas del
// tipo "gastas mas de lo que ingresas". El diagnostico cubre los 11 meses cerrados; el
// mes en curso se responde leyendo movimientos, que es lo que hace la tool de gasto.
const PERIODOS_CERRADOS = PERIODOS.slice(0, -1);

for (const usuario of usuarios) {
  const gastoMensual = [];
  const ahorroMensual = [];

  // Utilizacion de las tarjetas de credito del usuario: el problema real de Beto no es
  // su ratio de deuda a ingreso (22 %), sino traer la tarjeta al 97 % de su limite.
  const utilizacion = tarjetas
    .filter((t) => t.usuario_id === usuario.id && t.tipo === 'credito' && t.limite_centavos > 0)
    .reduce((max, t) => Math.max(max, t.saldo_centavos / t.limite_centavos), 0);

  for (const periodo of PERIODOS_CERRADOS) {
    const delMes = movimientos.filter((m) => m.usuario_id === usuario.id && m.fecha.startsWith(periodo));
    const ingreso = delMes.filter((m) => m.tipo === 'abono' && esIngreso.get(m.categoria_id))
      .reduce((s, m) => s + m.monto_centavos, 0);
    // Del gasto se excluyen los traspasos entre cuentas propias, los pagos y mensualidades
    // de credito (el consumo ya se registro cuando se hizo) y las aportaciones a inversion
    // (eso es ahorro, no gasto). Sin esto el mismo peso se cuenta dos veces y la grafica
    // de gasto miente. El costo de la deuda si cuenta, pero via `cat_financiero`.
    const NO_ES_GASTO = ['cat_transferencias', 'cat_inversion'];
    const gastos = delMes.filter((m) => m.tipo === 'cargo' && !NO_ES_GASTO.includes(m.categoria_id));
    const gasto = gastos.reduce((s, m) => s + m.monto_centavos, 0);
    const gastoEsencial = gastos.filter((m) => esEsencial.get(m.categoria_id)).reduce((s, m) => s + m.monto_centavos, 0);

    gastoMensual.push(gasto);
    const gastoPromedio = gastoMensual.reduce((s, g) => s + g, 0) / gastoMensual.length;

    const ahorro = ingreso - gasto;
    const pagoDeuda = pagoMensualDe(usuario.id);
    const liquidez = cuentas.filter((c) => c.usuario_id === usuario.id && ['nomina', 'ahorro'].includes(c.tipo))
      .reduce((s, c) => s + Math.max(0, c.saldo_centavos), 0);

    const tasaAhorro = ingreso > 0 ? ahorro / ingreso : 0;
    // Un mes malo no es un habito, sobre todo con ingreso variable como el de Carmen: un
    // proyecto que se cobra en dos partes puede dejar un mes en rojo y el siguiente en
    // azul sin que nada haya cambiado. La tasa que decide el habito y el puntaje es la de
    // los ultimos tres meses; la mensual se conserva tal cual porque es un hecho.
    ahorroMensual.push({ ingreso, ahorro });
    const ventana = ahorroMensual.slice(-3);
    const ingresoVentana = ventana.reduce((s, v) => s + v.ingreso, 0);
    const tasaAhorroTendencia = ingresoVentana > 0
      ? ventana.reduce((s, v) => s + v.ahorro, 0) / ingresoVentana
      : 0;
    const ratioDeuda = ingreso > 0 ? pagoDeuda / ingreso : 0;
    const pctEsencial = gasto > 0 ? gastoEsencial / gasto : 0;
    const mesesFondo = gastoPromedio > 0 ? liquidez / gastoPromedio : 0;

    // Puntaje de salud financiera 0–100, cuatro componentes de 25 puntos cada uno:
    // ahorrar, no estar sobreendeudado, tener fondo de emergencia y no vivir de lo
    // discrecional. Explicado en docs/algoritmos/generacion-de-datos.md.
    const pAhorro = Math.max(0, Math.min(1, tasaAhorroTendencia / 0.20)) * 25;
    const pDeuda = Math.max(0, Math.min(1, 1 - ratioDeuda / TECHO_ENDEUDAMIENTO)) * 25;
    const pFondo = Math.max(0, Math.min(1, mesesFondo / 3)) * 25;
    const pEsencial = Math.max(0, Math.min(1, pctEsencial / 0.70)) * 25;
    const puntaje = Math.round(pAhorro + pDeuda + pFondo + pEsencial);

    // Orden deliberado: primero lo mas accionable. La tarjeta al limite es un problema
    // concreto con una salida concreta (reestructurar); "gastas mas de lo que ingresas"
    // es un sintoma, y de hecho suele ser consecuencia de lo primero.
    const habito = utilizacion > 0.80 ? `Traes tu tarjeta al ${Math.round(utilizacion * 100)} % de su límite`
      : tasaAhorroTendencia < 0 ? 'Gastas más de lo que ingresas'
      : ratioDeuda > TECHO_ENDEUDAMIENTO ? 'Tus pagos de deuda superan el 35 % de tu ingreso'
      : mesesFondo < 3 ? 'Tu fondo de emergencia cubre menos de 3 meses'
      : tasaAhorroTendencia < 0.10 ? 'Ahorras, pero menos del 10 % de tu ingreso'
      : pctEsencial < 0.55 ? 'Más del 45 % de tu gasto es discrecional'
      : 'Tus hábitos son sanos este mes';

    diagnosticoHabitos.push({
      usuario_id: usuario.id, periodo,
      ingreso_centavos: ingreso, gasto_centavos: gasto, ahorro_centavos: ahorro,
      tasa_ahorro_pct: Number(tasaAhorro.toFixed(4)),
      ratio_deuda_ingreso_pct: Number(ratioDeuda.toFixed(4)),
      gasto_esencial_pct: Number(pctEsencial.toFixed(4)),
      gasto_discrecional_pct: Number((1 - pctEsencial).toFixed(4)),
      meses_fondo_emergencia: Number(mesesFondo.toFixed(2)),
      puntaje_salud: puntaje,
      habito_detectado: habito,
    });
  }
}

// ===========================================================================
// ESCRITURA
// ===========================================================================
mkdirSync(SALIDA, { recursive: true });
console.log(`\nGenerando datos mock (semilla ${SEMILLA}) en db/datos/\n`);

escribirCsv('usuarios', ['id', 'nombre', 'fecha_nacimiento', 'edad', 'rfc', 'curp', 'ocupacion', 'ingreso_mensual_centavos', 'ingreso_es_variable', 'estado_civil', 'dependientes', 'ciudad', 'estado', 'segmento', 'cliente_desde', 'correo', 'telefono'], usuarios);

escribirCsv('cuentas', ['id', 'usuario_id', 'tipo', 'alias', 'clabe', 'numero_mascara', 'saldo_centavos', 'moneda', 'fecha_apertura', 'estatus', 'es_principal'],
  cuentas.map((c) => ({ ...c, moneda: 'MXN' })));

escribirCsv('tarjetas', ['id', 'cuenta_id', 'usuario_id', 'marca', 'producto', 'mascara', 'tipo', 'limite_centavos', 'saldo_centavos', 'tasa_anual', 'cat', 'pago_minimo_centavos', 'pago_no_intereses_centavos', 'dia_corte', 'fecha_corte', 'fecha_limite_pago', 'dias_mora', 'estatus'], tarjetas);

escribirCsv('categorias', ['id', 'nombre', 'grupo', 'es_esencial', 'es_ingreso', 'color', 'icono'], categorias);

escribirCsv('comercios', ['id', 'nombre', 'razon_social', 'categoria_id', 'ciudad', 'giro'], comercios);

escribirCsv('movimientos', ['id', 'cuenta_id', 'usuario_id', 'fecha', 'fecha_valor', 'tipo', 'monto_centavos', 'moneda', 'categoria_id', 'comercio_id', 'descripcion', 'canal', 'referencia', 'es_recurrente', 'es_atipico', 'saldo_posterior_centavos'], movimientos);

escribirCsv('suscripciones', ['id', 'usuario_id', 'cuenta_id', 'comercio_id', 'concepto', 'monto_centavos', 'dia_cargo', 'periodicidad', 'activa', 'fecha_inicio', 'fecha_cancelacion'], suscripciones);

escribirCsv('productos_credito', ['id', 'tipo', 'nombre', 'descripcion', 'tasa_anual_min', 'tasa_anual_max', 'cat_promedio', 'plazo_min_meses', 'plazo_max_meses', 'monto_min_centavos', 'monto_max_centavos', 'comision_apertura', 'ingreso_minimo_centavos', 'score_minimo', 'requiere_garantia'], productosCredito);

escribirCsv('creditos', ['id', 'usuario_id', 'producto_id', 'tarjeta_id', 'alias', 'monto_original_centavos', 'saldo_insoluto_centavos', 'tasa_anual', 'cat', 'plazo_meses', 'pagos_realizados', 'mensualidad_centavos', 'fecha_contratacion', 'fecha_proximo_pago', 'dias_mora', 'estatus'], creditos);

escribirCsv('amortizaciones', ['credito_id', 'numero_pago', 'fecha', 'saldo_inicial_centavos', 'capital_centavos', 'interes_centavos', 'iva_interes_centavos', 'mensualidad_centavos', 'saldo_final_centavos', 'estatus', 'fecha_pago'], amortizaciones);

escribirCsv('planes_reestructura', ['id', 'usuario_id', 'tarjeta_id', 'plazo_meses', 'saldo_a_diferir_centavos', 'tasa_anual', 'cat', 'mensualidad_centavos', 'total_a_pagar_centavos', 'intereses_totales_centavos', 'ahorro_vs_minimo_centavos', 'meses_vs_minimo', 'es_recomendado', 'vigente_hasta'], planesReestructura);

escribirCsv('buro', ['usuario_id', 'score', 'calificacion', 'consultas_12m', 'cuentas_abiertas', 'pagos_puntuales_pct', 'atrasos_12m', 'deuda_total_centavos', 'pago_mensual_comprometido_centavos', 'capacidad_pago_mensual_centavos', 'nivel_endeudamiento_pct', 'precalificado', 'precalificado_hasta_centavos', 'fecha_consulta'], buro);

escribirCsv('instrumentos', ['id', 'nombre', 'clave', 'tipo', 'emisora', 'moneda', 'plazo_dias', 'rendimiento_anual_esperado', 'volatilidad_anual', 'riesgo', 'liquidez', 'monto_minimo_centavos', 'precio_actual_centavos'],
  instrumentos.map((i) => ({ ...i, moneda: 'MXN', precio_actual_centavos: precioActual[i.id] })));

escribirCsv('perfiles_inversion', ['usuario_id', 'perfil', 'puntaje_cuestionario', 'horizonte_meses', 'tolerancia_perdida_pct', 'objetivo', 'experiencia', 'fecha_perfilamiento', 'vigente_hasta', 'ejecutivo'], perfilesInversion);

escribirCsv('modelos_portafolio', ['perfil', 'instrumento_id', 'peso_objetivo_pct'], modelosPortafolio);

escribirCsv('portafolios', ['id', 'usuario_id', 'cuenta_id', 'nombre', 'perfil', 'valor_actual_centavos', 'aportado_centavos', 'rendimiento_acumulado_centavos', 'rendimiento_pct', 'fecha_apertura', 'estatus', 'desviacion_modelo_pct'], portafolios);

escribirCsv('posiciones', ['id', 'portafolio_id', 'instrumento_id', 'titulos', 'precio_promedio_compra_centavos', 'precio_actual_centavos', 'costo_centavos', 'valor_mercado_centavos', 'plusvalia_centavos', 'peso_pct', 'peso_objetivo_pct', 'fecha_compra'], posiciones);

escribirCsv('precios_historicos', ['instrumento_id', 'fecha', 'precio_cierre_centavos', 'variacion_pct'], preciosHistoricos);

escribirCsv('metas', ['id', 'usuario_id', 'cuenta_origen_id', 'nombre', 'monto_objetivo_centavos', 'monto_actual_centavos', 'fecha_objetivo', 'aportacion_sugerida_centavos', 'frecuencia', 'apartado_automatico', 'estatus', 'fecha_creacion'], metas);

escribirCsv('topes_gasto', ['id', 'usuario_id', 'categoria_id', 'monto_limite_centavos', 'periodo', 'gastado_actual_centavos', 'alertar_en_pct', 'estatus', 'fecha_creacion'], topesGasto);

escribirCsv('diagnostico_habitos', ['usuario_id', 'periodo', 'ingreso_centavos', 'gasto_centavos', 'ahorro_centavos', 'tasa_ahorro_pct', 'ratio_deuda_ingreso_pct', 'gasto_esencial_pct', 'gasto_discrecional_pct', 'meses_fondo_emergencia', 'puntaje_salud', 'habito_detectado'], diagnosticoHabitos);

// Arranca vacia: la escriben las tools de accion. Ver db/reiniciar.sql.
escribirCsv('acciones_aplicadas', ['usuario_id', 'accion', 'objeto_tipo', 'objeto_id', 'contexto', 'resultado'], []);

// ===========================================================================
// RESUMEN
// ===========================================================================
const pesos = (c) => `$${(c / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

console.log('\nResumen para el guion de la demo:\n');
for (const usuario of usuarios) {
  const suyos = movimientos.filter((m) => m.usuario_id === usuario.id);
  const ultimo = diagnosticoHabitos.filter((d) => d.usuario_id === usuario.id).at(-1);
  console.log(`  ${usuario.nombre}`);
  console.log(`    movimientos: ${suyos.length}   atipicos: ${suyos.filter((m) => m.es_atipico).length}`);
  console.log(`    deuda: ${pesos(deudaDe(usuario.id))}   puntaje de salud (${ultimo.periodo}): ${ultimo.puntaje_salud}/100`);
  console.log(`    habito: ${ultimo.habito_detectado}`);
}

const planRecomendado = planesReestructura.find((p) => p.es_recomendado);
if (planRecomendado) {
  console.log(`\n  Plan recomendado a Beto: ${planRecomendado.plazo_meses} meses, ${pesos(planRecomendado.mensualidad_centavos)}/mes,`);
  console.log(`  CAT ${(planRecomendado.cat * 100).toFixed(2)} %, ahorro vs. minimo ${pesos(planRecomendado.ahorro_vs_minimo_centavos)} y ${planRecomendado.meses_vs_minimo} meses menos.`);
}
console.log('');
