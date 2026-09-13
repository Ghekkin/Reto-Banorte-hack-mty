import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";
import { MovimientoOperacion } from "./rebalancear-portafolio.js";

/**
 * `simular_rebalanceo` — LECTURA.
 *
 * Las ordenes que `rebalancear_portafolio` ejecutaria, **sin ejecutarlas**. Existe porque
 * `OrdenRebalanceo` es una tarjeta que se pinta ANTES de que la persona confirme, y la
 * unica tool que calculaba las ordenes era la de accion: el modelo terminaba escribiendo
 * los montos a mano. Usa el mismo calculo (`calcularMovimientosRebalanceo`), asi que lo
 * que se muestra es exactamente lo que se aplicaria al confirmar.
 */
export const EntradaSimularRebalanceo = z.object({
  usuarioId: IdUsuario,
  portafolioId: z
    .string()
    .optional()
    .describe("ID del portafolio. Si no se provee, se toma el activo de la persona."),
});
export type EntradaSimularRebalanceo = z.infer<typeof EntradaSimularRebalanceo>;

export const SalidaSimularRebalanceo = z.object({
  portafolio: z.object({
    id: z.string(),
    nombre: z.string(),
    valorTotalCentavos: Centavos,
    desviacionModeloPct: z.number().describe("Desviacion actual contra el modelo, como fraccion"),
  }),
  comisionTotalCentavos: Centavos.describe("Costo de intermediacion; $0 en fondos Banorte"),
  movimientos: z.array(MovimientoOperacion).describe("Ventas primero, luego compras, de mayor a menor monto"),
  sinDesviacion: z.boolean().describe("true si no hay ninguna orden que ejecutar"),
});
export type SalidaSimularRebalanceo = z.infer<typeof SalidaSimularRebalanceo>;
