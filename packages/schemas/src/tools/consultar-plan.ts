import { z } from "zod";
import { Centavos, FechaISO, IdTarjeta, IdUsuario } from "../comunes.js";

/**
 * `consultar_plan` — lectura. Es la mitad que cierra el ciclo: despues de
 * `aplicar_plan_pago`, esta tool ya devuelve el plan y su calendario. Si el
 * agente la llama antes, devuelve `hayPlan: false` y nada mas.
 *
 * El calendario es la tabla de amortizacion real (`docs/algoritmos/amortizacion.md`),
 * no una aproximacion: lo que ve la persona es lo que pagaria.
 */
export const EntradaConsultarPlan = z.object({
  usuarioId: IdUsuario,
  incluirCalendario: z.boolean().optional().describe("true (default) trae los pagos uno por uno"),
});
export type EntradaConsultarPlan = z.infer<typeof EntradaConsultarPlan>;

export const PagoDelPlan = z.object({
  numeroPago: z.number().int(),
  fecha: FechaISO,
  mensualidadCentavos: Centavos,
  capitalCentavos: Centavos,
  interesCentavos: Centavos,
  ivaInteresCentavos: Centavos,
  saldoFinalCentavos: Centavos,
});
export type PagoDelPlan = z.infer<typeof PagoDelPlan>;

export const SalidaConsultarPlan = z.object({
  hayPlan: z.boolean(),
  plan: z
    .object({
      id: z.string(),
      tarjetaId: IdTarjeta,
      plazoMeses: z.number().int(),
      tasaAnual: z.number(),
      cat: z.number(),
      saldoDiferidoCentavos: Centavos,
      mensualidadCentavos: Centavos,
      totalAPagarCentavos: Centavos,
      interesesTotalesCentavos: Centavos,
      ahorroVsMinimoCentavos: Centavos,
      aplicadoEn: z.string(),
      primerPagoFecha: FechaISO,
      ultimoPagoFecha: FechaISO,
    })
    .nullable(),
  calendario: z.array(PagoDelPlan),
});
export type SalidaConsultarPlan = z.infer<typeof SalidaConsultarPlan>;
