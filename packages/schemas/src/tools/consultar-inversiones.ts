import { z } from "zod";
import { Centavos, FechaISO, IdUsuario } from "../comunes.js";

/**
 * `consultar_inversiones` — LECTURA.
 * Consulta integral del perfil de inversión, portafolio patrimonial activo,
 * desglose de posiciones con valuación a mercado y modelo de portafolio recomendado.
 */
export const EntradaConsultarInversiones = z.object({
  usuarioId: IdUsuario,
  perfil: z
    .enum(["conservador", "moderado", "agresivo"])
    .optional()
    .describe(
      "Para ver el modelo de OTRO perfil ('¿y si fuera agresivo?'). El perfil real de la persona no " +
        "cambia: la salida marca `perfilEsHipotetico` y `perfil` sigue siendo el suyo",
    ),
});
export type EntradaConsultarInversiones = z.infer<typeof EntradaConsultarInversiones>;

export const SalidaConsultarInversiones = z.object({
  tienePerfil: z.boolean(),
  perfil: z
    .object({
      tipo: z.string(),
      puntajeCuestionario: z.number().int(),
      horizonteMeses: z.number().int(),
      toleranciaPerdidaPct: z.number(),
      objetivo: z.string(),
      experiencia: z.string(),
      vigenteHasta: FechaISO,
      ejecutivo: z.string().nullable(),
    })
    .nullable(),
  tienePortafolio: z.boolean(),
  portafolio: z
    .object({
      id: z.string(),
      nombre: z.string(),
      perfil: z.string(),
      valorActualCentavos: Centavos,
      aportadoCentavos: Centavos,
      rendimientoAcumuladoCentavos: Centavos,
      rendimientoPct: z.number(),
      desviacionModeloPct: z.number(),
      fechaApertura: FechaISO,
    })
    .nullable(),
  posiciones: z.array(
    z.object({
      id: z.string(),
      instrumentoId: z.string(),
      nombre: z.string(),
      clave: z.string(),
      tipo: z.string(),
      riesgo: z.number().int(),
      liquidez: z.string(),
      titulos: z.number(),
      precioPromedioCentavos: Centavos,
      precioActualCentavos: Centavos,
      costoCentavos: Centavos,
      valorMercadoCentavos: Centavos,
      plusvaliaCentavos: Centavos,
      pesoPct: z.number(),
      pesoObjetivoPct: z.number(),
    }),
  ),
  modeloRecomendado: z.array(
    z.object({
      instrumentoId: z.string(),
      nombre: z.string(),
      clave: z.string(),
      tipo: z.string(),
      pesoObjetivoPct: z.number(),
    }),
  ),
  perfilDelModelo: z.string().describe("De que perfil es el `modeloRecomendado` que se devolvio"),
  perfilEsHipotetico: z
    .boolean()
    .describe(
      "true cuando el modelo es de un perfil pedido y NO el de la persona. Dilo al pintarlo: si no, " +
        "parece que su perfil cambio",
    ),
});
export type SalidaConsultarInversiones = z.infer<typeof SalidaConsultarInversiones>;
