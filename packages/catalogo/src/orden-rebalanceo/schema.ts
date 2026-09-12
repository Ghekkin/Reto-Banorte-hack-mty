import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `OrdenRebalanceo` — Presenta la orden de ajuste de cartera antes de ejecutarse:
 * posiciones a vender y a comprar para alinear el portafolio con el modelo patrimonial.
 */
export const MovimientoRebalanceo = z.object({
  tipo: z.enum(["compra", "venta"]).describe("Acción de mercado requerida"),
  claseActivo: z.string().describe("Categoría del activo (ej. 'Renta variable', 'Deuda')"),
  instrumentoClave: z.string().describe("Símbolo o clave del instrumento (ej. 'NAFTRAC', 'CETES28')"),
  montoCentavos: Centavos.describe("Monto monetario de la operación"),
  pesoAnteriorPct: z.number().describe("Porcentaje anterior en el portafolio"),
  pesoNuevoPct: z.number().describe("Porcentaje proyectado tras el rebalanceo"),
});

export const schemaOrdenRebalanceo = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  portafolioId: z.string().describe("Identificador de la cuenta o portafolio"),
  nombrePortafolio: z.string().describe("Nombre de la estrategia o portafolio"),
  valorTotalCentavos: Centavos.describe("Valor total patrimonial de la cartera"),
  comisionTotalCentavos: Centavos.default(0).describe("Costo por comisión de intermediación ($0 en fondos Banorte)"),
  movimientos: z.array(MovimientoRebalanceo).min(1).describe("Operaciones requeridas para el rebalanceo"),
});

export type PropsOrdenRebalanceo = z.infer<typeof schemaOrdenRebalanceo>;

export const entradaOrdenRebalanceo = {
  nombre: "OrdenRebalanceo",
  cuandoUsarlo:
    "La persona confirma que desea rebalancear su portafolio patrimonial para volver a su asignación recomendada. Muestra las órdenes de venta y compra. Dispara confirmar_rebalanceo.",
  schema: schemaOrdenRebalanceo,
  acciones: ["confirmar_rebalanceo"],
};
