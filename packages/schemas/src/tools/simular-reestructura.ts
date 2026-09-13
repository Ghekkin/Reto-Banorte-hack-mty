import { z } from "zod";
import { Centavos, IdTarjeta, IdUsuario } from "../comunes.js";

/**
 * `simular_reestructura` — lectura (calculo, no muta nada). El corazon de la
 * fase 1: convierte el saldo revolvente en mensualidades fijas y lo compara con
 * seguir pagando el minimo. El numero que la UI pone grande es
 * `ahorroVsMinimoCentavos`, y sale de aqui, no del componente.
 *
 * La matematica esta en `docs/algoritmos/amortizacion.md` y la eleccion de tasa
 * y de plan recomendado en `docs/algoritmos/oferta-de-reestructura.md`.
 */
export const EntradaSimularReestructura = z.object({
  usuarioId: IdUsuario,
  tarjetaId: IdTarjeta.optional().describe("Por defecto, la tarjeta de credito de la persona"),
  plazosMeses: z
    .array(z.number().int().min(3).max(60))
    .optional()
    .describe("Plazos a cotizar. Default: 12, 18, 24 y 36 meses"),
});
export type EntradaSimularReestructura = z.infer<typeof EntradaSimularReestructura>;

export const OpcionReestructura = z.object({
  plazoMeses: z.number().int(),
  tasaAnual: z.number().describe("Fraccion: 0.219 = 21.9 % anual"),
  cat: z.number().describe("Fraccion: 0.2858 = 28.58 %"),
  mensualidadCentavos: Centavos,
  totalAPagarCentavos: Centavos,
  interesesTotalesCentavos: Centavos,
  ahorroVsMinimoCentavos: Centavos.describe("Cuanto se ahorra contra seguir pagando el minimo"),
  mesesVsMinimo: z.number().int().describe("Cuantos meses antes termina de pagar"),
  cabeEnCapacidad: z.boolean().describe("La mensualidad cabe en lo que puede pagar al mes por la tarjeta (`capacidadPagoMensualCentavos`)"),
  esRecomendado: z.boolean(),
});
export type OpcionReestructura = z.infer<typeof OpcionReestructura>;

export const SalidaSimularReestructura = z.object({
  tarjetaId: IdTarjeta,
  saldoADiferirCentavos: Centavos,
  tasaTarjetaAnual: z.number(),
  capacidadPagoMensualCentavos: Centavos.describe(
    "Lo que puede pagar al mes por la tarjeta: su techo de deuda menos lo que ya paga de creditos a plazo. Incluye el minimo que el plan reemplaza",
  ),
  escenarioMinimo: z.object({
    meses: z.number().int().nullable().describe("null si pagando el minimo nunca liquida"),
    totalPagadoCentavos: Centavos.nullable(),
    nuncaLiquida: z.boolean(),
  }),
  opciones: z.array(OpcionReestructura),
  plazoRecomendado: z.number().int().nullable(),
});
export type SalidaSimularReestructura = z.infer<typeof SalidaSimularReestructura>;
