import { EntradaConsultarCreditos, SalidaConsultarCreditos } from "@maya/schemas";
import { creditoMasCaroId, proximosPagosDe, resumenDeDeuda, type CreditoAPlazo } from "../dominio/creditos.js";
import type { DefinicionDeTool } from "./registro.js";

/** Cuantos pagos futuros se devuelven cuando se pide la amortizacion. */
const PAGOS_POR_DEFECTO = 3;

/**
 * `consultar_creditos` — LECTURA. Toda la deuda, no solo la tarjeta.
 *
 * Es la tool que arregla una respuesta equivocada: sin ella, si Ana pregunta "¿cuanto
 * debo?" el agente solo ve el saldo revolvente y contesta cero, cuando trae $55,783 de
 * credito personal. Beto debe $76,926 entre su credito de nomina y la tarjeta, no los
 * $47,386 de la tarjeta sola.
 *
 * La tarjeta se reporta aparte y con el estado encima: si ya hay un plan aplicado, lo
 * que se debe es el saldo diferido y lo que se paga al mes es la mensualidad del plan.
 */
export const consultarCreditos: DefinicionDeTool = {
  nombre: "consultar_creditos",
  titulo: "Consultar todos los creditos",
  descripcion:
    "La deuda COMPLETA de la persona: creditos personales, de nomina, de auto e hipotecarios, mas la " +
    "tarjeta. Devuelve el total, lo que paga al mes, que fraccion de su ingreso se le va en deuda y cual " +
    "es el credito mas caro por CAT (el que conviene liquidar primero). Usala cuando pregunten cuanto " +
    "deben en total, por sus pagos del mes, o antes de proponer cualquier cosa que compita por su " +
    "capacidad de pago. Para el detalle de la tarjeta sola usa `consultar_tarjeta`.",
  clase: "lectura",
  entrada: EntradaConsultarCreditos.shape,
  manejar: (argumentos) => {
    const entrada = EntradaConsultarCreditos.parse(argumentos);
    const resumen = resumenDeDeuda(entrada.usuarioId);

    let creditos = resumen.creditos;
    if (entrada.creditoId) {
      const exacto = creditos.find((c) => c.id === entrada.creditoId);
      if (!exacto) throw new Error(`el credito ${entrada.creditoId} no es de ${entrada.usuarioId}`);
      creditos = [exacto];
    }

    const cuantos = entrada.proximosPagos ?? PAGOS_POR_DEFECTO;
    const conAmortizacion = creditos.map((credito) => ({
      ...credito,
      amortizacion: entrada.incluirAmortizacion ? proximosPagosDe(credito.id, cuantos) : [],
    }));

    // Los totales describen SIEMPRE toda la deuda, tambien cuando se filtro por un
    // credito: "¿cuanto debo?" no cambia de respuesta porque el agente pida el detalle
    // de uno solo.
    return SalidaConsultarCreditos.parse({
      deudaTotalCentavos: resumen.deudaTotalCentavos,
      deudaCreditosCentavos: resumen.deudaCreditosCentavos,
      deudaTarjetaCentavos: resumen.deudaTarjetaCentavos,
      mensualidadTotalCentavos: resumen.mensualidadTotalCentavos,
      ratioDeudaIngreso: resumen.ratioDeudaIngreso,
      creditos: conAmortizacion,
      tarjeta: resumen.tarjeta
        ? {
            id: resumen.tarjeta.vista.id,
            producto: resumen.tarjeta.vista.producto,
            saldoCentavos: resumen.tarjeta.saldoCentavos,
            mensualidadCentavos: resumen.tarjeta.mensualidadCentavos,
            tienePlanActivo: resumen.tarjeta.plan !== null,
            diasMora: resumen.tarjeta.vista.diasMora,
          }
        : null,
      creditoMasCaroId: creditoMasCaroId(resumen),
      proximoPago: proximoPagoDe(resumen.creditos),
    });
  },
};

/** El pago mas cercano entre todos los creditos a plazo. La tarjeta tiene su propia fecha limite. */
function proximoPagoDe(creditos: CreditoAPlazo[]) {
  const siguiente = creditos
    .filter((c) => c.fechaProximoPago && c.saldoInsolutoCentavos > 0)
    .sort((a, b) => a.fechaProximoPago.localeCompare(b.fechaProximoPago))[0];

  if (!siguiente) return null;
  return {
    creditoId: siguiente.id,
    alias: siguiente.alias,
    fecha: siguiente.fechaProximoPago,
    montoCentavos: siguiente.mensualidadCentavos,
  };
}
