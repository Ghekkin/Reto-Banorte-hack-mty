import { z } from "zod";
import { Centavos, FechaISO, IdUsuario, LlaveIdempotencia } from "../comunes.js";

/**
 * `crear_tope_gasto` — ACCION. Fija un límite de gasto mensual para una categoría.
 * Calcula el gasto actual real del periodo en curso y el promedio histórico de 3 meses.
 * Produce un cambio real en el estado mutable.
 *
 * Idempotente por `idempotencyKey`.
 */
export const EntradaCrearTopeGasto = z.object({
  usuarioId: IdUsuario,
  categoriaId: z.string().describe("ID de la categoría sobre la que se fija el tope (e.g. 'cat_restaurantes')"),
  montoLimiteCentavos: Centavos.describe("Monto límite en centavos para el periodo"),
  periodo: z.enum(["mensual"]).optional().describe("Frecuencia del tope (default: 'mensual')"),
  alertarEnPct: z.number().min(0).max(1).optional().describe("Porcentaje del límite para alertar (default: 0.8)"),
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaCrearTopeGasto = z.infer<typeof EntradaCrearTopeGasto>;

export const SalidaCrearTopeGasto = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean(),
  mensaje: z.string(),
  tope: z.object({
    id: z.string(),
    categoriaId: z.string(),
    categoria: z.string(),
    color: z.string(),
    montoLimiteCentavos: Centavos,
    gastadoActualCentavos: Centavos,
    pctUsado: z.number(),
    estatus: z.enum(["dentro", "cerca", "excedido"]),
    alertarEnPct: z.number(),
    periodo: z.enum(["mensual"]),
    fechaCreacion: FechaISO,
  }),
  promedioHistoricoCentavos: Centavos,
});
export type SalidaCrearTopeGasto = z.infer<typeof SalidaCrearTopeGasto>;
