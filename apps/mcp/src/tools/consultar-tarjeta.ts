import { EntradaConsultarTarjeta, SalidaConsultarTarjeta } from "@maya/schemas";
import { aEntero, filtrar } from "../datos/index.js";
import { tarjetaConEstado } from "../dominio/consultas.js";
import { hoy, sumarDias } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `consultar_tarjeta` — LECTURA. Le dice al agente si la persona esta atorada o no,
 * y por lo tanto si la pantalla que tiene que construir es una de reestructura o
 * cualquier otra cosa.
 *
 * Refleja el estado: despues de `aplicar_plan_pago`, el saldo revolvente es cero, el
 * limite esta libre y `planActivo` trae la mensualidad. Esa diferencia entre dos
 * llamadas identicas es el "cambio real" que pide el reto.
 */
export const consultarTarjeta: DefinicionDeTool = {
  nombre: "consultar_tarjeta",
  titulo: "Consultar la tarjeta de credito",
  descripcion:
    "Devuelve el estado de la tarjeta de credito: limite, saldo, uso del limite, tasa, pago minimo, " +
    "dias de mora, lo que se fue en intereses el ultimo mes y si ya hay un plan de pago activo. " +
    "`tarjeta: null` significa que la persona NO tiene tarjeta de credito: no le ofrezcas reestructurar, " +
    "ofrecele otra cosa. Llamala antes de decidir cualquier pantalla sobre deuda.",
  clase: "lectura",
  entrada: EntradaConsultarTarjeta.shape,
  manejar: (argumentos) => {
    const { usuarioId, tarjetaId } = EntradaConsultarTarjeta.parse(argumentos);
    const conEstado = tarjetaConEstado(usuarioId, tarjetaId);

    if (!conEstado) {
      return SalidaConsultarTarjeta.parse({
        tarjeta: null,
        interesesUltimoMesCentavos: 0,
        planActivo: null,
        alerta: "sin_tarjeta_credito",
      });
    }

    const { vista, plan } = conEstado;
    return SalidaConsultarTarjeta.parse({
      tarjeta: {
        id: vista.id,
        marca: vista.marca,
        producto: vista.producto,
        mascara: vista.mascara,
        limiteCentavos: vista.limiteCentavos,
        saldoCentavos: vista.saldoCentavos,
        usoDelLimite: vista.usoDelLimite,
        tasaAnual: vista.tasaAnual,
        cat: vista.cat,
        pagoMinimoCentavos: vista.pagoMinimoCentavos,
        fechaLimitePago: vista.fechaLimitePago,
        diasMora: vista.diasMora,
        estatus: vista.estatus,
      },
      interesesUltimoMesCentavos: interesesDelUltimoMes(usuarioId),
      planActivo: plan
        ? {
            id: plan.id,
            plazoMeses: plan.plazoMeses,
            mensualidadCentavos: plan.mensualidadCentavos,
            tasaAnual: plan.tasaAnual,
            cat: plan.cat,
            saldoDiferidoCentavos: plan.saldoDiferidoCentavos,
            aplicadoEn: plan.aplicadoEn,
            primerPagoFecha: plan.primerPagoFecha,
          }
        : null,
      alerta: alertaDe(vista, plan !== null),
    });
  },
};

/**
 * El orden importa: el agente lee la primera razon para preocuparse, no todas. La mora
 * gana sobre el uso del limite porque es la que cuesta dinero hoy.
 */
function alertaDe(vista: { diasMora: number; usoDelLimite: number }, hayPlan: boolean): string {
  if (vista.diasMora > 0) return "mora";
  if (hayPlan) return "plan_activo";
  if (vista.usoDelLimite >= 0.9) return "al_limite";
  if (vista.usoDelLimite >= 0.5) return "uso_alto";
  return "saludable";
}

/** Cargos de la categoria `cat_financiero` (intereses y comisiones) en 30 dias. */
function interesesDelUltimoMes(usuarioId: string): number {
  const desde = sumarDias(hoy(), -30);
  return filtrar("movimientos", "usuario_id", usuarioId)
    .filter((m) => m.categoria_id === "cat_financiero" && m.tipo === "cargo" && (m.fecha ?? "") >= desde)
    .reduce((suma, m) => suma + aEntero(m.monto_centavos), 0);
}
