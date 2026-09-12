import { z } from "zod";
import { Centavos, FechaISO, IdTarjeta, IdUsuario } from "../comunes.js";

/**
 * `consultar_tarjeta` — lectura. La foto de la deuda revolvente: es la tool que
 * le dice al agente si esta hablando con alguien atorado (Beto, 97 % del limite,
 * 12 dias de mora) o con alguien sin deuda (Ana, que no trae tarjeta de credito).
 * De esa diferencia sale que la interfaz sea otra.
 *
 * **Refleja el estado**: si ya se aplico un plan de pago, el saldo revolvente
 * queda en cero, el limite se libera y `planActivo` trae la mensualidad. Es el
 * "cambio real" del reto visto desde una lectura posterior.
 */
export const EntradaConsultarTarjeta = z.object({
  usuarioId: IdUsuario,
  tarjetaId: IdTarjeta.optional().describe("Solo si la persona tiene mas de una; por defecto la de credito"),
});
export type EntradaConsultarTarjeta = z.infer<typeof EntradaConsultarTarjeta>;

/** Por que el agente deberia preocuparse. Ordenado de peor a mejor. */
export const AlertaTarjeta = z.enum([
  "mora",
  "al_limite",
  "uso_alto",
  "plan_activo",
  "saludable",
  "sin_tarjeta_credito",
]);
export type AlertaTarjeta = z.infer<typeof AlertaTarjeta>;

export const PlanActivo = z.object({
  id: z.string(),
  plazoMeses: z.number().int(),
  mensualidadCentavos: Centavos,
  tasaAnual: z.number(),
  cat: z.number(),
  saldoDiferidoCentavos: Centavos,
  aplicadoEn: z.string().describe("ISO con hora: cuando se aplico la accion"),
  primerPagoFecha: FechaISO,
});
export type PlanActivo = z.infer<typeof PlanActivo>;

export const SalidaConsultarTarjeta = z.object({
  tarjeta: z
    .object({
      id: IdTarjeta,
      marca: z.string(),
      producto: z.string(),
      mascara: z.string(),
      limiteCentavos: Centavos,
      saldoCentavos: Centavos.describe("Saldo revolvente HOY; cero si el saldo ya se difirio a un plan"),
      usoDelLimite: z.number().describe("Fraccion: 0.968 = 96.8 % del limite usado"),
      tasaAnual: z.number(),
      cat: z.number(),
      pagoMinimoCentavos: Centavos,
      fechaLimitePago: FechaISO,
      diasMora: z.number().int(),
      estatus: z.string(),
    })
    .nullable()
    .describe("null cuando la persona no tiene tarjeta de credito: el agente debe ofrecer otra cosa"),
  interesesUltimoMesCentavos: Centavos.describe("Lo que se le fue en intereses y comisiones el ultimo mes"),
  planActivo: PlanActivo.nullable(),
  alerta: AlertaTarjeta,
});
export type SalidaConsultarTarjeta = z.infer<typeof SalidaConsultarTarjeta>;
