import { EntradaSimularCredito, SalidaSimularCredito } from "@maya/schemas";
import { capacidadPagoMensual } from "../dominio/consultas.js";
import { creditosAPlazo, proximosPagosDe, type CreditoAPlazo } from "../dominio/creditos.js";
import {
  interesesDelPlazo,
  mensualidad,
  mesesParaLiquidar,
  tablaAmortizacion,
  type FilaAmortizacion,
  type LiquidacionConPago,
} from "../dominio/finanzas.js";
import { sumarMeses } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/** Mas filas que estas no se pintan en ninguna tarjeta; la tabla completa no aporta. */
const HITOS_DEL_RESUMEN = 6;

/**
 * `simular_credito` — LECTURA que calcula. Que pasa con un credito a plazo si se paga
 * distinto.
 *
 * Nacio de un bug que llego a pantalla el 2026-09-12: Ana pregunto como terminar su
 * credito en un ano y el modelo contesto "$504,785 al mes" cuando la respuesta era
 * $5,503.20. No fue un desliz de aritmetica sino un hueco de tools: `simular_reestructura`
 * exige `tarjetaId` y lanza sin tarjeta, y `consultar_creditos` solo lee lo pactado. No
 * habia donde preguntar, y lo que no tiene tool el modelo lo escribe de memoria.
 *
 * **El plan actual se lee de la tabla, el escenario nuevo se calcula.** Los intereses que
 * le faltan por pagar salen de `amortizaciones` —la misma tabla que se le puede ensenar,
 * con cuales pagos ya estan liquidados— y no de recalcular la amortizacion, que daria
 * numeros parecidos pero distintos. El escenario hipotetico si se calcula, porque no
 * existe en ninguna tabla.
 */
export const simularCredito: DefinicionDeTool = {
  nombre: "simular_credito",
  titulo: "Simular otro plazo o un abono en un credito",
  descripcion:
    "Que pasa con un credito a plazo (personal, de nomina, de auto, hipotecario) si se paga distinto. " +
    "Contesta tres preguntas, una por llamada: 'quiero terminar en N meses' (`plazoObjetivoMeses`), " +
    "'puedo pagar X al mes' (`mensualidadObjetivoCentavos`) y 'abono X extra cada mes' " +
    "(`abonoExtraMensualCentavos`). Devuelve la mensualidad, el plazo, los intereses de los dos " +
    "escenarios y cuanto se ahorra. Es la UNICA fuente de esas cifras: nunca calcules una mensualidad " +
    "ni un plazo por tu cuenta. Para la TARJETA de credito usa simular_reestructura, no esta.",
  clase: "lectura",
  entrada: EntradaSimularCredito.shape,
  manejar: (argumentos) => {
    const entrada = EntradaSimularCredito.parse(argumentos);
    const credito = creditoDeLaEntrada(entrada.usuarioId, entrada.creditoId);

    if (credito.saldoInsolutoCentavos <= 0) {
      throw new Error(`el credito ${credito.id} ya esta liquidado: no hay nada que simular`);
    }

    const saldo = credito.saldoInsolutoCentavos;
    const tasa = credito.tasaAnual;
    const actual = planActualDe(credito);
    const escenario = escenarioDe(entrada, saldo, tasa, credito.mensualidadCentavos);
    const capacidad = capacidadPagoMensual(entrada.usuarioId);

    // Con `nuncaLiquida` no hay plazo ni intereses que reportar: se contesta el caso, no un
    // numero inventado para llenar el hueco.
    if (escenario.nuncaLiquida) {
      return SalidaSimularCredito.parse({
        ...comun(credito, actual, capacidad),
        mensualidadNuevaCentavos: escenario.pagoMensualCentavos,
        plazoNuevoMeses: 0,
        interesesNuevosCentavos: 0,
        ahorroInteresesCentavos: 0,
        mesesQueAdelanta: 0,
        diferenciaMensualCentavos: escenario.pagoMensualCentavos - credito.mensualidadCentavos,
        dentroDeCapacidad: escenario.pagoMensualCentavos <= capacidad,
        nuncaLiquida: true,
        amortizacionResumen: [],
        advertencia:
          "Con ese pago el saldo no baja: no alcanza a cubrir ni los intereses del mes. " +
          "Dilo tal cual y ofrece un pago mayor.",
      });
    }

    const ahorroIntereses = actual.interesesCentavos - escenario.interesesCentavos;
    const mesesQueAdelanta = actual.plazoMeses - escenario.plazoMeses;
    const diferenciaMensual = escenario.pagoMensualCentavos - credito.mensualidadCentavos;

    return SalidaSimularCredito.parse({
      ...comun(credito, actual, capacidad),
      mensualidadNuevaCentavos: escenario.pagoMensualCentavos,
      plazoNuevoMeses: escenario.plazoMeses,
      interesesNuevosCentavos: escenario.interesesCentavos,
      ahorroInteresesCentavos: ahorroIntereses,
      mesesQueAdelanta,
      diferenciaMensualCentavos: diferenciaMensual,
      dentroDeCapacidad: escenario.pagoMensualCentavos <= capacidad,
      nuncaLiquida: false,
      amortizacionResumen: resumenConFechas(escenario.filas, credito.fechaProximoPago),
      advertencia: advertenciaDe(escenario.pagoMensualCentavos, capacidad, ahorroIntereses),
    });
  },
};

/** Los campos que no dependen del escenario. */
function comun(credito: CreditoAPlazo, actual: PlanActual, capacidad: number) {
  return {
    creditoId: credito.id,
    alias: credito.alias,
    saldoInsolutoCentavos: credito.saldoInsolutoCentavos,
    tasaAnual: credito.tasaAnual,
    mensualidadActualCentavos: credito.mensualidadCentavos,
    plazoRestanteActualMeses: actual.plazoMeses,
    interesesActualesCentavos: actual.interesesCentavos,
    capacidadPagoMensualCentavos: capacidad,
  };
}

function creditoDeLaEntrada(usuarioId: string, creditoId: string | undefined): CreditoAPlazo {
  const creditos = creditosAPlazo(usuarioId);

  if (creditos.length === 0) {
    throw new Error(`${usuarioId} no tiene creditos a plazo que simular`);
  }
  if (!creditoId) return creditos[0]!;

  const exacto = creditos.find((c) => c.id === creditoId);
  if (!exacto) {
    throw new Error(`el credito ${creditoId} no es un credito a plazo de ${usuarioId}`);
  }
  return exacto;
}

type PlanActual = { plazoMeses: number; interesesCentavos: number };

/**
 * El plan vigente, tomado de la tabla real. Si por alguna razon el credito no trae
 * amortizacion cargada, se cae al calculo con el plazo restante: es peor que la tabla pero
 * mucho mejor que reportar cero intereses pendientes.
 */
function planActualDe(credito: CreditoAPlazo): PlanActual {
  const pendientes = proximosPagosDe(credito.id, 360);

  if (pendientes.length > 0) {
    return {
      plazoMeses: pendientes.length,
      interesesCentavos: pendientes.reduce((suma, p) => suma + p.interesCentavos + p.ivaInteresCentavos, 0),
    };
  }

  const plazo = Math.max(1, credito.pagosRestantes);
  return { plazoMeses: plazo, interesesCentavos: interesesDelPlazo(credito.saldoInsolutoCentavos, credito.tasaAnual, plazo) };
}

type Escenario = {
  pagoMensualCentavos: number;
  plazoMeses: number;
  interesesCentavos: number;
  nuncaLiquida: boolean;
  filas: FilaAmortizacion[];
};

/** Las tres direcciones de la misma amortizacion. */
function escenarioDe(
  entrada: EntradaSimularCredito,
  saldo: number,
  tasa: number,
  mensualidadActual: number,
): Escenario {
  if (entrada.plazoObjetivoMeses !== undefined) {
    const plazo = entrada.plazoObjetivoMeses;
    const cuota = mensualidad(saldo, tasa, plazo);
    return {
      pagoMensualCentavos: cuota,
      plazoMeses: plazo,
      interesesCentavos: interesesDelPlazo(saldo, tasa, plazo),
      nuncaLiquida: false,
      filas: tablaAmortizacion(saldo, tasa, plazo),
    };
  }

  const pago =
    entrada.mensualidadObjetivoCentavos ?? mensualidadActual + entrada.abonoExtraMensualCentavos!;
  return conPagoFijo(pago, mesesParaLiquidar(saldo, tasa, pago));
}

function conPagoFijo(pago: number, liquidacion: LiquidacionConPago): Escenario {
  return {
    pagoMensualCentavos: pago,
    plazoMeses: liquidacion.meses ?? 0,
    interesesCentavos: liquidacion.totalInteresesCentavos ?? 0,
    nuncaLiquida: liquidacion.nuncaLiquida,
    filas: liquidacion.filas,
  };
}

/**
 * Las primeras filas con su fecha. El calendario arranca en el proximo pago pactado: la
 * simulacion cambia cuanto se paga, no cuando toca.
 */
function resumenConFechas(filas: FilaAmortizacion[], fechaProximoPago: string) {
  return filas.slice(0, HITOS_DEL_RESUMEN).map((fila, i) => ({
    numeroPago: fila.numeroPago,
    fecha: fechaProximoPago ? sumarMeses(fechaProximoPago, i) : "",
    mensualidadCentavos: fila.mensualidadCentavos,
    capitalCentavos: fila.capitalCentavos,
    // Con IVA: es lo que de verdad sale de la cuenta, y separar los dos en la tarjeta
    // solo invita a que alguien sume mal.
    interesCentavos: fila.interesCentavos + fila.ivaInteresCentavos,
    saldoFinalCentavos: fila.saldoFinalCentavos,
  }));
}

function advertenciaDe(pago: number, capacidad: number, ahorroIntereses: number): string | null {
  if (pago > capacidad) {
    return (
      `Se puede, pero la mensualidad (${pago} centavos) pasa de su capacidad de pago ` +
      `(${capacidad} centavos). Dilo antes de recomendarlo.`
    );
  }
  if (ahorroIntereses < 0) {
    return `Este escenario sale MAS caro: paga ${Math.abs(ahorroIntereses)} centavos mas de intereses.`;
  }
  return null;
}
