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
    "La persona quiere proyectar cuánto crecerá su dinero si invierte mes con mes en pagarés, fondos o CETES a mediano/largo plazo. Pasa el desglose entre aportado y rendimientos con los hitos temporales. Dispara simular_inversion.",
  schema: schemaProyeccionCrecimiento,
  acciones: ["simular_inversion"],
};
