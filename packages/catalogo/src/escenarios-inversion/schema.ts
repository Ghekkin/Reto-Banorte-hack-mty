import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `EscenariosInversion` — Compara 3 escenarios de retorno (pesimista, esperado y optimista)
 * para evaluar riesgo y expectativas de rendimiento ante distintas condiciones de mercado.
 */
export const DetalleEscenario = z.object({
  tasaAnualPct: z.number().describe("Tasa de rendimiento anual estimada para el escenario como fracción (ej. 0.06 = 6%)"),
  valorFinalCentavos: Centavos.describe("Monto total estimado al final del plazo"),
  rendimientoCentavos: Centavos.describe("Ganancia monetaria neta estimada sobre el capital"),
  descripcion: z.string().describe("Breve explicación de las condiciones que propiciarían este resultado"),
});

export const schemaEscenariosInversion = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  montoInvertidoCentavos: Centavos.describe("Monto inicial invertido en centavos"),
  horizonteMeses: z.number().int().min(1).max(360).describe("Horizonte de inversión en meses"),
  escenarioPesimista: DetalleEscenario.describe("Escenario conservador o de mercado adverso"),
  escenarioEsperado: DetalleEscenario.describe("Escenario base o más probable según la estrategia"),
  escenarioOptimista: DetalleEscenario.describe("Escenario favorable o de alto desempeño"),
  escenarioInicial: z.enum(["pesimista", "esperado", "optimista"]).optional().default("esperado"),
});

export type PropsEscenariosInversion = z.infer<typeof schemaEscenariosInversion>;

export const entradaEscenariosInversion = {
  nombre: "EscenariosInversion",
  cuandoUsarlo:
    "La persona duda sobre la volatilidad de su inversión o quiere entender qué pasaría en el peor y mejor caso antes de decidir. Compara pesimista, esperado y optimista. Dispara elegir_escenario.",
  schema: schemaEscenariosInversion,
  acciones: ["elegir_escenario"],
};
