import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `AvisoConsultaNoValida` — Orienta al usuario cuando realiza solicitudes
 * que no aplican a sus productos activos (ej. reestructurar tarjeta cuando no tiene tarjeta deudora),
 * que resultan perjudiciales para su salud financiera (ej. invertir con deuda al 62% CAT)
 * o que están fuera del marco bancario regulado Banorte (ej. criptomonedas o apuestas).
 * Muestra el análisis con números reales y ofrece alternativas viables.
 */
export const schemaAvisoConsultaNoValida = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  tipoInvalidez: z
    .enum(["producto_no_aplica", "deuda_prioritaria", "fuera_de_alcance", "sin_datos_suficientes"])
    .describe("Tipo de invalidez o inviabilidad financiera de la consulta"),
  titulo: z.string().describe("Título claro de la orientación"),
  explicacion: z.string().describe("Explicación pedagógica y cuantitativa"),
  datoClave: z.string().optional().describe("Métrica o dato clave detectado (ej. '62.1% CAT en tarjeta')"),
  montoReferenciaCentavos: Centavos.default(0).describe(
    "Monto financiero en centavos asociado al caso (saldo deudor, capacidad de ahorro o $0)",
  ),
  etiquetaMonto: z
    .string()
    .optional()
    .default("Monto de referencia")
    .describe("Etiqueta para el monto de referencia"),
  alternativasSugeridas: z
    .array(z.string())
    .min(1)
    .describe("Opciones o preguntas viables que el usuario puede elegir en su lugar"),
  accionSugerida: z
    .object({
      nombre: z.string().describe("Nombre de la acción"),
      etiqueta: z.string().describe("Texto del botón de acción"),
      context: z.record(z.string(), z.unknown()).optional().describe("Contexto para la acción"),
    })
    .optional()
    .describe("Acción principal sugerida para resolver la situación"),
});

export type PropsAvisoConsultaNoValida = z.infer<typeof schemaAvisoConsultaNoValida>;

export const entradaAvisoConsultaNoValida = {
  nombre: "AvisoConsultaNoValida",
  cuandoUsarlo:
    "El usuario solicita una acción que no aplica (ej. reestructura sin tarjeta), inviable financieramente (ej. invertir teniendo deuda crítica con intereses altos) o fuera del catálogo regulado Banorte. Orienta con alternativas seguras y accionables.",
  schema: schemaAvisoConsultaNoValida,
  acciones: ["simular_plan", "simular_meta", "consultar_movimientos"],
};
