import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `DistribucionPortafolio` — Muestra el desglose de activos del portafolio patrimonial
 * por clase (acciones, bonos/deuda, fondos, efectivo) y su apego al modelo objetivo.
 * Proviene de `consultar_inversiones`.
 */
export const ClaseActivo = z.object({
  claseId: z.string().describe("Identificador de la clase (ej: 'deuda', 'renta_variable', 'efectivo')"),
  nombre: z.string().describe("Nombre de la clase de activo (ej. 'Deuda gubernamental', 'Renta variable global')"),
  tipo: z.string().describe("Categoría macro (ej. 'Renta fija', 'Renta variable', 'Liquidez')"),
  montoCentavos: Centavos.describe("Valor de mercado de la posición en centavos"),
  pesoPct: z.number().describe("Porcentaje actual que representa en el portafolio (ej. 0.45 = 45%)"),
  pesoObjetivoPct: z.number().optional().describe("Porcentaje objetivo según el perfil de inversión"),
});

export const schemaDistribucionPortafolio = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  valorTotalCentavos: Centavos.describe("Valor de mercado total del portafolio en centavos"),
  aportadoCentavos: Centavos.optional().describe("Capital total neto aportado"),
  rendimientoTotalPct: z.number().describe("Rendimiento ponderado acumulado como fracción (ej. 0.087 = +8.7%)"),
  desviacionModeloPct: z.number().optional().describe("Desviación absoluta respecto a la asignación objetivo"),
  clases: z.array(ClaseActivo).min(1).describe("Desglose ordenado de mayor a menor peso"),
});

export type PropsDistribucionPortafolio = z.infer<typeof schemaDistribucionPortafolio>;

export const entradaDistribucionPortafolio = {
  nombre: "DistribucionPortafolio",
  cuandoUsarlo:
    "La persona pregunta '¿Cómo va mi portafolio?', '¿En qué está invertido mi dinero?' o se detecta que su asignación se desvió del modelo sugerido. Muestra clases de activo y pesos. Dispara ver_orden_rebalanceo para revisar las órdenes sugeridas. Si después pide otro orden o solo las N principales, eso es `ajustar_pantalla` sobre `orden` o `limite`.",
  schema: schemaDistribucionPortafolio,
  acciones: ["ver_orden_rebalanceo"],
};
