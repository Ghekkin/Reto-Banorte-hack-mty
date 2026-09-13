/**
 * Matematica de credito: mensualidad, tabla de amortizacion, CAT y el escenario de
 * "seguir pagando el minimo". Documentado en `docs/algoritmos/amortizacion.md`.
 *
 * Es el puerto a TypeScript de `scripts/lib/finanzas.mjs`, el modulo con el que se
 * generaron los datos. **Las dos implementaciones tienen que dar el mismo numero**: el
 * test `simular-reestructura.spec.ts` compara la salida de la tool contra las filas
 * de la tabla `banorte.planes_reestructura`. Si alguien cambia
 * una formula aqui, ese test truena, y eso es exactamente lo que debe pasar.
 *
 * Todo en CENTAVOS ENTEROS. Las divisiones se redondean con Math.round y el ultimo
 * pago absorbe el residuo, para que la tabla cierre exactamente en cero.
 */

/** IVA sobre intereses, Mexico. */
export const IVA = 0.16;

/** Tasa mensual efectiva incluyendo IVA sobre el interes. */
export function tasaMensualEfectiva(tasaAnual: number): number {
  return (tasaAnual / 12) * (1 + IVA);
}

/**
 * Mensualidad fija de un credito de pagos iguales (sistema frances).
 *
 *              i
 *   M = P · ---------
 *           1 - (1+i)^-n
 */
export function mensualidad(saldoCentavos: number, tasaAnual: number, plazoMeses: number): number {
  const i = tasaMensualEfectiva(tasaAnual);
  if (i === 0) return Math.round(saldoCentavos / plazoMeses);
  const factor = i / (1 - Math.pow(1 + i, -plazoMeses));
  return Math.round(saldoCentavos * factor);
}

export type FilaAmortizacion = {
  numeroPago: number;
  saldoInicialCentavos: number;
  capitalCentavos: number;
  interesCentavos: number;
  ivaInteresCentavos: number;
  mensualidadCentavos: number;
  saldoFinalCentavos: number;
};

/**
 * Tabla de amortizacion completa. El interes se calcula sobre el saldo vivo, el IVA
 * sobre el interes, y el capital es el resto de la mensualidad. El ultimo pago se
 * ajusta para que el saldo final sea exactamente 0.
 */
export function tablaAmortizacion(montoCentavos: number, tasaAnual: number, plazoMeses: number): FilaAmortizacion[] {
  const tasaMensualSinIva = tasaAnual / 12;
  const cuota = mensualidad(montoCentavos, tasaAnual, plazoMeses);

  const filas: FilaAmortizacion[] = [];
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
      numeroPago: n,
      saldoInicialCentavos: saldo,
      capitalCentavos: capital,
      interesCentavos: interes,
      ivaInteresCentavos: ivaInteres,
      mensualidadCentavos: cuotaFila,
      saldoFinalCentavos: saldoFinal,
    });

    saldo = saldoFinal;
    if (saldo === 0) break;
  }

  return filas;
}

export type LiquidacionConPago = {
  meses: number | null;
  totalPagadoCentavos: number | null;
  totalInteresesCentavos: number | null;
  nuncaLiquida: boolean;
  /** La tabla del escenario. Vacia cuando `nuncaLiquida`: no hay tabla que ensenar. */
  filas: FilaAmortizacion[];
};

/**
 * La relacion INVERSA de `mensualidad()`: cuantos meses tarda en liquidarse un saldo si se
 * paga una cantidad fija al mes.
 *
 * `mensualidad()` contesta "cuanto pago si quiero terminar en N meses"; esto contesta
 * "cuando termino si pago X al mes". Son las dos preguntas que la gente hace de verdad, y
 * la segunda no tiene forma cerrada limpia con el IVA sobre intereses de por medio, asi
 * que se itera la amortizacion mes a mes — el mismo patron que `escenarioPagoMinimo`.
 *
 * Devuelve tambien las filas para que nadie tenga que repetir esta iteracion afuera: una
 * segunda copia del bucle es una segunda version de la verdad esperando a divergir.
 *
 * `nuncaLiquida` es el caso importante: si el pago no alcanza a cubrir el interes con su
 * IVA, el saldo crece solo y no hay respuesta. Contestar un numero ahi seria peor que
 * contestar "asi no se acaba nunca".
 */
export function mesesParaLiquidar(
  saldoCentavos: number,
  tasaAnual: number,
  pagoMensualCentavos: number,
  topeMeses = 600,
): LiquidacionConPago {
  const tasaMensual = tasaAnual / 12;
  const filas: FilaAmortizacion[] = [];
  let saldo = saldoCentavos;
  let totalPagado = 0;
  let totalIntereses = 0;
  let meses = 0;

  while (saldo > 0 && meses < topeMeses) {
    const interes = Math.round(saldo * tasaMensual);
    const iva = Math.round(interes * IVA);

    if (pagoMensualCentavos <= interes + iva) return SIN_LIQUIDACION;

    // El ultimo pago solo cubre lo que falta: no se cobra de mas para cerrar en cero.
    let pago = Math.min(pagoMensualCentavos, saldo + interes + iva);
    let capital = pago - interes - iva;
    let saldoFinal = saldo - capital;

    // El ultimo pago absorbe el residuo, igual que en `tablaAmortizacion`. Sin esto,
    // pagar exactamente la cuota que devuelve `mensualidad()` deja 5 centavos vivos por
    // el doble redondeo (interes y luego IVA) y la funcion reporta un mes MAS: 13 en vez
    // de 12. Un residuo de centavos es un artefacto de redondeo, no un mes de deuda.
    if (saldoFinal > 0 && saldoFinal <= RESIDUO_MAXIMO) {
      pago += saldoFinal;
      capital += saldoFinal;
      saldoFinal = 0;
    }

    meses++;
    filas.push({
      numeroPago: meses,
      saldoInicialCentavos: saldo,
      capitalCentavos: capital,
      interesCentavos: interes,
      ivaInteresCentavos: iva,
      mensualidadCentavos: pago,
      saldoFinalCentavos: saldoFinal,
    });

    saldo = saldoFinal;
    totalPagado += pago;
    totalIntereses += interes + iva;
  }

  if (saldo > 0) return SIN_LIQUIDACION;

  return {
    meses,
    totalPagadoCentavos: totalPagado,
    totalInteresesCentavos: totalIntereses,
    nuncaLiquida: false,
    filas,
  };
}

/** Un peso o menos de saldo vivo es redondeo, no deuda: lo absorbe el ultimo pago. */
const RESIDUO_MAXIMO = 100;

const SIN_LIQUIDACION: LiquidacionConPago = {
  meses: null,
  totalPagadoCentavos: null,
  totalInteresesCentavos: null,
  nuncaLiquida: true,
  filas: [],
};

/**
 * Los intereses con IVA que cuesta liquidar un saldo en un plazo dado, sumados de la
 * tabla de amortizacion y no estimados: es la misma tabla que se le puede ensenar.
 */
export function interesesDelPlazo(saldoCentavos: number, tasaAnual: number, plazoMeses: number): number {
  return tablaAmortizacion(saldoCentavos, tasaAnual, plazoMeses).reduce(
    (suma, fila) => suma + fila.interesCentavos + fila.ivaInteresCentavos,
    0,
  );
}

/**
 * CAT: la tasa anual que hace que el valor presente de los pagos iguale lo que el
 * cliente recibio de verdad. Es una TIR mensual anualizada y se resuelve por
 * biseccion (no tiene forma cerrada, y la biseccion converge siempre en este rango).
 */
export function calcularCAT(
  montoCentavos: number,
  cuotaCentavos: number,
  plazoMeses: number,
  comisionPct = 0,
): number {
  const recibido = montoCentavos * (1 - comisionPct);

  const valorPresente = (r: number): number => {
    let vp = 0;
    for (let k = 1; k <= plazoMeses; k++) vp += cuotaCentavos / Math.pow(1 + r, k);
    return vp - recibido;
  };

  let lo = 0;
  let hi = 1; // 100 % mensual: techo absurdo a proposito
  if (valorPresente(hi) > 0) return 99.9999;

  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    if (valorPresente(mid) > 0) lo = mid;
    else hi = mid;
  }

  const rMensual = (lo + hi) / 2;
  return Number((Math.pow(1 + rMensual, 12) - 1).toFixed(4));
}

export type EscenarioMinimo = {
  meses: number | null;
  totalPagadoCentavos: number | null;
  nuncaLiquida: boolean;
};

/**
 * Que pasa si la persona sigue pagando solo el minimo. El minimo NO es un porcentaje
 * plano del saldo: son los intereses del periodo con IVA mas 1.5 % del capital, con
 * piso en pesos. El tope de 600 meses reporta el caso en que la deuda crece sola en
 * vez de colgar el proceso.
 */
export function escenarioPagoMinimo(
  saldoCentavos: number,
  tasaAnual: number,
  pctCapital = 0.015,
  pisoCentavos = 20000,
): EscenarioMinimo {
  const tasaMensual = tasaAnual / 12;
  let saldo = saldoCentavos;
  let totalPagado = 0;
  let meses = 0;

  while (saldo > 0 && meses < 600) {
    const interes = Math.round(saldo * tasaMensual);
    const iva = Math.round(interes * IVA);
    let pago = Math.max(interes + iva + Math.round(saldo * pctCapital), pisoCentavos);

    if (pago <= interes + iva) {
      return { meses: null, totalPagadoCentavos: null, nuncaLiquida: true };
    }
    if (pago > saldo + interes + iva) pago = saldo + interes + iva;

    saldo = saldo + interes + iva - pago;
    totalPagado += pago;
    meses++;
  }

  return { meses, totalPagadoCentavos: totalPagado, nuncaLiquida: saldo > 0 };
}

/**
 * El pago minimo que un estado de cuenta reportaria hoy. Se calcula aqui para que la
 * tarjeta y el escenario de pago minimo nunca usen dos formulas distintas.
 */
export function pagoMinimoTarjeta(
  saldoCentavos: number,
  tasaAnual: number,
  pctCapital = 0.015,
  pisoCentavos = 20000,
): number {
  const interes = Math.round(saldoCentavos * (tasaAnual / 12));
  const iva = Math.round(interes * IVA);
  return Math.max(interes + iva + Math.round(saldoCentavos * pctCapital), pisoCentavos);
}

/** Los intereses con IVA que el saldo revolvente genera en UN mes. */
export function interesesMensualesRevolventes(saldoCentavos: number, tasaAnual: number): number {
  const interes = Math.round(saldoCentavos * (tasaAnual / 12));
  return interes + Math.round(interes * IVA);
}

export type Oferta = {
  plazoMeses: number;
  saldoADiferirCentavos: number;
  tasaAnual: number;
  cat: number;
  mensualidadCentavos: number;
  totalAPagarCentavos: number;
  interesesTotalesCentavos: number;
  ahorroVsMinimoCentavos: number;
  mesesVsMinimo: number;
};

/**
 * Una oferta de reestructura: el saldo revolvente convertido en mensualidades fijas
 * a una tasa menor, comparado contra seguir pagando el minimo. El `ahorroVsMinimo`
 * es el numero que la UI pone grande, asi que se calcula aqui y no en el componente.
 */
export function ofertaReestructura(entrada: {
  saldoCentavos: number;
  tasaPlan: number;
  plazoMeses: number;
  tasaTarjeta: number;
  minimo?: EscenarioMinimo;
}): Oferta {
  const { saldoCentavos, tasaPlan, plazoMeses, tasaTarjeta } = entrada;
  const cuota = mensualidad(saldoCentavos, tasaPlan, plazoMeses);
  const total = cuota * plazoMeses;
  const minimo = entrada.minimo ?? escenarioPagoMinimo(saldoCentavos, tasaTarjeta);

  return {
    plazoMeses,
    saldoADiferirCentavos: saldoCentavos,
    tasaAnual: tasaPlan,
    cat: calcularCAT(saldoCentavos, cuota, plazoMeses, 0),
    mensualidadCentavos: cuota,
    totalAPagarCentavos: total,
    interesesTotalesCentavos: total - saldoCentavos,
    ahorroVsMinimoCentavos: minimo.totalPagadoCentavos === null ? 0 : minimo.totalPagadoCentavos - total,
    mesesVsMinimo: minimo.meses === null ? 0 : minimo.meses - plazoMeses,
  };
}

/**
 * Tasa de RESPALDO por plazo. La oferta real de cada tarjeta vive en
 * `banorte.planes_reestructura` (es un dato del banco, no una formula), y la tool
 * la usa cuando existe. Esto es lo que se cotiza cuando alguien pide un plazo que no
 * esta en esa tabla: a mayor plazo, mayor tasa, y nunca por encima de la tasa de la
 * propia tarjeta menos 5 puntos, porque una reestructura mas cara que el revolvente no
 * es una oferta. Razonamiento en `docs/algoritmos/oferta-de-reestructura.md`.
 */
const TASA_POR_PLAZO: Record<number, number> = { 6: 0.189, 12: 0.189, 18: 0.219, 24: 0.249, 36: 0.279 };

export function tasaDelPlan(plazoMeses: number, tasaTarjeta: number): number {
  const exacta = TASA_POR_PLAZO[plazoMeses];
  const tasa = exacta ?? Math.min(0.329, 0.189 + Math.max(0, plazoMeses - 12) * 0.005);
  return Math.min(tasa, Math.max(0.09, tasaTarjeta - 0.05));
}

export const PLAZOS_POR_DEFECTO = [12, 18, 24, 36] as const;
