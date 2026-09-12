/**
 * Matematica de credito: mensualidad, tabla de amortizacion, CAT y el escenario de
 * "seguir pagando el minimo". Documentado en `docs/algoritmos/amortizacion.md`.
 *
 * Es el puerto a TypeScript de `scripts/lib/finanzas.mjs`, el modulo con el que se
 * generaron los CSV. **Las dos implementaciones tienen que dar el mismo numero**: el
 * test `simular-reestructura.spec.ts` compara la salida de la tool contra las filas
 * de `db/datos/planes_reestructura.csv`, que salieron del generador. Si alguien cambia
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
 * `db/datos/planes_reestructura.csv` (es un dato del banco, no una formula), y la tool
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
