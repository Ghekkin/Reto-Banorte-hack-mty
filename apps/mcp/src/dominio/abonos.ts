import { accionesDe } from "../datos/index.js";
import { mensualidad, simularConCuota, type FilaAmortizacion } from "./finanzas.js";
import { pesos } from "./suscripciones.js";
import { sumarMeses } from "./tiempo.js";

/**
 * Abono a capital en un credito a plazo: «¿y si pago $6,000 al mes?», «quiero liquidarlo
 * en 12 meses». Documentado en `docs/algoritmos/abono-a-capital.md`.
 *
 * **El modelo es el que un banco permite**: la mensualidad del contrato no cambia; lo que
 * se pague encima va directo a capital cada mes y el plazo se acorta. Por eso pagar MENOS
 * que el contrato, o tardar MAS meses de los que faltan, no es posible con abonos (eso ya
 * es una reestructura) y aqui se contesta con un motivo en vez de inventar un escenario.
 *
 * Toda la aritmetica es la de `tablaAmortizacion` (`simularConCuota` en `finanzas.ts`):
 * con la cuota del contrato reproduce al centavo las filas pendientes de
 * `banorte.amortizaciones`, asi que "sin abono" y "la tabla del banco" son el mismo numero.
 *
 * Nada de esto lee `creditos`: recibe la base del credito ya armada, para que
 * `creditos.ts` pueda superponer el abono sin una dependencia circular.
 */

/** Lo que la simulacion necesita saber de un credito. */
export type BaseDeCredito = {
  saldoInsolutoCentavos: number;
  tasaAnual: number;
  mensualidadContratoCentavos: number;
  pagosRealizados: number;
  fechaProximoPago: string;
};

export type HitoDePago = {
  numeroPago: number;
  periodo: string;
  capitalCentavos: number;
  /** Interes MAS su IVA. */
  interesCentavos: number;
  saldoFinalCentavos: number;
};

/** Mismos nombres que `EscenarioDePago` (schemas) y que las props de `ProyeccionPagoCredito`. */
export type EscenarioDePago = {
  mensualidadCentavos: number;
  plazoRestanteMeses: number;
  totalInteresesEstimadosCentavos: number;
  fechaLiquidacion: string;
  amortizacionResumen: HitoDePago[];
};

export type Simulacion = { escenario: EscenarioDePago; filas: FilaAmortizacion[] };

/* --- Estado: el abono que la persona ya programo --------------------------- */

export type AbonoProgramado = {
  creditoId: string;
  alias: string;
  abonoMensualCentavos: number;
  mensualidadContratoCentavos: number;
  /** Contrato + abono. */
  mensualidadCentavos: number;
  /** El primer pago que ya lleva el abono. */
  desde: string;
  programadoEn: string;
  /** Como iba y como quedo en el momento de programar: la respuesta de un reintento. */
  antes: EscenarioDePago;
  despues: EscenarioDePago;
};

/**
 * Todas las veces que se programo un abono en ese credito, en orden. Gana la ultima:
 * programar otra vez reemplaza, y programar la mensualidad del contrato (abono 0) lo quita.
 */
export function abonosProgramados(usuarioId: string, creditoId: string): Array<{ idempotencyKey: string; datos: AbonoProgramado }> {
  return accionesDe(usuarioId, "programar_abono_capital")
    .map((a) => ({ idempotencyKey: a.idempotencyKey, datos: a.datos as unknown as AbonoProgramado }))
    .filter((a) => a.datos.creditoId === creditoId);
}

/** Lo que va a capital cada mes hoy en ese credito. 0 si nunca se programo o se quito. */
export function abonoVigente(usuarioId: string, creditoId: string): number {
  return Math.max(0, abonosProgramados(usuarioId, creditoId).at(-1)?.datos.abonoMensualCentavos ?? 0);
}

/* --- La simulacion --------------------------------------------------------- */

/**
 * El credito pagando `cuotaCentavos` al mes desde el proximo pago. `null` si esa cuota no
 * cubre ni el interes del mes (la deuda no bajaria nunca).
 */
export function simularCredito(base: BaseDeCredito, cuotaCentavos: number): Simulacion | null {
  const filas = simularConCuota(base.saldoInsolutoCentavos, base.tasaAnual, cuotaCentavos);
  if (!filas || filas.length === 0) return null;

  const n = filas.length;
  return {
    filas,
    escenario: {
      // Con una cuota que liquida en un solo pago, se paga solo lo que falta, no la cuota pedida.
      mensualidadCentavos: filas[0]!.mensualidadCentavos,
      plazoRestanteMeses: n,
      totalInteresesEstimadosCentavos: filas.reduce((s, f) => s + f.interesCentavos + f.ivaInteresCentavos, 0),
      fechaLiquidacion: sumarMeses(base.fechaProximoPago, n - 1),
      amortizacionResumen: hitosDe(filas, base),
    },
  };
}

/**
 * Cuatro hitos para la tarjeta: el proximo pago, ~1/3, ~2/3 y la liquidacion. Con pocos
 * pagos se repetirian (con 2 pagos, 1/3 y 2/3 caen en el primero): se quitan los repetidos.
 */
export function hitosDe(filas: FilaAmortizacion[], base: Pick<BaseDeCredito, "pagosRealizados" | "fechaProximoPago">): HitoDePago[] {
  const n = filas.length;
  const posiciones = [1, Math.round(n / 3), Math.round((2 * n) / 3), n]
    .map((k) => Math.min(n, Math.max(1, k)))
    .filter((k, i, todas) => todas.indexOf(k) === i)
    .sort((a, b) => a - b);

  return posiciones.map((k) => {
    const fila = filas[k - 1]!;
    return {
      numeroPago: base.pagosRealizados + k,
      periodo: sumarMeses(base.fechaProximoPago, k - 1),
      capitalCentavos: fila.capitalCentavos,
      interesCentavos: fila.interesCentavos + fila.ivaInteresCentavos,
      saldoFinalCentavos: fila.saldoFinalCentavos,
    };
  });
}

/**
 * La cuota que liquida en `plazoMeses` pagos. Se parte de la mensualidad de pagos iguales
 * (`mensualidad()`, la misma formula del contrato); por redondeo a veces deja un residuo
 * de centavos que se vuelve un pago mas (Ana a 12 meses: 550,320 da 13 pagos), y entonces
 * se sube centavo a centavo hasta que cierre en el plazo. En los cuatro creditos y todos
 * sus plazos posibles hace falta, como mucho, un centavo.
 */
export function cuotaParaPlazo(base: BaseDeCredito, plazoMeses: number): number {
  let cuota = mensualidad(base.saldoInsolutoCentavos, base.tasaAnual, plazoMeses);
  for (let intento = 0; intento < 100_000; intento++) {
    const filas = simularConCuota(base.saldoInsolutoCentavos, base.tasaAnual, cuota);
    if (filas && filas.length <= plazoMeses) return cuota;
    cuota++;
  }
  throw new Error(`no se encontro una cuota que liquide en ${plazoMeses} meses`);
}

export type PedidoDePago = { mensualidadCentavos?: number; plazoMeses?: number };

export type Evaluacion =
  | { posible: true; motivo: null; simulacion: Simulacion; abonoMensualCentavos: number }
  | { posible: false; motivo: string; simulacion: null; abonoMensualCentavos: 0 };

/**
 * Lo que la persona pidio, traducido a abono a capital.
 *
 * 1. Con la cuota del contrato se sabe cuantos pagos faltan: es el plazo MAS largo posible.
 * 2. «Pagar $X al mes»: si X es menor que el contrato, no es posible; si no, X es la cuota.
 * 3. «Liquidar en N meses»: si N pasa del maximo, no es posible; si no, la cuota es la que
 *    liquida en N (nunca menor que la del contrato).
 * 4. Se simula con esa cuota; el abono es lo que pasa del contrato.
 */
export function evaluarPedido(base: BaseDeCredito, pedido: PedidoDePago): Evaluacion {
  const contrato = base.mensualidadContratoCentavos;
  const delContrato = simularCredito(base, contrato);
  if (!delContrato) throw new Error("la mensualidad del contrato no cubre los intereses: el credito no amortiza");
  const plazoMaximo = delContrato.escenario.plazoRestanteMeses;

  let cuota: number;
  if (pedido.mensualidadCentavos !== undefined) {
    if (pedido.mensualidadCentavos < contrato) {
      return {
        posible: false,
        motivo:
          `Con abonos a capital no se puede pagar menos que la mensualidad de tu contrato, ${pesos(contrato)}. ` +
          "Pagar menos al mes ya sería reestructurar el crédito.",
        simulacion: null,
        abonoMensualCentavos: 0,
      };
    }
    cuota = pedido.mensualidadCentavos;
  } else if (pedido.plazoMeses !== undefined) {
    if (pedido.plazoMeses > plazoMaximo) {
      return {
        posible: false,
        motivo:
          `Con abonos a capital el plazo solo se acorta: te quedan ${plazoMaximo} pagos de ${pesos(contrato)}, ` +
          `así que lo más que puedes tardar es ${plazoMaximo} meses. Alargarlo ya sería reestructurar el crédito.`,
        simulacion: null,
        abonoMensualCentavos: 0,
      };
    }
    cuota = Math.max(contrato, cuotaParaPlazo(base, pedido.plazoMeses));
  } else {
    throw new Error("manda `mensualidadCentavos` o `plazoMeses`");
  }

  const simulacion = simularCredito(base, cuota)!;
  return {
    posible: true,
    motivo: null,
    simulacion,
    abonoMensualCentavos: Math.max(0, simulacion.escenario.mensualidadCentavos - contrato),
  };
}
