import { EntradaAplicarPlanPago, SalidaAplicarPlanPago } from "@maya/schemas";
import { aplicarAccion } from "../datos/index.js";
import {
  capacidadPagoMensual,
  planAplicado,
  primerPagoDesde,
  tarjetaConEstado,
  tasaParaPlazo,
  type PlanAplicado,
} from "../dominio/consultas.js";
import { escenarioPagoMinimo, interesesMensualesRevolventes, ofertaReestructura } from "../dominio/finanzas.js";
import { hoy, sumarMeses } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `aplicar_plan_pago` — **ACCION**. El flujo accionable con cambio real que el reto
 * exige: el saldo revolvente se convierte en mensualidades fijas y `consultar_tarjeta`
 * devuelve otra cosa a partir de este momento.
 *
 * Es idempotente por `idempotencyKey` y **no aplica dos planes**: si ya hay uno, lo
 * devuelve sin cambiar nada. Un reintento del agente no puede endeudar a nadie dos veces.
 */
export const aplicarPlanPago: DefinicionDeTool = {
  nombre: "aplicar_plan_pago",
  titulo: "Aplicar el plan de pago elegido",
  descripcion:
    "APLICA de verdad el plan de reestructura que la persona eligio: difiere el saldo de la tarjeta al " +
    "plazo indicado. Cambia el estado. Llamala SOLO cuando te llegue la accion `aplicar_plan_pago` desde " +
    "la interfaz, con el plazo que la persona confirmo, y pasa siempre `idempotencyKey`. Despues llama " +
    "`consultar_plan` o `consultar_tarjeta` y pinta el resultado: ahi se cierra el ciclo.",
  clase: "accion",
  entrada: EntradaAplicarPlanPago.shape,
  manejar: (argumentos) => {
    const entrada = EntradaAplicarPlanPago.parse(argumentos);
    const conEstado = tarjetaConEstado(entrada.usuarioId, entrada.tarjetaId);
    if (!conEstado) throw new Error(`${entrada.usuarioId} no tiene tarjeta de credito que reestructurar`);

    const { vista } = conEstado;
    const yaHabia = planAplicado(entrada.usuarioId);
    if (yaHabia) {
      return respuesta(yaHabia, vista, false, true, mensajeDeRepetido(yaHabia));
    }
    if (vista.saldoOriginalCentavos <= 0) throw new Error(`la tarjeta ${vista.id} no tiene saldo que diferir`);

    const tasaPlan = tasaParaPlazo(vista.id, entrada.plazoMeses, vista.tasaAnual);
    const oferta = ofertaReestructura({
      saldoCentavos: vista.saldoOriginalCentavos,
      tasaPlan,
      plazoMeses: entrada.plazoMeses,
      tasaTarjeta: vista.tasaAnual,
      minimo: escenarioPagoMinimo(vista.saldoOriginalCentavos, vista.tasaAnual),
    });

    // Se avisa pero no se bloquea: quien decide es la persona, no la tool. El agente
    // tiene el dato para decirselo en pantalla.
    const capacidad = capacidadPagoMensual(entrada.usuarioId);
    const aprieta = oferta.mensualidadCentavos > capacidad;

    const aplicadaEn = new Date().toISOString();
    const plan: PlanAplicado = {
      id: `plan_${vista.id.replace("tar_", "")}_${entrada.plazoMeses}m`,
      tarjetaId: vista.id,
      plazoMeses: entrada.plazoMeses,
      tasaAnual: tasaPlan,
      cat: oferta.cat,
      saldoDiferidoCentavos: oferta.saldoADiferirCentavos,
      mensualidadCentavos: oferta.mensualidadCentavos,
      totalAPagarCentavos: oferta.totalAPagarCentavos,
      interesesTotalesCentavos: oferta.interesesTotalesCentavos,
      ahorroVsMinimoCentavos: oferta.ahorroVsMinimoCentavos,
      aplicadoEn: aplicadaEn,
      primerPagoFecha: primerPagoDesde(hoy()),
    };

    const resultado = aplicarAccion({
      id: `acc_${entrada.usuarioId}_${entrada.plazoMeses}m_${Date.now()}`,
      tipo: "aplicar_plan_pago",
      usuarioId: entrada.usuarioId,
      idempotencyKey: entrada.idempotencyKey,
      aplicadaEn,
      datos: plan as unknown as Record<string, unknown>,
    });

    const mensaje = resultado.yaEstaba
      ? "Este plan ya se habia aplicado con la misma llave; no se aplico dos veces."
      : `Listo: tu saldo de ${pesos(plan.saldoDiferidoCentavos)} quedo diferido a ${plan.plazoMeses} meses de ` +
        `${pesos(plan.mensualidadCentavos)}. Tu primer pago es el ${plan.primerPagoFecha}.` +
        (aprieta ? ` Ojo: esa mensualidad esta arriba de tu capacidad estimada (${pesos(capacidad)}).` : "");

    return respuesta(plan, vista, resultado.aplicado, resultado.yaEstaba, mensaje);
  },
};

function respuesta(
  plan: PlanAplicado,
  vista: { limiteCentavos: number; saldoOriginalCentavos: number; tasaAnual: number },
  aplicado: boolean,
  yaEstaba: boolean,
  mensaje: string,
) {
  const usoAntes = vista.limiteCentavos === 0 ? 0 : Number((vista.saldoOriginalCentavos / vista.limiteCentavos).toFixed(4));
  return SalidaAplicarPlanPago.parse({
    aplicado,
    yaEstaba,
    mensaje,
    plan: {
      id: plan.id,
      plazoMeses: plan.plazoMeses,
      tasaAnual: plan.tasaAnual,
      cat: plan.cat,
      saldoDiferidoCentavos: plan.saldoDiferidoCentavos,
      mensualidadCentavos: plan.mensualidadCentavos,
      totalAPagarCentavos: plan.totalAPagarCentavos,
      ahorroVsMinimoCentavos: plan.ahorroVsMinimoCentavos,
      primerPagoFecha: plan.primerPagoFecha,
      ultimoPagoFecha: sumarMeses(plan.primerPagoFecha, plan.plazoMeses - 1),
    },
    efecto: {
      saldoRevolventeAntesCentavos: vista.saldoOriginalCentavos,
      saldoRevolventeDespuesCentavos: 0,
      usoDelLimiteAntes: usoAntes,
      usoDelLimiteDespues: 0,
      interesesMensualesEvitadosCentavos: interesesMensualesRevolventes(
        vista.saldoOriginalCentavos,
        vista.tasaAnual,
      ),
    },
  });
}

function mensajeDeRepetido(plan: PlanAplicado): string {
  return (
    `Ya tienes un plan activo de ${plan.plazoMeses} meses a ${pesos(plan.mensualidadCentavos)} al mes; ` +
    "no se aplico otro. Si quieres cambiarlo hay que cancelar el actual."
  );
}

/** Solo para los mensajes que el agente parafrasea; la UI formatea por su cuenta. */
function pesos(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}
