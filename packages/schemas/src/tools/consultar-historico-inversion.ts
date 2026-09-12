import { z } from "zod";
import { Centavos, FechaISO } from "../comunes.js";

/**
 * `consultar_historico_inversion` — LECTURA.
 * Consulta la serie histórica semanal de precios de un instrumento de inversión
 * (respaldado por la tabla `precios_historicos`) y calcula el rendimiento en el periodo analizado.
 */
export const EntradaConsultarHistoricoInversion = z.object({
  instrumentoId: z
    .string()
    .describe("ID del instrumento financiero (ej: 'inst_cetes_28', 'inst_naftrac', 'inst_fondo_rv_glo')"),
  semanas: z
    .number()
    .int()
    .min(2)
    .max(52)
    .optional()
    .describe("Número de semanas hacia atrás a consultar (default: 12)"),
});
export type EntradaConsultarHistoricoInversion = z.infer<typeof EntradaConsultarHistoricoInversion>;

export const SalidaConsultarHistoricoInversion = z.object({
  instrumento: z.object({
    id: z.string(),
    nombre: z.string(),
    clave: z.string(),
    tipo: z.string(),
    precioActualCentavos: Centavos,
  }),
  semanasConsultadas: z.number().int(),
  precioInicialCentavos: Centavos,
  precioFinalCentavos: Centavos,
  rendimientoPeriodoPct: z.number(),
  puntos: z.array(
    z.object({
      fecha: FechaISO,
      precioCierreCentavos: Centavos,
      variacionPct: z.number(),
    }),
  ),
});
export type SalidaConsultarHistoricoInversion = z.infer<typeof SalidaConsultarHistoricoInversion>;
