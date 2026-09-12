import { z } from "zod";
import { Centavos, FechaISO, IdTarjeta, IdUsuario, LlaveIdempotencia } from "../comunes.js";

/**
 * `aplicar_plan_pago` — **ACCION**. La que hace que el reto se cumpla: cambia el
 * estado de verdad y la siguiente lectura lo refleja (el saldo revolvente queda
 * en cero, el limite se libera, aparece una mensualidad fija).
 *
 * Es idempotente por `idempotencyKey`: dos llamadas con la misma llave aplican
 * un solo cambio. El agente la llama cuando le llega la accion A2UI del mismo
 * nombre (contrato agente-cliente).
 */
export const EntradaAplicarPlanPago = z.object({
  usuarioId: IdUsuario,
  tarjetaId: IdTarjeta,
  plazoMeses: z.number().int().min(3).max(60).describe("El plazo que la persona eligio en pantalla"),
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaAplicarPlanPago = z.infer<typeof EntradaAplicarPlanPago>;

export const SalidaAplicarPlanPago = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean().describe("true si la llave de idempotencia ya se habia usado: NO se aplico dos veces"),
  mensaje: z.string().describe("Una linea en espanol lista para que el agente la parafrasee"),
  plan: z.object({
    id: z.string(),
    plazoMeses: z.number().int(),
    tasaAnual: z.number(),
    cat: z.number(),
    saldoDiferidoCentavos: Centavos,
    mensualidadCentavos: Centavos,
    totalAPagarCentavos: Centavos,
    ahorroVsMinimoCentavos: Centavos,
    primerPagoFecha: FechaISO,
    ultimoPagoFecha: FechaISO,
  }),
  /** Lo que cambio, para que el agente lo diga sin tener que volver a leer. */
  efecto: z.object({
    saldoRevolventeAntesCentavos: Centavos,
    saldoRevolventeDespuesCentavos: Centavos,
    usoDelLimiteAntes: z.number(),
    usoDelLimiteDespues: z.number(),
    interesesMensualesEvitadosCentavos: Centavos,
  }),
});
export type SalidaAplicarPlanPago = z.infer<typeof SalidaAplicarPlanPago>;
