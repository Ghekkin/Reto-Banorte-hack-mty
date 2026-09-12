// Matematica de credito: mensualidad, tabla de amortizacion, CAT y el escenario de
// "seguir pagando el minimo". Documentado en docs/algoritmos/amortizacion.md.
//
// Todo en CENTAVOS ENTEROS. Las divisiones se redondean con Math.round y el ultimo pago
// absorbe el residuo, para que la tabla cierre exactamente en cero: el schema lo exige
// con ck_amortizacion_cuadra y validar-datos.mjs lo verifica.

export const IVA = 0.16;   // IVA sobre intereses, Mexico

/** Tasa mensual efectiva incluyendo IVA sobre el interes. */
export function tasaMensualEfectiva(tasaAnual) {
  return (tasaAnual / 12) * (1 + IVA);
}

/**
 * Mensualidad fija de un credito de pagos iguales (sistema frances).
 *
 *              i
 *   M = P · ---------
 *           1 - (1+i)^-n
 *
 * con `i` = tasa mensual efectiva (ya con IVA) y `n` = plazo en meses.
 */
export function mensualidad(saldoCentavos, tasaAnual, plazoMeses) {
  const i = tasaMensualEfectiva(tasaAnual);
  if (i === 0) return Math.round(saldoCentavos / plazoMeses);
  const factor = i / (1 - Math.pow(1 + i, -plazoMeses));
  return Math.round(saldoCentavos * factor);
}

/**
 * Tabla de amortizacion completa.
 *
 * En cada pago: el interes se calcula sobre el saldo vivo, el IVA sobre el interes, y
 * el capital es el resto de la mensualidad. El ultimo pago se ajusta para que el saldo
 * final sea exactamente 0 (el redondeo de los pagos anteriores deja un residuo de unos
 * pocos centavos que hay que absorber en algun lado, y el ultimo es el lugar honesto).
 */
export function tablaAmortizacion(montoCentavos, tasaAnual, plazoMeses) {
  const i = tasaMensualEfectiva(tasaAnual);
  const tasaMensualSinIva = tasaAnual / 12;
  const cuota = mensualidad(montoCentavos, tasaAnual, plazoMeses);

  const filas = [];
  let saldo = montoCentavos;

  for (let n = 1; n <= plazoMeses; n++) {
    const esUltimo = n === plazoMeses;
    const interes = Math.round(saldo * tasaMensualSinIva);
    const ivaInteres = Math.round(interes * IVA);

    let capital = cuota - interes - ivaInteres;
    let cuotaFila = cuota;

    if (esUltimo || capital >= saldo) {
      // Cierra la tabla: el capital es todo lo que queda y la cuota se recalcula.
      capital = saldo;
      cuotaFila = capital + interes + ivaInteres;
    }

    const saldoFinal = saldo - capital;
    filas.push({
      numero_pago: n,
      saldo_inicial_centavos: saldo,
      capital_centavos: capital,
      interes_centavos: interes,
      iva_interes_centavos: ivaInteres,
      mensualidad_centavos: cuotaFila,
      saldo_final_centavos: saldoFinal,
    });

    saldo = saldoFinal;
    if (saldo === 0) break;
  }

  return filas;
}

/**
 * CAT (Costo Anual Total) como la tasa anual que hace que el valor presente de los
 * pagos iguale lo que el cliente recibio de verdad (el monto menos la comision de
 * apertura). Es una TIR mensual anualizada, y se resuelve por biseccion porque no
 * tiene forma cerrada.
 *
 *   0 = -(P - comision) + Σ M / (1+r)^k     →     CAT = (1+r)^12 - 1
 *
 * Biseccion y no Newton a proposito: converge siempre en este rango y no depende de
 * una derivada ni de una semilla afortunada. 200 iteraciones sobran para 1e-10.
 */
export function calcularCAT(montoCentavos, cuotaCentavos, plazoMeses, comisionPct = 0) {
  const recibido = montoCentavos * (1 - comisionPct);

  const valorPresente = (r) => {
    let vp = 0;
    for (let k = 1; k <= plazoMeses; k++) vp += cuotaCentavos / Math.pow(1 + r, k);
    return vp - recibido;
  };

  let lo = 0;
  let hi = 1;                       // 100 % mensual: techo absurdo a proposito
  if (valorPresente(hi) > 0) return 99.9999;

  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    if (valorPresente(mid) > 0) lo = mid; else hi = mid;
  }

  const rMensual = (lo + hi) / 2;
  const cat = Math.pow(1 + rMensual, 12) - 1;
  return Number(cat.toFixed(4));
}

/**
 * Que pasa si el cliente sigue pagando solo el minimo.
 *
 * El minimo NO es un porcentaje plano del saldo. En Mexico se calcula como los
 * intereses del periodo mas un porcentaje del capital (1.5 % es lo tipico), con un piso
 * en pesos. La diferencia importa: un 5 % plano sobre una tasa de 48.9 % apenas cubre
 * los intereses y la deuda tarda siglos en amortizar, lo que produce cifras absurdas
 * ("te ahorras 582 meses") que le cuestan credibilidad a la demo. Con la formula real la
 * liquidacion es larga pero finita, y el ahorro del plan sigue siendo el argumento.
 *
 * El tope de 600 meses no es decorativo: si el minimo no cubre ni los intereses la deuda
 * crece sola, y ese caso hay que reportarlo en vez de colgar el generador.
 */
export function escenarioPagoMinimo(saldoCentavos, tasaAnual, pctCapital = 0.015, pisoCentavos = 20000) {
  const tasaMensual = tasaAnual / 12;
  let saldo = saldoCentavos;
  let totalPagado = 0;
  let meses = 0;

  while (saldo > 0 && meses < 600) {
    const interes = Math.round(saldo * tasaMensual);
    const iva = Math.round(interes * IVA);
    let pago = Math.max(interes + iva + Math.round(saldo * pctCapital), pisoCentavos);

    if (pago <= interes + iva) {
      // El minimo no alcanza ni para los intereses: la deuda crece sola.
      return { meses: null, total_pagado_centavos: null, nunca_liquida: true };
    }
    if (pago > saldo + interes + iva) pago = saldo + interes + iva;

    saldo = saldo + interes + iva - pago;
    totalPagado += pago;
    meses++;
  }

  return {
    meses,
    total_pagado_centavos: totalPagado,
    nunca_liquida: saldo > 0,
  };
}

/**
 * El pago minimo que un estado de cuenta reportaria hoy: intereses del periodo con IVA
 * mas 1.5 % del capital. Se calcula aqui para que la tarjeta y el escenario de pago
 * minimo nunca usen dos formulas distintas.
 */
export function pagoMinimoTarjeta(saldoCentavos, tasaAnual, pctCapital = 0.015, pisoCentavos = 20000) {
  const interes = Math.round(saldoCentavos * (tasaAnual / 12));
  const iva = Math.round(interes * IVA);
  return Math.max(interes + iva + Math.round(saldoCentavos * pctCapital), pisoCentavos);
}

/**
 * Una oferta de reestructura: convierte el saldo revolvente en mensualidades fijas a
 * una tasa menor, y la compara contra seguir pagando el minimo. El `ahorro_vs_minimo`
 * es el numero que la UI pone grande, asi que se calcula aqui y no en el componente.
 */
export function ofertaReestructura({ saldoCentavos, tasaPlan, plazoMeses, tasaTarjeta, pctCapitalMinimo, pisoMinimo }) {
  const cuota = mensualidad(saldoCentavos, tasaPlan, plazoMeses);
  const total = cuota * plazoMeses;
  const intereses = total - saldoCentavos;
  const cat = calcularCAT(saldoCentavos, cuota, plazoMeses, 0);
  const minimo = escenarioPagoMinimo(saldoCentavos, tasaTarjeta, pctCapitalMinimo, pisoMinimo);

  return {
    plazo_meses: plazoMeses,
    saldo_a_diferir_centavos: saldoCentavos,
    tasa_anual: tasaPlan,
    cat,
    mensualidad_centavos: cuota,
    total_a_pagar_centavos: total,
    intereses_totales_centavos: intereses,
    ahorro_vs_minimo_centavos: minimo.total_pagado_centavos === null ? 0 : minimo.total_pagado_centavos - total,
    meses_vs_minimo: minimo.meses === null ? 0 : minimo.meses - plazoMeses,
  };
}
