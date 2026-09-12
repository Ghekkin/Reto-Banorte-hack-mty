import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";

/**
 * `comparar_periodos` — lectura. La fase 2: "¿en que se me va el dinero?".
 * Devuelve el gasto por categoria de un mes contra el anterior y **senala la
 * categoria atipica**, que es lo que el agente resalta en la grafica.
 *
 * El criterio de "atipica" esta en `docs/algoritmos/categoria-atipica.md`: no es
 * la mas grande, es la que mas se sale de su propio patron.
 */
export const Periodo = z.string().regex(/^\d{4}-\d{2}$/, "usa AAAA-MM");

export const EntradaCompararPeriodos = z.object({
  usuarioId: IdUsuario,
  periodo: Periodo.optional().describe("Mes a analizar, AAAA-MM. Default: el mes con datos mas reciente"),
  periodoAnterior: Periodo.optional().describe("Contra que comparar. Default: el mes inmediato anterior"),
});
export type EntradaCompararPeriodos = z.infer<typeof EntradaCompararPeriodos>;

export const GastoDeCategoria = z.object({
  categoriaId: z.string(),
  nombre: z.string(),
  grupo: z.string(),
  esEsencial: z.boolean(),
  color: z.string().describe("Hex del catalogo de categorias; la UI puede ignorarlo y usar tokens"),
  montoCentavos: Centavos,
  montoAnteriorCentavos: Centavos,
  variacionPct: z.number().describe("Fraccion: 0.42 = 42 % mas que el periodo anterior; 0 si antes era cero"),
  participacionPct: z.number().describe("Fraccion del gasto total del periodo"),
  esAtipica: z.boolean(),
});
export type GastoDeCategoria = z.infer<typeof GastoDeCategoria>;

export const SalidaCompararPeriodos = z.object({
  periodo: Periodo,
  periodoAnterior: Periodo,
  ingresoCentavos: Centavos,
  gastoCentavos: Centavos,
  gastoAnteriorCentavos: Centavos,
  variacionPct: z.number(),
  categorias: z.array(GastoDeCategoria).describe("Ordenadas de mayor a menor gasto del periodo"),
  categoriaAtipicaId: z.string().nullable(),
  /**
   * Presente solo si hay un plan de pago aplicado: es como la fase 2 demuestra
   * que la accion de la fase 1 cambio la realidad de la persona.
   */
  efectoDelPlan: z
    .object({
      interesesDelPeriodoCentavos: Centavos,
      interesesEvitadosPorMesCentavos: Centavos,
      mensualidadDelPlanCentavos: Centavos,
    })
    .nullable(),
});
export type SalidaCompararPeriodos = z.infer<typeof SalidaCompararPeriodos>;
