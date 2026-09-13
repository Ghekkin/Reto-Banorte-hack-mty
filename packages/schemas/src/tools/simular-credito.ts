import { z } from "zod";
import { Centavos, FechaISO, IdUsuario } from "../comunes.js";

/**
 * `simular_credito` — lectura que CALCULA. Que pasa con un credito a plazo si se paga
 * distinto: en menos meses, con un abono extra, o con una mensualidad fija.
 *
 * **Por que existe.** `simular_reestructura` es solo para la TARJETA: exige un `tarjetaId`
 * y lanza si la persona no tiene. Para un credito a plazo la unica tool era
 * `consultar_creditos`, que lee lo pactado y nada mas. Asi que a "¿cuanto pago al mes si
 * quiero terminar en un ano?" el modelo contestaba haciendo la amortizacion de cabeza; en
 * la demo del 2026-09-12 escribio $504,785 cuando la respuesta era $5,503.20.
 *
 * La matematica ya existia entera en `dominio/finanzas.ts` —`mensualidad()` y
 * `tablaAmortizacion()` no saben nada de tarjetas—: lo que faltaba era exponerla.
 *
 * **Las tres preguntas son una sola tool** porque son la misma amortizacion leida en tres
 * direcciones, y separarlas en tres tools obligaria al modelo a elegir entre tres
 * descripciones casi iguales.
 */
export const EntradaSimularCredito = z
  .object({
    usuarioId: IdUsuario,
    creditoId: z
      .string()
      .optional()
      .describe("Cual credito. Default: el de mayor saldo. NO sirve para la tarjeta (usa simular_reestructura)"),
    plazoObjetivoMeses: z
      .number()
      .int()
      .min(1)
      .max(360)
      .optional()
      .describe("'Quiero terminar en 12 meses': devuelve la mensualidad que hace falta"),
    mensualidadObjetivoCentavos: Centavos.min(1)
      .optional()
      .describe("'Puedo pagar $6,000 al mes': devuelve en cuantos meses termina"),
    abonoExtraMensualCentavos: Centavos.min(1)
      .optional()
      .describe("'Abono $2,000 extra cada mes': devuelve cuanto se adelanta y cuanto interes se ahorra"),
  })
  .refine(
    (e) =>
      [e.plazoObjetivoMeses, e.mensualidadObjetivoCentavos, e.abonoExtraMensualCentavos].filter(
        (v) => v !== undefined,
      ).length === 1,
    {
      message:
        "manda EXACTAMENTE uno: `plazoObjetivoMeses`, `mensualidadObjetivoCentavos` o " +
        "`abonoExtraMensualCentavos`. Son tres preguntas distintas y cada una tiene su respuesta",
    },
  );
export type EntradaSimularCredito = z.infer<typeof EntradaSimularCredito>;

/** Un punto del camino nuevo, para pintar la curva sin que nadie derive nada. */
export const HitoDeLiquidacion = z.object({
  numeroPago: z.number().int(),
  fecha: FechaISO,
  mensualidadCentavos: Centavos,
  capitalCentavos: Centavos,
  interesCentavos: Centavos.describe("Interes con IVA incluido: es lo que de verdad se paga"),
  saldoFinalCentavos: Centavos,
});
export type HitoDeLiquidacion = z.infer<typeof HitoDeLiquidacion>;

export const SalidaSimularCredito = z.object({
  creditoId: z.string(),
  alias: z.string(),
  saldoInsolutoCentavos: Centavos.describe("Lo que se debe hoy: el punto de partida de la simulacion"),
  tasaAnual: z.number(),

  mensualidadActualCentavos: Centavos.describe("Lo que paga hoy, tal como esta pactado"),
  plazoRestanteActualMeses: z.number().int().describe("Cuantos pagos le faltan con el plan actual"),
  interesesActualesCentavos: Centavos.describe("Los intereses con IVA que le quedan por pagar si no cambia nada"),

  mensualidadNuevaCentavos: Centavos.describe("Lo que pagaria al mes en el escenario simulado"),
  plazoNuevoMeses: z.number().int().describe("En cuantos meses terminaria"),
  interesesNuevosCentavos: Centavos.describe("Los intereses con IVA del escenario simulado"),

  ahorroInteresesCentavos: z
    .number()
    .int()
    .describe("Cuanto interes se ahorra. NEGATIVO si el escenario sale mas caro (alargar el plazo)"),
  mesesQueAdelanta: z.number().int().describe("Cuantos meses antes termina. Negativo si termina despues"),
  diferenciaMensualCentavos: z
    .number()
    .int()
    .describe("Cuanto mas (o menos) tendria que pagar cada mes. Es el numero que decide si puede o no"),

  capacidadPagoMensualCentavos: Centavos.describe("Lo que el banco calcula que puede pagar al mes"),
  dentroDeCapacidad: z
    .boolean()
    .describe("false: se puede, pero no le alcanza. Dilo en vez de recomendarlo a secas"),
  nuncaLiquida: z
    .boolean()
    .describe("true cuando el pago propuesto no cubre ni el interes: no hay plazo que devolver"),
  amortizacionResumen: z.array(HitoDeLiquidacion).describe("Los primeros pagos del escenario nuevo"),
  advertencia: z.string().nullable(),
});
export type SalidaSimularCredito = z.infer<typeof SalidaSimularCredito>;
