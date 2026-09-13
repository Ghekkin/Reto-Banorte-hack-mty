import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `ComparadorAntesDespues` — Compara de manera frontal el impacto financiero
 * de mantener el camino actual (status quo) vs. implementar la estrategia recomendada por Maya.
 */
export const EscenarioComparativa = z.object({
  etiqueta: z.string().describe("Nombre del camino: 'Camino actual' o 'Con estrategia Maya'"),
  mensualidadCentavos: Centavos.optional().describe("Pago mensual requerido (si aplica)"),
  costoTotalCentavos: Centavos.describe("Monto total desembolsado o acumulado"),
  tiempoMeses: z.number().int().describe("Meses necesarios para alcanzar el objetivo o liquidar"),
  descripcion: z.string().describe("Resumen conciso del resultado"),
});

export const schemaComparadorAntesDespues = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  titulo: z.string().describe("Título de la comparativa (ej. 'Deuda de Tarjeta Clásica', 'Ahorro para Enganche')"),
  ahorroNetoCentavos: Centavos.describe("Beneficio monetario neto obtenido con la estrategia"),
  ahorroTiempoMeses: z.number().int().optional().describe("Meses ahorrados frente al escenario actual"),
  escenarioActual: EscenarioComparativa.describe("Situación sin intervención"),
  escenarioEstrategia: EscenarioComparativa.describe("Situación aplicando la recomendación de Maya"),
});

export type PropsComparadorAntesDespues = z.infer<typeof schemaComparadorAntesDespues>;

export const entradaComparadorAntesDespues = {
  nombre: "ComparadorAntesDespues",
  cuandoUsarlo:
    "La persona duda sobre la conveniencia de una recomendación financiera o necesita ver el contraste directo de qué gana si actúa hoy frente a no hacer nada. Dispara elegir_estrategia.",
  schema: schemaComparadorAntesDespues,
  acciones: ["elegir_estrategia"],
};
