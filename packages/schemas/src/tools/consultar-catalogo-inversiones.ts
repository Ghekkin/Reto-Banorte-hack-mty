import { z } from "zod";
import { Centavos } from "../comunes.js";

/**
 * `consultar_catalogo_inversiones` — LECTURA.
 * Explora los instrumentos de inversión disponibles en Banorte (CETES, fondos de deuda,
 * fondos de renta variable, ETFs, pagarés y acciones) con filtros por tipo, riesgo y monto mínimo.
 */
export const EntradaConsultarCatalogoInversiones = z.object({
  tipo: z
    .string()
    .optional()
    .describe(
      "Filtro opcional por tipo de instrumento: 'deuda_gubernamental', 'fondo_deuda', 'pagare', 'fondo_renta_variable', 'etf', 'renta_variable', 'deuda_corporativa'",
    ),
  riesgoMaximo: z.number().int().min(1).max(5).optional().describe("Riesgo máximo en escala de 1 a 5"),
  montoDisponibleCentavos: Centavos.optional().describe("Monto en centavos disponible para filtrar instrumentos accesibles"),
});
export type EntradaConsultarCatalogoInversiones = z.infer<typeof EntradaConsultarCatalogoInversiones>;

export const SalidaConsultarCatalogoInversiones = z.object({
  total: z.number().int(),
  instrumentos: z.array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      clave: z.string(),
      tipo: z.string(),
      emisora: z.string(),
      moneda: z.string(),
      plazoDias: z.number().int().nullable(),
      rendimientoAnualEsperado: z.number(),
      volatilidadAnual: z.number(),
      riesgo: z.number().int(),
      liquidez: z.string(),
      montoMinimoCentavos: Centavos,
      precioActualCentavos: Centavos,
    }),
  ),
});
export type SalidaConsultarCatalogoInversiones = z.infer<typeof SalidaConsultarCatalogoInversiones>;
