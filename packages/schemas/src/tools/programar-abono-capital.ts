import { z } from "zod";
import { Centavos, FechaISO, IdUsuario, LlaveIdempotencia } from "../comunes.js";
import { EscenarioDePago } from "./simular-pago-credito.js";

/**
 * `programar_abono_capital` — **ACCION**. La persona simulo pagar mas al mes y toco
 * «Programar este pago»: desde el proximo pago, lo que pase de la mensualidad del contrato
 * se abona a capital cada mes. `consultar_creditos` y `simular_pago_credito` lo reflejan a
 * partir de ese momento (mensualidad, plazo e intereses nuevos).
 *
 * Idempotente por `idempotencyKey`. Programar otra vez **reemplaza** el abono anterior
 * (gana el ultimo); programar la mensualidad del contrato lo quita.
 */
export const EntradaProgramarAbonoCapital = z.object({
  usuarioId: IdUsuario,
  creditoId: z.string().describe("El credito a plazo (cred_…)"),
  mensualidadCentavos: Centavos.positive().describe(
    "La mensualidad TOTAL que la persona eligio en pantalla (contrato + abono), en centavos",
  ),
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaProgramarAbonoCapital = z.infer<typeof EntradaProgramarAbonoCapital>;

export const SalidaProgramarAbonoCapital = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean().describe("true si la llave de idempotencia ya se habia usado: NO se programo dos veces"),
  mensaje: z.string().describe("Una linea en espanol lista para que el agente la parafrasee"),
  abono: z.object({
    creditoId: z.string(),
    alias: z.string(),
    abonoMensualCentavos: Centavos.describe("Lo que va a capital cada mes, encima del contrato"),
    mensualidadContratoCentavos: Centavos,
    desde: FechaISO.describe("El primer pago que ya lleva el abono"),
  }),
  antes: EscenarioDePago.describe("Como iba antes de programar: el `antes` de la tarjeta"),
  despues: EscenarioDePago.describe("Como queda: las props nuevas de `ProyeccionPagoCredito`"),
  ahorroInteresesCentavos: Centavos,
  mesesMenos: z.number().int(),
});
export type SalidaProgramarAbonoCapital = z.infer<typeof SalidaProgramarAbonoCapital>;
