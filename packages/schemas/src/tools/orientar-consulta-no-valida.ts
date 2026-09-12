import { z } from "zod";
import { IdUsuario } from "../comunes.js";

/**
 * `orientar_consulta_no_valida` — LECTURA / ORIENTACIÓN.
 * Evalúa consultas que no son válidas para el perfil del usuario (p. ej. pedir invertir
 * cuando se tiene deuda en mora al 62% CAT, pedir reestructurar tarjeta cuando no se tiene
 * tarjeta de crédito, o consultas fuera de alcance como criptoactivos no regulados).
 * Devuelve la explicación financiera y las alternativas reales que sí resuelven su situación.
 */

export const CategoriaConsultaNoValida = z.enum([
  "inversion_con_deuda",
  "reestructura_sin_tarjeta",
  "cancelacion_sin_suscripciones",
  "fuera_de_alcance",
  "operacion_invalida",
  "general",
]);
export type CategoriaConsultaNoValida = z.infer<typeof CategoriaConsultaNoValida>;

export const EntradaOrientarConsultaNoValida = z.object({
  usuarioId: IdUsuario,
  consulta: z.string().describe("Texto o intención de la consulta no válida o no aplicable"),
  categoria: CategoriaConsultaNoValida.optional().describe("Categoría de invalidez si ya fue identificada"),
});
export type EntradaOrientarConsultaNoValida = z.infer<typeof EntradaOrientarConsultaNoValida>;

export const TipoInvalidez = z.enum([
  "producto_no_aplica",
  "deuda_prioritaria",
  "fuera_de_alcance",
  "sin_datos_suficientes",
  "incompatible_con_politica",
]);
export type TipoInvalidez = z.infer<typeof TipoInvalidez>;

export const AccionSugerida = z.object({
  nombre: z.string().describe("Nombre de la acción (ej. 'ver_plan_pago', 'simular_meta')"),
  etiqueta: z.string().describe("Texto del botón o llamada a la acción (ej. 'Ver opciones de pago')"),
  context: z.record(z.string(), z.unknown()).default({}).describe("Parámetros de contexto para ejecutar o disparar la acción"),
});
export type AccionSugerida = z.infer<typeof AccionSugerida>;

export const SalidaOrientarConsultaNoValida = z.object({
  esValida: z.boolean().describe("false si la consulta o producto no aplica en absoluto al usuario"),
  tipoInvalidez: TipoInvalidez,
  titulo: z.string().describe("Título claro del aviso o motivo institucional"),
  explicacion: z.string().describe("Explicación financiera comprensible sin tecnicismos vacíos"),
  datoClave: z.string().optional().describe("Métrica o dato duro de soporte (ej. 'Deuda actual: $76,926.65 al 62.1% CAT')"),
  alternativasSugeridas: z.array(z.string()).min(1).describe("Preguntas o rutas de acción viables para el usuario"),
  accionSugerida: AccionSugerida.optional().describe("Acción prioritaria que el usuario puede ejecutar en la UI"),
});
export type SalidaOrientarConsultaNoValida = z.infer<typeof SalidaOrientarConsultaNoValida>;
