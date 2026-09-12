import { EntradaConsultarPlan, SalidaConsultarPlan } from "@maya/schemas";
import { planAplicado, type PlanAplicado } from "../dominio/consultas.js";
import { tablaAmortizacion } from "../dominio/finanzas.js";
import { sumarMeses } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_plan` — LECTURA. La otra mitad del ciclo: antes de la accion devuelve
 * `hayPlan: false`; despues, el plan y su calendario real de pagos. Es la tool con la
 * que el agente puede demostrar en pantalla que algo cambio de verdad.
 */
export const consultarPlan: DefinicionDeTool = {
  nombre: "consultar_plan",
  titulo: "Consultar el plan de pago activo",
  descripcion:
    "Devuelve el plan de pago que la persona YA aplico y su calendario de pagos (fecha, mensualidad, " +
    "cuanto es capital y cuanto interes). Si todavia no aplica ninguno devuelve `hayPlan: false`. " +
    "Llamala despues de `aplicar_plan_pago` para pintar la confirmacion y el calendario, o cuando " +
    "pregunten '¿como va mi plan?'.",
  clase: "lectura",
  entrada: EntradaConsultarPlan.shape,
  manejar: (argumentos) => {
    const { usuarioId, incluirCalendario = true } = EntradaConsultarPlan.parse(argumentos);
    const plan = planAplicado(usuarioId);

    if (!plan) {
      return SalidaConsultarPlan.parse({ hayPlan: false, plan: null, calendario: [] });
    }

    const calendario = calendarioDe(plan);
    return SalidaConsultarPlan.parse({
      hayPlan: true,
      plan: {
        id: plan.id,
        tarjetaId: plan.tarjetaId,
        plazoMeses: plan.plazoMeses,
        tasaAnual: plan.tasaAnual,
        cat: plan.cat,
        saldoDiferidoCentavos: plan.saldoDiferidoCentavos,
        mensualidadCentavos: plan.mensualidadCentavos,
        totalAPagarCentavos: plan.totalAPagarCentavos,
        interesesTotalesCentavos: plan.interesesTotalesCentavos,
        ahorroVsMinimoCentavos: plan.ahorroVsMinimoCentavos,
        aplicadoEn: plan.aplicadoEn,
        primerPagoFecha: plan.primerPagoFecha,
        ultimoPagoFecha: calendario.at(-1)?.fecha ?? plan.primerPagoFecha,
      },
      calendario: incluirCalendario ? calendario : [],
    });
  },
};

/**
 * El calendario es la tabla de amortizacion del plan con una fecha por pago: el mismo
 * dia de cada mes a partir del primer pago. No se guarda en el estado porque es una
 * funcion del plan: guardarla seria tener dos versiones de la verdad.
 */
export function calendarioDe(plan: PlanAplicado): Array<{
  numeroPago: number;
  fecha: string;
  mensualidadCentavos: number;
  capitalCentavos: number;
  interesCentavos: number;
  ivaInteresCentavos: number;
  saldoFinalCentavos: number;
}> {
  return tablaAmortizacion(plan.saldoDiferidoCentavos, plan.tasaAnual, plan.plazoMeses).map((fila) => ({
    numeroPago: fila.numeroPago,
    fecha: sumarMeses(plan.primerPagoFecha, fila.numeroPago - 1),
    mensualidadCentavos: fila.mensualidadCentavos,
    capitalCentavos: fila.capitalCentavos,
    interesCentavos: fila.interesCentavos,
    ivaInteresCentavos: fila.ivaInteresCentavos,
    saldoFinalCentavos: fila.saldoFinalCentavos,
  }));
}
