import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * Cada opción de inversión o estrategia recomendada en la tarjeta.
 */
export const ElementoSugerenciaInversion = z.object({
  id: z.string().describe("Identificador de la sugerencia"),
  titulo: z.string().describe("Título o nombre del instrumento / estrategia"),
  tipo: z
    .enum(["instrumento", "estrategia", "meta", "advertencia"])
    .describe("Tipo de recomendación"),
  descripcion: z.string().describe("Explicación de por qué conviene y cómo funciona"),
  rendimientoEstimadoAnualPct: z
    .number()
    .optional()
    .describe("Tasa anual estimada en fracción (ej. 0.108 para 10.8%)"),
  plazoMinimo: z.string().optional().describe("Plazo mínimo sugerido (ej. '28 días')"),
  nivelRiesgo: z
    .enum(["muy_bajo", "bajo", "medio", "alto", "muy_alto"])
    .optional()
    .describe("Nivel de riesgo del instrumento"),
  badge: z.string().optional().describe("Etiqueta destacada (ej. 'Ideal para iniciar')"),
  recomendado: z.boolean().optional().describe("true si es la opción prioritaria recomendada"),
});

export const schemaSugerenciasInversion = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  estadoFinanciero: z
    .enum(["deuda_prioritaria", "requiere_fondo_emergencia", "listo_para_invertir"])
    .describe("Diagnóstico de preparación financiera para invertir"),
  perfilInversionista: z
    .enum(["conservador", "moderado", "agresivo", "sin_perfil"])
    .describe("Perfil de inversión detectado en su cuestionario o comportamiento"),
  capacidadMensualCentavos: Centavos.describe(
    "Capacidad de ahorro libre mensual estimada del cliente en centavos",
  ),
  montoRecomendadoCentavos: Centavos.describe(
    "Monto sugerido para destinar a la inversión en centavos",
  ),
  motivo: z.string().describe("Razón de fondo de las recomendaciones mostradas"),
  sugerencias: z
    .array(ElementoSugerenciaInversion)
    .min(1)
    .describe("Lista de instrumentos o estrategias recomendadas"),
  siguientePaso: z.string().describe("Próximo paso sugerido para ejecutar"),
});

export type PropsSugerenciasInversion = z.infer<typeof schemaSugerenciasInversion>;

export const entradaSugerenciasInversion = {
  nombre: "SugerenciasInversion",
  cuandoUsarlo:
    "El cliente pregunta en qué invertir, qué hacer con su aguinaldo o ahorro libre, o cómo rentabilizar su dinero. Muestra instrumentos acordes a su perfil o redirige a saldar deuda si está en mora.",
  schema: schemaSugerenciasInversion,
  acciones: ["simular_meta", "simular_plan", "orden_rebalanceo"],
};
