import { aDecimal, aEntero, buscar, filtrar, type Fila } from "../datos/index.js";
import { tarjetaConEstado, usuario, type PlanAplicado, type TarjetaVista } from "./consultas.js";

/**
 * La deuda a plazo fijo: creditos personales, de nomina, de auto e hipotecarios.
 *
 * **La trampa que este modulo existe para evitar**: en los datos, la tarjeta de credito
 * aparece TAMBIEN como una fila de `creditos` (`cred_beto_tdc`, con `tarjeta_id` lleno).
 * Quien sume la tabla completa y ademas lea `consultar_tarjeta` cuenta la deuda de Beto
 * dos veces. Aqui las filas con `tarjeta_id` se separan en cuanto se leen, y la tarjeta
 * se toma de `tarjetaConEstado()`, que es la unica version de la verdad porque refleja el
 * plan aplicado.
 *
 * Invariante que lo respalda: la suma de `saldo_insoluto_centavos` de TODAS las filas de
 * `creditos` de una persona es su `buro.deuda_total_centavos`. Beto: 2,954,065 del credito
 * de nomina mas 4,738,600 de la tarjeta son los 7,692,665 que reporta buro.
 */

export type CreditoAPlazo = {
  id: string;
  alias: string;
  tipo: string;
  producto: string;
  montoOriginalCentavos: number;
  saldoInsolutoCentavos: number;
  tasaAnual: number;
  cat: number;
  plazoMeses: number;
  pagosRealizados: number;
  pagosRestantes: number;
  avancePct: number;
  mensualidadCentavos: number;
  fechaProximoPago: string;
  diasMora: number;
  estatus: string;
};

/**
 * Los creditos a plazo de la persona, **sin la tarjeta**. Una fila con `tarjeta_id` es
 * la tarjeta vista como credito; se excluye aqui y se reporta por su propio camino.
 */
export function creditosAPlazo(usuarioId: string): CreditoAPlazo[] {
  return filtrar("creditos", "usuario_id", usuarioId)
    .filter((c) => !c.tarjeta_id)
    .map(aCreditoAPlazo)
    .sort((a, b) => b.saldoInsolutoCentavos - a.saldoInsolutoCentavos);
}

function aCreditoAPlazo(fila: Fila): CreditoAPlazo {
  const plazoMeses = aEntero(fila.plazo_meses);
  const pagosRealizados = aEntero(fila.pagos_realizados);
  const producto = buscar("productos_credito", "id", fila.producto_id ?? "");

  return {
    id: fila.id ?? "",
    alias: fila.alias ?? "",
    tipo: producto?.tipo ?? "personal",
    producto: producto?.nombre ?? fila.alias ?? "",
    montoOriginalCentavos: aEntero(fila.monto_original_centavos),
    saldoInsolutoCentavos: aEntero(fila.saldo_insoluto_centavos),
    tasaAnual: aDecimal(fila.tasa_anual),
    cat: aDecimal(fila.cat),
    plazoMeses,
    pagosRealizados,
    pagosRestantes: Math.max(0, plazoMeses - pagosRealizados),
    avancePct: plazoMeses === 0 ? 0 : Number((pagosRealizados / plazoMeses).toFixed(4)),
    mensualidadCentavos: aEntero(fila.mensualidad_centavos),
    fechaProximoPago: fila.fecha_proximo_pago ?? "",
    diasMora: aEntero(fila.dias_mora),
    estatus: fila.estatus ?? "vigente",
  };
}

export type PagoDeAmortizacion = {
  numeroPago: number;
  fecha: string;
  mensualidadCentavos: number;
  capitalCentavos: number;
  interesCentavos: number;
  ivaInteresCentavos: number;
  saldoFinalCentavos: number;
  estatus: string;
};

/**
 * Los proximos pagos de un credito, tomados de la tabla real y no recalculados: los
 * datos ya traen la amortizacion con cuales estan pagados. Recalcularla daria numeros
 * parecidos pero distintos, y dos versiones de la verdad sobre lo mismo.
 */
export function proximosPagosDe(creditoId: string, cuantos: number): PagoDeAmortizacion[] {
  return filtrar("amortizaciones", "credito_id", creditoId)
    .filter((a) => a.estatus !== "pagado")
    .sort((a, b) => aEntero(a.numero_pago) - aEntero(b.numero_pago))
    .slice(0, cuantos)
    .map((a) => ({
      numeroPago: aEntero(a.numero_pago),
      fecha: a.fecha ?? "",
      mensualidadCentavos: aEntero(a.mensualidad_centavos),
      capitalCentavos: aEntero(a.capital_centavos),
      interesCentavos: aEntero(a.interes_centavos),
      ivaInteresCentavos: aEntero(a.iva_interes_centavos),
      saldoFinalCentavos: aEntero(a.saldo_final_centavos),
      estatus: a.estatus ?? "pendiente",
    }));
}

export type DeudaDeLaTarjeta = {
  vista: TarjetaVista;
  plan: PlanAplicado | null;
  /** Lo que se debe hoy: el revolvente, o el saldo que quedo diferido si hay plan. */
  saldoCentavos: number;
  /** Lo que se paga al mes: el minimo, o la mensualidad del plan si hay plan. */
  mensualidadCentavos: number;
};

/**
 * La tarjeta como deuda. Aplicar un plan no borra lo que se debe: lo convierte en un
 * saldo diferido con mensualidad fija. Reportar cero seria decirle a la persona que su
 * deuda desaparecio por reestructurar.
 */
export function deudaDeLaTarjeta(usuarioId: string): DeudaDeLaTarjeta | null {
  const conEstado = tarjetaConEstado(usuarioId);
  if (!conEstado) return null;

  const { vista, plan } = conEstado;
  return {
    vista,
    plan,
    saldoCentavos: plan ? plan.saldoDiferidoCentavos : vista.saldoCentavos,
    mensualidadCentavos: plan ? plan.mensualidadCentavos : vista.pagoMinimoCentavos,
  };
}

export type ResumenDeDeuda = {
  creditos: CreditoAPlazo[];
  tarjeta: DeudaDeLaTarjeta | null;
  deudaCreditosCentavos: number;
  deudaTarjetaCentavos: number;
  deudaTotalCentavos: number;
  mensualidadTotalCentavos: number;
  ratioDeudaIngreso: number;
};

/**
 * Todo lo que la persona debe y lo que le cuesta al mes. Lo usan `consultar_creditos`
 * y `panorama_inicial`, y tienen que contestar lo mismo: por eso vive aqui.
 */
export function resumenDeDeuda(usuarioId: string): ResumenDeDeuda {
  const creditos = creditosAPlazo(usuarioId);
  const tarjeta = deudaDeLaTarjeta(usuarioId);

  const deudaCreditos = creditos.reduce((suma, c) => suma + c.saldoInsolutoCentavos, 0);
  const deudaTarjeta = tarjeta?.saldoCentavos ?? 0;
  const mensualidad =
    creditos.reduce((suma, c) => suma + c.mensualidadCentavos, 0) + (tarjeta?.mensualidadCentavos ?? 0);

  const ingreso = aEntero(usuario(usuarioId).ingreso_mensual_centavos);

  return {
    creditos,
    tarjeta,
    deudaCreditosCentavos: deudaCreditos,
    deudaTarjetaCentavos: deudaTarjeta,
    deudaTotalCentavos: deudaCreditos + deudaTarjeta,
    mensualidadTotalCentavos: mensualidad,
    ratioDeudaIngreso: ingreso === 0 ? 0 : Number((mensualidad / ingreso).toFixed(4)),
  };
}

/**
 * El credito mas caro por CAT, con la tarjeta compitiendo: casi siempre gana ella
 * (62.1 % contra 33 % del credito de nomina de Beto) y por eso es la que conviene
 * liquidar primero. Es el orden que el agente puede recomendar sin inventarse nada.
 */
export function creditoMasCaroId(resumen: ResumenDeDeuda): string | null {
  const candidatos: Array<{ id: string; cat: number }> = resumen.creditos
    .filter((c) => c.saldoInsolutoCentavos > 0)
    .map((c) => ({ id: c.id, cat: c.cat }));

  if (resumen.tarjeta && resumen.deudaTarjetaCentavos > 0) {
    // Con un plan aplicado la tasa que aplica es la del plan, no la de la tarjeta.
    const cat = resumen.tarjeta.plan ? resumen.tarjeta.plan.cat : resumen.tarjeta.vista.cat;
    candidatos.push({ id: resumen.tarjeta.vista.id, cat });
  }

  return candidatos.sort((a, b) => b.cat - a.cat)[0]?.id ?? null;
}
