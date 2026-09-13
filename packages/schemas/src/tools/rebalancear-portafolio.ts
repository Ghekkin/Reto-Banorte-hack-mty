import { z } from "zod";
import { Centavos, FechaISO, IdUsuario } from "../comunes.js";

/**
 * `rebalancear_portafolio` — ACCION (mutación).
 * Ejecuta el rebalanceo de posiciones de un portafolio patrimonial para
 * alinear los pesos actuales a los pesos del modelo recomendado por su perfil.
 */
export const EntradaRebalancearPortafolio = z.object({
  usuarioId: IdUsuario,
  portafolioId: z
    .string()
    .optional()
    .describe("ID del portafolio a rebalancear. Si no se provee, se toma el activo de la persona."),
  idempotencyKey: z
    .string()
    .describe("Llave de idempotencia única: un reintento no ejecuta operaciones dos veces."),
});
export type EntradaRebalancearPortafolio = z.infer<typeof EntradaRebalancearPortafolio>;

export const MovimientoOperacion = z.object({
  tipo: z.enum(["compra", "venta"]),
  instrumentoClave: z.string(),
  claseActivo: z.string(),
  montoCentavos: Centavos,
  pesoAnteriorPct: z.number(),
  pesoNuevoPct: z.number(),
});
export type MovimientoOperacion = z.infer<typeof MovimientoOperacion>;

export const SalidaRebalancearPortafolio = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean(),
  mensaje: z.string(),
  portafolio: z.object({
    id: z.string(),
    nombre: z.string(),
    desviacionAntesPct: z.number(),
    desviacionDespuesPct: z.number(),
    operaciones: z.number().int(),
    aplicadoEn: z.string(),
  }),
  movimientos: z.array(MovimientoOperacion),
});
export type SalidaRebalancearPortafolio = z.infer<typeof SalidaRebalancearPortafolio>;
