import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";

/**
 * `proyectar_inversion` — lectura que CALCULA. Cuanto vale un ahorro invertido dentro de
 * N meses, y que pasa si el mercado se porta mal o bien.
 *
 * **Por que existe.** `ProyeccionCrecimiento` y `EscenariosInversion` piden entre los dos
 * once cifras (`valorFinalEstimadoCentavos`, `rendimientoEstimadoCentavos`, los `hitos`,
 * los tres escenarios) y hasta hoy NINGUNA tool las calculaba: el modelo las escribia de
 * memoria. Peor, `ProyeccionCrecimiento` simula el interes compuesto en el navegador y
 * despues *calibra* su curva contra el cierre recibido, asi que la grafica se doblaba para
 * no contradecir un numero inventado. Se veia creible, que es justo lo que lo hacia grave.
 *
 * **La diferencia con `proyectar_ahorro`**: ahi NO se modela rendimiento a proposito (un
 * apartado no invierte). Aqui si, porque la pregunta es explicitamente de inversion, y por
 * eso todo sale rotulado como estimacion y con un escenario que puede perder.
 *
 * Detalle en `docs/algoritmos/proyeccion-de-inversion.md`.
 */
export const EntradaProyectarInversion = z.object({
  usuarioId: IdUsuario,
  horizonteMeses: z
    .number()
    .int()
    .min(3)
    .max(360)
    .describe("A cuantos meses proyectar. 60 son cinco anos; el maximo son 30"),
  aportacionMensualCentavos: Centavos.min(0)
    .optional()
    .describe("Lo que suma cada mes. Default 0: proyecta solo el capital inicial sin aportaciones"),
  capitalInicialCentavos: Centavos.min(0)
    .optional()
    .describe("Con cuanto arranca. Default: el valor actual de su portafolio, o 0 si no tiene"),
  instrumentoId: z
    .string()
    .optional()
    .describe(
      "De donde salen la tasa y la volatilidad: 'inst_cetes_182', 'inst_nte_dia'. Default: el " +
        "instrumento de mayor peso del modelo recomendado para su perfil. No lo combines con `tasaAnual`",
    ),
  tasaAnual: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Tasa anual como fraccion (0.105 = 10.5 %) cuando quieres una hipotetica y no un instrumento " +
        "del catalogo. Si la mandas, la volatilidad se estima como 40 % de la tasa",
    ),
});
export type EntradaProyectarInversion = z.infer<typeof EntradaProyectarInversion>;

/** Un punto de control de la curva: el que se pinta como ficha y como marca del eje. */
export const HitoDeProyeccion = z.object({
  mes: z.number().int(),
  etiqueta: z.string().describe("'Ano 1', 'Ano 3', 'Mes 6'"),
  aportadoCentavos: Centavos.describe("Lo que salio de su bolsillo hasta ese mes, sin rendimiento"),
  saldoEstimadoCentavos: Centavos.describe("El saldo con los rendimientos reinvertidos"),
});
export type HitoDeProyeccion = z.infer<typeof HitoDeProyeccion>;

/**
 * Un escenario. `rendimientoCentavos` **puede ser negativo**: es el unico modo honesto de
 * mostrar un escenario adverso, y una proyeccion que nunca pierde no se puede ensenar en
 * una demo financiera.
 */
export const EscenarioDeProyeccion = z.object({
  tasaAnualPct: z.number().describe("La tasa anual de este escenario, como fraccion"),
  valorFinalCentavos: Centavos,
  rendimientoCentavos: z.number().int().describe("Ganancia o PERDIDA estimada. Puede ser negativo"),
  descripcion: z.string().describe("Que tendria que pasar en el mercado para llegar aqui"),
});
export type EscenarioDeProyeccion = z.infer<typeof EscenarioDeProyeccion>;

export const SalidaProyectarInversion = z.object({
  capitalInicialCentavos: Centavos,
  aportacionMensualCentavos: Centavos,
  horizonteMeses: z.number().int(),
  instrumento: z
    .object({
      id: z.string(),
      nombre: z.string(),
      clave: z.string(),
      tipo: z.string(),
      riesgo: z.number().int().describe("1 el mas seguro, 5 el mas volatil"),
    })
    .nullable()
    .describe("null cuando se proyecto con una `tasaAnual` hipotetica y no con un instrumento"),
  tasaAnualEstimadaPct: z.number().describe("La tasa del escenario esperado, como fraccion"),
  volatilidadAnual: z.number().describe("Desviacion anual con la que se separaron los escenarios"),
  totalAportadoCentavos: Centavos.describe("Capital inicial + todas las aportaciones. Lo que puso de su bolsillo"),
  rendimientoEstimadoCentavos: z.number().int().describe("Ganancia estimada del escenario esperado"),
  valorFinalEstimadoCentavos: Centavos.describe("El saldo al cierre en el escenario esperado"),
  hitos: z.array(HitoDeProyeccion).describe("Para el eje y las fichas de ProyeccionCrecimiento"),
  escenarios: z
    .object({
      pesimista: EscenarioDeProyeccion,
      esperado: EscenarioDeProyeccion,
      optimista: EscenarioDeProyeccion,
    })
    .describe("Los tres de EscenariosInversion, ya calculados: no los derives tu"),
  advertencia: z
    .string()
    .nullable()
    .describe("Cuando hay algo que la persona tiene que oir junto al numero (p. ej. que puede perder)"),
});
export type SalidaProyectarInversion = z.infer<typeof SalidaProyectarInversion>;
