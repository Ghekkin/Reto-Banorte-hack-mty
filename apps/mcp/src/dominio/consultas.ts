import { aBooleano, aDecimal, aEntero, accionesDe, buscar, filtrar, tabla, type Fila } from "../datos/index.js";
import { interesesMensualesRevolventes, tasaDelPlan } from "./finanzas.js";
import { mensualExternoDe } from "./gastos-externos.js";
import { sumarMeses } from "./tiempo.js";

/**
 * Las consultas que mas de una tool necesita. Vive aqui y no en cada tool para que
 * dos tools nunca contesten cosas distintas sobre el mismo dato (skill `tool-mcp`).
 *
 * Nada de esto habla con el modelo: son funciones sobre las tablas y el estado mutable.
 */

export function usuario(usuarioId: string): Fila {
  const fila = buscar("usuarios", "id", usuarioId);
  if (!fila) throw new Error(`no existe el usuario ${usuarioId}`);
  return fila;
}

/**
 * La tarjeta de credito de la persona. `undefined` si solo trae debito (Ana).
 *
 * Con `tarjetaId` se exige que sea suya Y de credito: una de debito tiene limite 0 y tasa
 * 0, y devolverla como si fuera de credito le diria al agente "saludable" sobre una
 * tarjeta que no puede tener deuda.
 */
export function tarjetaDeCredito(usuarioId: string, tarjetaId?: string): Fila | undefined {
  const suyas = filtrar("tarjetas", "usuario_id", usuarioId);
  if (tarjetaId) {
    const exacta = suyas.find((t) => t.id === tarjetaId);
    if (!exacta) throw new Error(`la tarjeta ${tarjetaId} no es de ${usuarioId}`);
    if (exacta.tipo !== "credito") throw new Error(`la tarjeta ${tarjetaId} es de debito: no tiene deuda que consultar`);
    return exacta;
  }
  return suyas.find((t) => t.tipo === "credito" && t.estatus === "activa");
}

/** Todas las cuentas activas de la persona. */
export function cuentasDe(usuarioId: string): Fila[] {
  return filtrar("cuentas", "usuario_id", usuarioId).filter((c) => c.estatus === "activa");
}

export function cuentaDe(usuarioId: string, tipo: string): Fila | undefined {
  return filtrar("cuentas", "usuario_id", usuarioId).find((c) => c.tipo === tipo && c.estatus === "activa");
}

export function categoria(categoriaId: string): Fila | undefined {
  return buscar("categorias", "id", categoriaId);
}

export function nombreDeComercio(comercioId: string): string {
  if (!comercioId) return "";
  return buscar("comercios", "id", comercioId)?.nombre ?? "";
}

/**
 * Lo que buro dice que la persona puede pagar al mes sin apretarse, **menos lo que ya paga
 * cada mes fuera del banco** (`registrar_gasto_externo`, solo lo mensual): la renta en
 * efectivo que buro no ve compite por el mismo dinero. Puede quedar negativa, como la
 * columna de buro en alguien sobreendeudado (`docs/como-funciona/base-de-datos.md`).
 * Sin gastos guardados, es exactamente la de buro.
 */
export function capacidadPagoMensual(usuarioId: string): number {
  return capacidadPagoDeBuro(usuarioId) - mensualExternoDe(usuarioId);
}

/** La capacidad tal cual la reporta buro, sin gastos de fuera del banco. */
function capacidadPagoDeBuro(usuarioId: string): number {
  const fila = buscar("buro", "usuario_id", usuarioId);
  if (fila) return aEntero(fila.capacidad_pago_mensual_centavos);
  // Sin buro: 30 % del ingreso, el limite prudencial de siempre.
  return Math.round(aEntero(usuario(usuarioId).ingreso_mensual_centavos) * 0.3);
}

/* --- Planes de reestructura ------------------------------------------------- */

export type OfertaDelBanco = { plazoMeses: number; tasaAnual: number; esRecomendado: boolean };

/** Los plazos que el banco ya tiene cotizados para esa tarjeta (dato, no formula). */
export function ofertasDelBanco(tarjetaId: string): OfertaDelBanco[] {
  return filtrar("planes_reestructura", "tarjeta_id", tarjetaId)
    .map((p) => ({
      plazoMeses: aEntero(p.plazo_meses),
      tasaAnual: aDecimal(p.tasa_anual),
      esRecomendado: aBooleano(p.es_recomendado),
    }))
    .sort((a, b) => a.plazoMeses - b.plazoMeses);
}

/** La tasa que se cotiza para un plazo: la del banco si existe, si no la de respaldo. */
export function tasaParaPlazo(tarjetaId: string, plazoMeses: number, tasaTarjeta: number): number {
  const delBanco = ofertasDelBanco(tarjetaId).find((o) => o.plazoMeses === plazoMeses);
  return delBanco ? delBanco.tasaAnual : tasaDelPlan(plazoMeses, tasaTarjeta);
}

/* --- Estado mutable: lo que las acciones ya cambiaron ----------------------- */

export type PlanAplicado = {
  id: string;
  tarjetaId: string;
  plazoMeses: number;
  tasaAnual: number;
  cat: number;
  saldoDiferidoCentavos: number;
  mensualidadCentavos: number;
  totalAPagarCentavos: number;
  interesesTotalesCentavos: number;
  ahorroVsMinimoCentavos: number;
  aplicadoEn: string;
  primerPagoFecha: string;
};

/**
 * El plan de pago que la persona YA aplico, si aplico uno. Es la superposicion del
 * estado sobre los datos de partida: nunca tienen plan, y esto es lo que hace
 * que una lectura posterior a la accion devuelva algo distinto.
 *
 * Un plan es por TARJETA: con `tarjetaId` se busca el de esa; sin el, el ultimo de la
 * persona (en la demo nadie tiene dos tarjetas de credito, pero el estado no lo asume).
 */
export function planAplicado(usuarioId: string, tarjetaId?: string): PlanAplicado | null {
  const planes = accionesDe(usuarioId, "aplicar_plan_pago").map((a) => a.datos as unknown as PlanAplicado);
  const ultimo = (tarjetaId ? planes.filter((p) => p.tarjetaId === tarjetaId) : planes).at(-1);
  return ultimo ?? null;
}

export type ApartadoCreado = {
  id: string;
  nombre: string;
  cuentaOrigenId: string;
  montoObjetivoCentavos: number;
  montoActualCentavos: number;
  aportacionCentavos: number;
  frecuencia: "mensual" | "quincenal";
  fechaObjetivo: string;
  primeraAportacionFecha: string;
  creadoEn: string;
};

export function apartadosCreados(usuarioId: string): ApartadoCreado[] {
  return accionesDe(usuarioId, "crear_apartado").map((a) => a.datos as unknown as ApartadoCreado);
}

/* --- La tarjeta, ya con el estado encima ------------------------------------ */

export type TarjetaVista = {
  id: string;
  marca: string;
  producto: string;
  mascara: string;
  limiteCentavos: number;
  /** Saldo revolvente HOY: cero si el saldo ya se difirio a un plan. */
  saldoCentavos: number;
  saldoOriginalCentavos: number;
  usoDelLimite: number;
  tasaAnual: number;
  cat: number;
  pagoMinimoCentavos: number;
  fechaLimitePago: string;
  diasMora: number;
  estatus: string;
};

/**
 * La tarjeta como la ve la persona DESPUES de lo que haya hecho. Una sola funcion
 * para que `consultar_tarjeta`, `comparar_periodos` y `aplicar_plan_pago` no discutan
 * sobre cuanto debe.
 */
export function tarjetaConEstado(usuarioId: string, tarjetaId?: string): { vista: TarjetaVista; plan: PlanAplicado | null } | null {
  const fila = tarjetaDeCredito(usuarioId, tarjetaId);
  if (!fila) return null;

  const plan = planAplicado(usuarioId, fila.id);
  const saldoOriginal = aEntero(fila.saldo_centavos);
  const difirioEstaTarjeta = plan !== null;
  const saldo = difirioEstaTarjeta ? 0 : saldoOriginal;
  const limite = aEntero(fila.limite_centavos);

  return {
    plan: difirioEstaTarjeta ? plan : null,
    vista: {
      id: fila.id!,
      marca: fila.marca ?? "",
      producto: fila.producto ?? "",
      mascara: fila.mascara ?? "",
      limiteCentavos: limite,
      saldoCentavos: saldo,
      saldoOriginalCentavos: saldoOriginal,
      usoDelLimite: limite === 0 ? 0 : Number((saldo / limite).toFixed(4)),
      tasaAnual: aDecimal(fila.tasa_anual),
      cat: aDecimal(fila.cat),
      // Con el saldo diferido ya no hay pago minimo: hay una mensualidad fija.
      pagoMinimoCentavos: difirioEstaTarjeta ? 0 : aEntero(fila.pago_minimo_centavos),
      fechaLimitePago: fila.fecha_limite_pago ?? "",
      // La mora se cura al reestructurar: el saldo vencido entra al plan.
      diasMora: difirioEstaTarjeta ? 0 : aEntero(fila.dias_mora),
      estatus: fila.estatus ?? "activa",
    },
  };
}

/** Los intereses con IVA que el saldo revolvente de hoy genera en un mes. */
export function interesesQueSeEvitan(vista: TarjetaVista): number {
  return interesesMensualesRevolventes(vista.saldoOriginalCentavos, vista.tasaAnual);
}

/** La fecha del primer pago de un plan aplicado hoy: el mismo dia del mes que viene. */
export function primerPagoDesde(fechaISO: string): string {
  return sumarMeses(fechaISO, 1);
}
