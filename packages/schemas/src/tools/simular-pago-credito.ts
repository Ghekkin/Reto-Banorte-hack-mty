import { z } from "zod";
import { Centavos, FechaISO, IdUsuario } from "../comunes.js";

/**
 * `simular_pago_credito` — lectura (calcula, no muta). «¿Y si pago $6,000 al mes?» o
 * «quiero liquidarlo en 12 meses» sobre un credito a plazo.
 *
 * **El modelo es el abono a capital**, que es lo que un banco de verdad permite: la
 * mensualidad del contrato no baja, pero todo lo que se paga encima va directo a capital
 * y el plazo se acorta. Por eso pagar MENOS que el contrato, o liquidar en MAS meses de
 * los que faltan, no es posible aqui (eso es una reestructura) y la tool lo dice en
 * `motivo` en vez de inventarse un escenario.
 *
 * Los nombres de `EscenarioDePago` son a proposito los de las props de
 * `ProyeccionPagoCredito`: el agente parchea la tarjeta con el escenario tal cual.
 * Detalle en `docs/algoritmos/abono-a-capital.md`.
 */
export const HitoDePago = z.object({
  numeroPago: z.number().int().describe("Numero de mensualidad, contado desde que se contrato el credito"),
  periodo: FechaISO.describe("Fecha de ese pago"),
  capitalCentavos: Centavos,
  interesCentavos: Centavos.describe("Interes MAS su IVA: capital + interes = lo que se paga ese mes"),
  saldoFinalCentavos: Centavos,
});
export type HitoDePago = z.infer<typeof HitoDePago>;

export const EscenarioDePago = z.object({
  mensualidadCentavos: Centavos.describe("Lo que se paga al mes EN TOTAL: la del contrato mas el abono a capital"),
  plazoRestanteMeses: z.number().int().describe("Pagos que faltan para liquidar"),
  totalInteresesEstimadosCentavos: Centavos.describe("Intereses con IVA de hoy a liquidar"),
  fechaLiquidacion: FechaISO.describe("Fecha del ultimo pago"),
  amortizacionResumen: z
    .array(HitoDePago)
    .min(1)
    .max(4)
    .describe("Hasta 4 hitos: el proximo pago, dos intermedios y la liquidacion"),
});
export type EscenarioDePago = z.infer<typeof EscenarioDePago>;

export const EntradaSimularPagoCredito = z.object({
  usuarioId: IdUsuario,
  creditoId: z.string().describe("El credito a plazo: `creditos[].id` de `consultar_creditos` (cred_…)"),
  mensualidadCentavos: Centavos.positive()
    .optional()
    .describe("«¿y si pago $6,000 al mes?»: lo que quiere pagar al mes EN TOTAL, en centavos. Manda esto O `plazoMeses`"),
  plazoMeses: z
    .number()
    .int()
    .min(1)
    .max(360)
    .optional()
    .describe("«quiero liquidarlo en 12 meses»: en cuantos pagos desde hoy. Manda esto O `mensualidadCentavos`"),
});
export type EntradaSimularPagoCredito = z.infer<typeof EntradaSimularPagoCredito>;

export const SalidaSimularPagoCredito = z.object({
  creditoId: z.string(),
  alias: z.string(),
  tasaAnual: z.number().describe("Fraccion: 0.279 = 27.9 %"),
  saldoInsolutoCentavos: Centavos,
  mensualidadContratoCentavos: Centavos.describe("La del contrato. Con abonos a capital no se puede pagar menos que esto"),
  abonoProgramadoCentavos: Centavos.describe("El abono mensual que YA esta programado para este credito; 0 si no hay"),
  actual: EscenarioDePago.describe("Como va hoy (con el abono programado, si lo hay). Es el `antes` de la tarjeta"),
  posible: z.boolean().describe("false si lo pedido no se logra con abonos a capital"),
  motivo: z
    .string()
    .nullable()
    .describe("Si `posible` es false: por que, con el minimo o el maximo que SI funciona. Dilo con esas palabras"),
  simulado: EscenarioDePago.nullable().describe("Como quedaria. null si no es posible"),
  abonoMensualCentavos: Centavos.describe("simulado.mensualidad − la del contrato: lo que iria a capital cada mes"),
  ahorroInteresesCentavos: Centavos.describe("actual − simulado en intereses con IVA. 0 si no es posible"),
  mesesMenos: z.number().int().describe("actual − simulado en plazo. 0 si no es posible"),
  capacidadPagoMensualCentavos: Centavos.describe("Lo que buro estima que puede pagar al mes de deuda"),
  mensualidadDeudaTotalCentavos: Centavos.describe("Todo lo que pagaria al mes de deuda con este cambio, tarjeta incluida"),
  pctDelIngreso: z.number().describe("mensualidadDeudaTotal / ingreso, como fraccion"),
  aviso: z
    .string()
    .nullable()
    .describe("Si es posible pero riesgoso (rebasa su capacidad de pago): la frase para la tarjeta, tal cual"),
});
export type SalidaSimularPagoCredito = z.infer<typeof SalidaSimularPagoCredito>;
