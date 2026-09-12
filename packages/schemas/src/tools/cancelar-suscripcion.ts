import { z } from "zod";
import { Centavos, FechaISO, IdUsuario, LlaveIdempotencia } from "../comunes.js";

/**
 * `cancelar_suscripcion` — ACCION. Cancela una suscripción activa de la persona.
 * Produce un cambio real reflejado de inmediato en el estado mutable: la siguiente
 * lectura de fugas y de gasto mensual reduce el monto de suscripciones.
 *
 * Idempotente por `idempotencyKey`.
 */
export const EntradaCancelarSuscripcion = z.object({
  usuarioId: IdUsuario,
  suscripcionId: z.string().describe("ID de la suscripción a cancelar (e.g. 'sus_ana_netflix')"),
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaCancelarSuscripcion = z.infer<typeof EntradaCancelarSuscripcion>;

export const SalidaCancelarSuscripcion = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean(),
  mensaje: z.string(),
  suscripcion: z.object({
    id: z.string(),
    concepto: z.string(),
    comercio: z.string(),
    montoCentavos: Centavos,
    fechaCancelacion: FechaISO,
  }),
  efecto: z.object({
    ahorroMensualCentavos: Centavos,
    ahorroAnualCentavos: Centavos,
    suscripcionesRestantes: z.number().int(),
    nuevoTotalMensualCentavos: Centavos,
  }),
});
export type SalidaCancelarSuscripcion = z.infer<typeof SalidaCancelarSuscripcion>;
