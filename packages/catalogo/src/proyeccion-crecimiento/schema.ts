import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `ProyeccionCrecimiento` — Muestra el crecimiento patrimonial proyectado con interés compuesto
 * y aportaciones periódicas en el horizonte seleccionado.
 */
export const HitoProyeccion = z.object({
  mes: z.number().int().describe("Número de mes del hito (ej. 12, 36, 60)"),
  etiqueta: z.string().describe("Nombre legible del hito (ej. 'Año 1', 'Año 3', 'Meta 5 años')"),
  aportadoCentavos: Centavos.describe("Monto acumulado aportado de tu bolsillo"),
  saldoEstimadoCentavos: Centavos.describe("Saldo total estimado con rendimientos reinvertidos"),
});

export const schemaProyeccionCrecimiento = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  capitalInicialCentavos: Centavos.describe("Capital inicial de apertura"),
  aportacionMensualCentavos: Centavos.describe("Aportación recurrente mensual"),
  plazoMeses: z.number().int().min(3).max(360).describe("Plazo total de proyección en meses"),
  tasaAnualEstimadaPct: z.number().describe("Tasa de rendimiento anual estimada como fracción (ej: 0.105 = 10.5%)"),
  totalAportadoCentavos: Centavos.describe("Suma total de capital inicial más aportaciones mensuales"),
  rendimientoEstimadoCentavos: Centavos.describe("Ganancia neta estimada por interés compuesto"),
  valorFinalEstimadoCentavos: Centavos.describe("Saldo proyectado al finalizar el plazo"),
  hitos: z.array(HitoProyeccion).min(1).describe("Puntos de control o hitos temporales a lo largo de la proyección"),
});

export type PropsProyeccionCrecimiento = z.infer<typeof schemaProyeccionCrecimiento>;

export const entradaProyeccionCrecimiento = {
  nombre: "ProyeccionCrecimiento",
  cuandoUsarlo:
    "HOY NO LA USES: ninguna tool del MCP devuelve una proyección de inversión (`totalAportadoCentavos`, `rendimientoEstimadoCentavos`, `valorFinalEstimadoCentavos`, `hitos`), y esas cifras no se calculan a mano ni se estiman: la tarjeta calibra su curva contra el cierre que le mandes, así que un cierre inventado dobla la gráfica para taparlo. " +
    "Si la persona pregunta cuánto crecería su dinero invirtiendo mes con mes, pinta `SugerenciasInversion` con `consultar_sugerencias_inversion` (el rendimiento anual estimado de cada instrumento) o `RiesgoRendimiento` con `consultar_catalogo_inversiones`, y di en tu texto que la proyección a futuro todavía no está disponible. " +
    "Para juntar un monto en un plazo (ahorro sin rendimiento), `SimuladorMeta` con `proyectar_ahorro`. Solo se pinta si una tool devolvió esas cifras tal cual. Dispara elegir_plan_inversion.",
  schema: schemaProyeccionCrecimiento,
  acciones: ["elegir_plan_inversion"],
};
