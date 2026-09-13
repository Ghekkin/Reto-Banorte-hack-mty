import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `EscenariosInversion` — Compara 3 escenarios de retorno (pesimista, esperado y optimista)
 * para evaluar riesgo y expectativas de rendimiento ante distintas condiciones de mercado.
 */
export const DetalleEscenario = z.object({
  tasaAnualPct: z.number().describe("Tasa de rendimiento anual estimada para el escenario como fracción (ej. 0.06 = 6%)"),
  valorFinalCentavos: Centavos.describe("Monto total estimado al final del plazo. Sale de proyectar_inversion"),
  rendimientoCentavos: z
    .number()
    .int()
    .describe(
      "Ganancia o PERDIDA estimada sobre el capital, en centavos. Puede ser NEGATIVO en el escenario " +
        "pesimista, y si la tool lo devuelve negativo se pinta negativo: no lo subas a cero",
    ),
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
    "La persona duda sobre la volatilidad de su inversión o quiere entender qué pasaría en el peor y mejor caso antes de decidir: **ya llamaste proyectar_inversion** y pasas sus tres escenarios tal como vinieron. Compara pesimista, esperado y optimista. Si pide otro monto u otro horizonte, vuelve a llamar la tool: los tres escenarios cambian y no se pueden derivar. Dispara elegir_escenario.",
  schema: schemaEscenariosInversion,
  acciones: ["elegir_escenario"],
};
