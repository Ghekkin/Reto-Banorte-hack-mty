import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";

/**
 * `consultar_sugerencias_inversion` — LECTURA.
 * Analiza la viabilidad de inversión del usuario y emite sugerencias personalizadas
 * según su perfil y situación financiera:
 * - Si tiene deuda tóxica (Beto): prioriza liquidar pasivos antes de arriesgar capital.
 * - Si tiene capacidad de ahorro sin portafolio (Ana): sugiere fondo de emergencia y pagarés/deuda líquida.
 * - Si tiene portafolio patrimonial (Carmen): sugiere instrumentos de diversificación o rebalanceo.
 */

export const EstadoFinancieroInversion = z.enum([
  "deuda_prioritaria",
  "requiere_fondo_emergencia",
  "listo_para_invertir",
]);
export type EstadoFinancieroInversion = z.infer<typeof EstadoFinancieroInversion>;

export const PerfilInversionista = z.enum([
  "conservador",
  "moderado",
  "agresivo",
  "sin_perfil",
]);
export type PerfilInversionista = z.infer<typeof PerfilInversionista>;

export const EntradaConsultarSugerenciasInversion = z.object({
  usuarioId: IdUsuario,
  montoSugeridoCentavos: Centavos.optional().describe("Monto estimado que la persona contempla para destinar"),
  horizonteMeses: z.number().int().min(1).max(360).optional().describe("Plazo estimado en meses"),
});
export type EntradaConsultarSugerenciasInversion = z.infer<typeof EntradaConsultarSugerenciasInversion>;

export const OpcionSugerenciaInversion = z.object({
  id: z.string().describe("Identificador de la sugerencia o instrumento"),
  titulo: z.string().describe("Nombre del producto o estrategia recomendada"),
  tipo: z.enum(["instrumento", "estrategia", "meta", "advertencia"]).describe("Tipo de sugerencia"),
  descripcion: z.string().describe("Detalle claro del beneficio o motivo de la recomendación"),
  rendimientoEstimadoAnualPct: z.number().optional().describe("Rendimiento estimado anualizado como fracción (ej. 0.11 = 11.0%)"),
  plazoMinimo: z.string().optional().describe("Plazo mínimo o liquidez (ej. 'Diaria', '28 días', '180 días')"),
  nivelRiesgo: z.enum(["muy_bajo", "bajo", "medio", "alto"]).optional().describe("Nivel de volatilidad o riesgo"),
  badge: z.string().optional().describe("Etiqueta destacada (ej. 'Recomendado', 'Prioridad #1', 'Bajo Riesgo')"),
  recomendado: z.boolean().default(false).describe("true si es la opción principal sugerida por el agente"),
});
export type OpcionSugerenciaInversion = z.infer<typeof OpcionSugerenciaInversion>;

export const SalidaConsultarSugerenciasInversion = z.object({
  aplicaInversion: z.boolean().describe("true si la persona cuenta con condiciones financieras aptas para invertir"),
  estadoFinanciero: EstadoFinancieroInversion.describe("Diagnóstico de preparación para invertir"),
  perfilInversionista: PerfilInversionista.describe("Perfil de riesgo actual o sugerido"),
  capacidadMensualCentavos: Centavos.describe("Capacidad mensual libre para ahorro o inversión"),
  montoRecomendadoCentavos: Centavos.describe("Monto inicial sugerido en centavos"),
  motivo: z.string().describe("Explicación del criterio financiero aplicado"),
  sugerencias: z.array(OpcionSugerenciaInversion).min(1).describe("Opciones o pasos sugeridos"),
  siguientePaso: z.string().describe("Recomendación de acción inmediata para el usuario"),
});
export type SalidaConsultarSugerenciasInversion = z.infer<typeof SalidaConsultarSugerenciasInversion>;
