import { aDecimal, aEntero, buscar, filtrar, type Fila } from "../datos/index.js";
import { abonoVigente, evaluarPedido, simularCredito, type BaseDeCredito, type Evaluacion, type PedidoDePago } from "./abonos.js";
import { pesos } from "./suscripciones.js";
import { mensualExternoDe } from "./gastos-externos.js";
import { sumarMeses } from "./tiempo.js";
import { capacidadPagoMensual, tarjetaConEstado, usuario, type PlanAplicado, type TarjetaVista } from "./consultas.js";

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
  /** Lo que paga al mes: la del contrato mas el abono a capital programado. */
  mensualidadCentavos: number;
  mensualidadContratoCentavos: number;
  /** Lo que va a capital cada mes encima del contrato (`programar_abono_capital`); 0 si no hay. */
  abonoMensualCentavos: number;
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

/**
 * Una fila de `creditos` con el estado encima. Sin abono programado sale identica a la
 * tabla. Con abono, la mensualidad es contrato + abono y los pagos restantes son los de
 * la simulacion (`docs/algoritmos/abono-a-capital.md`): el plazo del contrato no cambia,
 * lo que cambia es cuantos pagos faltan de verdad.
 */
function aCreditoAPlazo(fila: Fila): CreditoAPlazo {
  const plazoMeses = aEntero(fila.plazo_meses);
  const pagosRealizados = aEntero(fila.pagos_realizados);
  const producto = buscar("productos_credito", "id", fila.producto_id ?? "");
  const contrato = aEntero(fila.mensualidad_centavos);
  const abono = abonoVigente(fila.usuario_id ?? "", fila.id ?? "");
  const pagosRestantesContrato = Math.max(0, plazoMeses - pagosRealizados);
  const pagosRestantes =
    abono > 0
      ? (simularCredito(baseDeCredito(fila), contrato + abono)?.escenario.plazoRestanteMeses ?? pagosRestantesContrato)
      : pagosRestantesContrato;

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
    pagosRestantes,
    avancePct: plazoMeses === 0 ? 0 : Number((pagosRealizados / plazoMeses).toFixed(4)),
    mensualidadCentavos: contrato + abono,
    mensualidadContratoCentavos: contrato,
    abonoMensualCentavos: abono,
    fechaProximoPago: fila.fecha_proximo_pago ?? "",
    diasMora: aEntero(fila.dias_mora),
    estatus: fila.estatus ?? "vigente",
  };
}

/** Lo que la simulacion de abonos necesita de una fila de `creditos`. */
export function baseDeCredito(fila: Fila): BaseDeCredito {
  return {
    saldoInsolutoCentavos: aEntero(fila.saldo_insoluto_centavos),
    tasaAnual: aDecimal(fila.tasa_anual),
    mensualidadContratoCentavos: aEntero(fila.mensualidad_centavos),
    pagosRealizados: aEntero(fila.pagos_realizados),
    fechaProximoPago: fila.fecha_proximo_pago ?? "",
  };
}

export type CreditoConBase = { credito: CreditoAPlazo; base: BaseDeCredito };

/**
 * Un credito a plazo de la persona, con su base para simular. Falla con un motivo que el
 * agente puede leer si no es suyo o si es la tarjeta vista como credito (esa se paga por
 * `simular_reestructura`, no con abonos).
 */
export function creditoAPlazoDe(usuarioId: string, creditoId: string): CreditoConBase {
  const fila = filtrar("creditos", "usuario_id", usuarioId).find((c) => c.id === creditoId);
  if (!fila) throw new Error(`el credito ${creditoId} no es de ${usuarioId}`);
  if (fila.tarjeta_id) {
    throw new Error(
      `${creditoId} es la tarjeta de credito, no un credito a plazo: para su deuda usa simular_reestructura`,
    );
  }
  return { credito: aCreditoAPlazo(fila), base: baseDeCredito(fila) };
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
 *
 * **Con un abono a capital programado** la tabla del banco ya no es la verdad: las filas
 * salen de la simulacion con la cuota nueva. No hay dos versiones: con abono 0 la
 * simulacion da exactamente las filas de la tabla (`abonos.spec.ts`).
 */
export function proximosPagosDe(creditoId: string, cuantos: number): PagoDeAmortizacion[] {
  const fila = buscar("creditos", "id", creditoId);
  const abono = fila ? abonoVigente(fila.usuario_id ?? "", creditoId) : 0;
  if (fila && abono > 0) {
    const base = baseDeCredito(fila);
    const simulacion = simularCredito(base, base.mensualidadContratoCentavos + abono);
    if (simulacion) {
      return simulacion.filas.slice(0, cuantos).map((f, i) => ({
        numeroPago: base.pagosRealizados + f.numeroPago,
        fecha: sumarMeses(base.fechaProximoPago, i),
        mensualidadCentavos: f.mensualidadCentavos,
        capitalCentavos: f.capitalCentavos,
        interesCentavos: f.interesCentavos,
        ivaInteresCentavos: f.ivaInteresCentavos,
        saldoFinalCentavos: f.saldoFinalCentavos,
        estatus: "pendiente",
      }));
    }
  }

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

/* --- Cuanto aguanta la persona al mes ---------------------------------------- */

/**
 * El techo de lo que la persona puede pagar al mes en deuda, TODA junta.
 *
 * Ojo con `buro.capacidad_pago_mensual_centavos`: no es el techo, es lo que QUEDA libre
 * (35 % del ingreso menos lo ya comprometido, `docs/como-funciona/base-de-datos.md`).
 * Compararla contra la mensualidad total avisaria siempre a Carmen, que ya compromete
 * $31,429 contra $8,820 de holgura. El techo es lo comprometido mas lo que queda libre.
 * Sin buro, el 35 % del ingreso con el que se generaron los datos.
 *
 * Los gastos mensuales de fuera del banco (`registrar_gasto_externo`) bajan el techo: ya
 * vienen restados en `capacidadPagoMensual`, y en el caso sin buro se restan aqui.
 */
export function techoDeDeudaMensual(usuarioId: string): number {
  const buro = buscar("buro", "usuario_id", usuarioId);
  if (buro) return aEntero(buro.pago_mensual_comprometido_centavos) + capacidadPagoMensual(usuarioId);
  return Math.round(aEntero(usuario(usuarioId).ingreso_mensual_centavos) * 0.35) - mensualExternoDe(usuarioId);
}

export type CargaDeDeuda = {
  capacidadPagoMensualCentavos: number;
  mensualidadDeudaTotalCentavos: number;
  pctDelIngreso: number;
  /** La frase para la tarjeta si rebasa el techo; null si cabe. */
  aviso: string | null;
};

/**
 * Lo que pagaria al mes de deuda si ese credito pasara a `mensualidadNuevaCentavos`,
 * con todo lo demas igual (tarjeta y plan incluidos). Se avisa, no se bloquea: quien
 * decide es la persona.
 */
export function cargaDeDeudaCon(usuarioId: string, creditoId: string, mensualidadNuevaCentavos: number): CargaDeDeuda {
  const resumen = resumenDeDeuda(usuarioId);
  const hoyEnEseCredito = resumen.creditos.find((c) => c.id === creditoId)?.mensualidadCentavos ?? 0;
  const total = resumen.mensualidadTotalCentavos - hoyEnEseCredito + mensualidadNuevaCentavos;
  const ingreso = aEntero(usuario(usuarioId).ingreso_mensual_centavos);
  const techo = techoDeDeudaMensual(usuarioId);
  const pct = ingreso === 0 ? 0 : Number((total / ingreso).toFixed(4));

  return {
    capacidadPagoMensualCentavos: techo,
    mensualidadDeudaTotalCentavos: total,
    pctDelIngreso: pct,
    aviso:
      total > techo
        ? `Pagarías ${pesos(total)} al mes de deuda (${porcentaje(pct)} de tu ingreso): rebasa tu capacidad ` +
          `estimada de ${pesos(techo)}.`
        : null,
  };
}

function porcentaje(fraccion: number): string {
  return `${(fraccion * 100).toFixed(1).replace(/\.0$/, "")} %`;
}

/* --- Pagar distinto un credito a plazo (abono a capital) ---------------------- */

/**
 * «¿Y si pago distinto?»: `actual` (con el abono ya programado) contra lo pedido, con la
 * carga de deuda. La comparten `simular_pago_credito` y `programar_abono_capital`, que
 * re-simula antes de guardar: las dos no pueden discrepar.
 */
export function compararPago(
  usuarioId: string,
  credito: CreditoAPlazo,
  base: BaseDeCredito,
  pedido: PedidoDePago,
) {
  if (credito.saldoInsolutoCentavos <= 0) throw new Error(`el credito ${credito.id} ya esta liquidado`);

  const actual = simularCredito(base, credito.mensualidadCentavos);
  if (!actual) throw new Error(`la mensualidad de ${credito.id} no cubre sus intereses: no se puede simular`);

  const evaluacion: Evaluacion = evaluarPedido(base, pedido);
  const simulado = evaluacion.simulacion?.escenario ?? null;
  const carga = cargaDeDeudaCon(usuarioId, credito.id, simulado?.mensualidadCentavos ?? credito.mensualidadCentavos);

  return {
    actual: actual.escenario,
    evaluacion,
    ahorroInteresesCentavos: simulado
      ? actual.escenario.totalInteresesEstimadosCentavos - simulado.totalInteresesEstimadosCentavos
      : 0,
    mesesMenos: simulado ? actual.escenario.plazoRestanteMeses - simulado.plazoRestanteMeses : 0,
    // Sin escenario posible no hay riesgo que avisar: el motivo ya dice por que no.
    carga: simulado ? carga : { ...carga, aviso: null },
  };
}
