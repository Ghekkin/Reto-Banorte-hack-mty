import { aDecimal, aEntero, accionesDe, filtrar, type Fila } from "../datos/index.js";
import { hoy, periodoAnterior, ultimoMesCerrado } from "./tiempo.js";

export type EstatusTope = "dentro" | "cerca" | "excedido";

export type TopeInfo = {
  id: string;
  categoriaId: string;
  montoLimiteCentavos: number;
  alertarEnPct: number;
  periodo: "mensual";
  fechaCreacion: string;
};

/**
 * Busca si ya existe un tope de gasto para ese usuario y categoría,
 * revisando primero el estado mutable y luego la tabla CSV `topes_gasto`.
 */
export function buscarTopeExistente(usuarioId: string, categoriaId: string): TopeInfo | undefined {
  // 1. Revisar estado mutable
  const acciones = accionesDe(usuarioId, "crear_tope_gasto");
  for (let i = acciones.length - 1; i >= 0; i--) {
    const d = acciones[i]?.datos as Partial<TopeInfo> | undefined;
    if (d && d.categoriaId === categoriaId && d.montoLimiteCentavos !== undefined) {
      return {
        id: d.id ?? `tope_${usuarioId}_${categoriaId}`,
        categoriaId,
        montoLimiteCentavos: d.montoLimiteCentavos,
        alertarEnPct: d.alertarEnPct ?? 0.8,
        periodo: "mensual",
        fechaCreacion: d.fechaCreacion ?? hoy(),
      };
    }
  }

  // 2. Revisar CSV topes_gasto
  const filas = filtrar("topes_gasto", "usuario_id", usuarioId);
  const fila = filas.find((f) => f.categoria_id === categoriaId);
  if (fila) {
    return {
      id: fila.id!,
      categoriaId,
      montoLimiteCentavos: aEntero(fila.monto_limite_centavos),
      alertarEnPct: fila.alertar_en_pct ? aDecimal(fila.alertar_en_pct) : 0.8,
      periodo: "mensual",
      fechaCreacion: fila.fecha_creacion ?? hoy(),
    };
  }

  return undefined;
}

/**
 * Calcula en vivo el gasto real de cargos de una categoría para un periodo (AAAA-MM).
 * Trampa 1: nunca leer `topes_gasto.gastado_actual_centavos` (viene en 0 en CSV).
 */
export function calcularGastadoCategoriaPeriodo(
  usuarioId: string,
  categoriaId: string,
  periodo: string = ultimoMesCerrado(hoy()),
): number {
  const movimientos = filtrar("movimientos", "usuario_id", usuarioId);
  let total = 0;
  for (const m of movimientos) {
    if (m.tipo !== "cargo") continue;
    if (m.categoria_id !== categoriaId) continue;
    if (!(m.fecha ?? "").startsWith(periodo)) continue;
    total += aEntero(m.monto_centavos);
  }
  return total;
}

/**
 * Calcula el promedio mensual histórico de los N meses previos al periodo de referencia.
 */
export function calcularPromedioHistorico(
  usuarioId: string,
  categoriaId: string,
  periodoRef: string = ultimoMesCerrado(hoy()),
  meses: number = 3,
): number {
  let acumulado = 0;
  let mes = periodoRef;
  for (let i = 0; i < meses; i++) {
    mes = periodoAnterior(mes);
    acumulado += calcularGastadoCategoriaPeriodo(usuarioId, categoriaId, mes);
  }
  return Math.round(acumulado / meses);
}

/**
 * Determina el estatus ("dentro" | "cerca" | "excedido") y el porcentaje usado.
 */
export function evaluarEstatusTope(
  gastadoActualCentavos: number,
  montoLimiteCentavos: number,
  alertarEnPct: number = 0.8,
): { pctUsado: number; estatus: EstatusTope } {
  if (montoLimiteCentavos <= 0) {
    return { pctUsado: 1, estatus: "excedido" };
  }
  const pctUsado = Number((gastadoActualCentavos / montoLimiteCentavos).toFixed(4));
  let estatus: EstatusTope = "dentro";
  if (pctUsado >= 1) {
    estatus = "excedido";
  } else if (pctUsado >= alertarEnPct) {
    estatus = "cerca";
  }
  return { pctUsado, estatus };
}
