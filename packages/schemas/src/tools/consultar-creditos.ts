import { z } from "zod";
import { Centavos, FechaISO, IdTarjeta, IdUsuario } from "../comunes.js";

/**
 * `consultar_creditos` — lectura. Toda la deuda de la persona, no solo la tarjeta.
 *
 * Sin esta tool el agente solo ve el saldo revolvente: si Ana pregunta "¿cuanto
 * debo?", contesta $0 cuando en realidad trae $55,783 de credito personal. Eso no es
 * una tabla de sobra, es una respuesta equivocada.
 *
 * **La tarjeta va aparte**: en los datos, la tarjeta de credito aparece tambien como
 * una fila de `creditos` (`tarjeta_id` lleno). Sumarla ahi Y en `consultar_tarjeta`
 * contaria la deuda dos veces, asi que aqui las filas con `tarjeta_id` se excluyen de
 * `creditos[]` y la tarjeta se reporta en su propio campo, con el estado ya encima.
 */
export const EntradaConsultarCreditos = z.object({
  usuarioId: IdUsuario,
  creditoId: z.string().optional().describe("Solo uno; por defecto todos"),
  incluirAmortizacion: z
    .boolean()
    .optional()
    .describe("true: agrega los proximos pagos de cada credito. Default false, la salida es mas corta"),
  proximosPagos: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe("Cuantos pagos futuros traer cuando `incluirAmortizacion`. Default 3"),
});
export type EntradaConsultarCreditos = z.infer<typeof EntradaConsultarCreditos>;

/** Una fila de la tabla de amortizacion del credito. */
export const PagoDeAmortizacion = z.object({
  numeroPago: z.number().int(),
  fecha: FechaISO,
  mensualidadCentavos: Centavos,
  capitalCentavos: Centavos,
  interesCentavos: Centavos,
  ivaInteresCentavos: Centavos,
  saldoFinalCentavos: Centavos,
  estatus: z.string().describe("pagado | pendiente"),
});
export type PagoDeAmortizacion = z.infer<typeof PagoDeAmortizacion>;

export const CreditoVigente = z.object({
  id: z.string(),
  alias: z.string().describe("Como lo llama la persona: 'Credito Personal', 'Auto 2024'"),
  tipo: z.string().describe("personal | nomina | auto | hipotecario"),
  producto: z.string().describe("Nombre comercial del producto del banco"),
  montoOriginalCentavos: Centavos,
  saldoInsolutoCentavos: Centavos,
  tasaAnual: z.number(),
  cat: z.number(),
  plazoMeses: z.number().int(),
  pagosRealizados: z.number().int(),
  pagosRestantes: z.number().int(),
  avancePct: z.number().describe("Fraccion del plazo ya cubierta: 0.375 = 9 de 24 pagos"),
  mensualidadCentavos: Centavos.describe("Lo que paga al mes: la del contrato mas el abono a capital programado, si lo hay"),
  mensualidadContratoCentavos: Centavos.optional().describe("La del contrato, sin abono"),
  abonoMensualCentavos: Centavos.optional().describe("El abono a capital programado cada mes (`programar_abono_capital`); 0 si no hay"),
  fechaProximoPago: FechaISO,
  diasMora: z.number().int(),
  estatus: z.string(),
  amortizacion: z.array(PagoDeAmortizacion).describe("Vacio si no se pidio `incluirAmortizacion`"),
});
export type CreditoVigente = z.infer<typeof CreditoVigente>;

export const SalidaConsultarCreditos = z.object({
  deudaTotalCentavos: Centavos.describe("Creditos + lo que se deba en la tarjeta. La respuesta a '¿cuanto debo?'"),
  deudaCreditosCentavos: Centavos,
  deudaTarjetaCentavos: Centavos.describe("Saldo revolvente, o el saldo diferido si ya hay un plan activo"),
  mensualidadTotalCentavos: Centavos.describe("Lo que se le va cada mes en pagos de deuda"),
  ratioDeudaIngreso: z.number().describe("Fraccion: 0.1583 = 15.83 % del ingreso comprometido. Arriba de 0.35 es alto"),
  creditos: z.array(CreditoVigente).describe("Sin la tarjeta: esa va en `tarjeta`"),
  tarjeta: z
    .object({
      id: IdTarjeta,
      producto: z.string(),
      saldoCentavos: Centavos,
      mensualidadCentavos: Centavos.describe("Pago minimo, o la mensualidad del plan si ya lo aplico"),
      tienePlanActivo: z.boolean(),
      diasMora: z.number().int(),
    })
    .nullable()
    .describe("null cuando la persona no tiene tarjeta de credito"),
  creditoMasCaroId: z
    .string()
    .nullable()
    .describe("El de mayor CAT, incluida la tarjeta: es el que conviene liquidar primero"),
  proximoPago: z
    .object({ creditoId: z.string(), alias: z.string(), fecha: FechaISO, montoCentavos: Centavos })
    .nullable(),
});
export type SalidaConsultarCreditos = z.infer<typeof SalidaConsultarCreditos>;
