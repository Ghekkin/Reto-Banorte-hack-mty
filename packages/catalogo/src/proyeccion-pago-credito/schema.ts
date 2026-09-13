import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `ProyeccionPagoCredito` — cuánto falta para terminar de pagar un crédito a plazo, de qué
 * se compone y, desde el 2026-09-13, **cómo quedaría pagando más al mes**.
 *
 * La misma tarjeta vive tres momentos sin volver a pintarse (ciclo live, `ajustar_pantalla`):
 *
 *  1. **Como va**: los datos de `consultar_creditos`.
 *  2. **Simulada**: «¿y si pago $6,000 al mes?» → `simular_pago_credito`, y el agente
 *     parchea las cuatro props del escenario con `simulado` y `antes` con `actual`. Aparece
 *     la línea «antes → después» y el botón «Programar este pago».
 *  3. **Programada**: el botón dispara `programar_abono_capital`; el agente vuelve a
 *     parchear con `despues`, `antes` y `programado: true`. Badge, sin botón.
 *
 * Los nombres de las props del escenario son a propósito los de `EscenarioDePago`
 * (`packages/schemas/src/tools/simular-pago-credito.ts`): el parche es el escenario tal cual.
 * Todo lo nuevo es opcional: lo que ya estaba pintado sigue validando.
 */
export const HitoAmortizacion = z.object({
  numeroPago: z.number().int().describe("Número de mensualidad; puede venir contado desde la contratación (así lo manda la tool)"),
  periodo: z
    .string()
    .describe("Fecha ISO del pago (AAAA-MM-DD, como la manda la tool) o una etiqueta corta ('Próximo pago', 'Liquidación')"),
  capitalCentavos: Centavos.describe("Lo que ese pago abona a capital"),
  interesCentavos: Centavos.describe("El interés de ese pago, con su IVA: capital + interés = lo que se paga ese mes"),
  saldoFinalCentavos: Centavos.describe("Saldo insoluto restante tras el pago"),
});

/** Lo mínimo del escenario anterior para decir «antes 15 meses». Acepta el `actual` de la tool tal cual. */
export const EscenarioAntes = z.object({
  mensualidadCentavos: Centavos.describe("Lo que se pagaba al mes EN TOTAL antes del cambio"),
  plazoRestanteMeses: z.number().int().describe("Meses que faltaban antes del cambio"),
  totalInteresesEstimadosCentavos: Centavos.describe("Intereses con IVA que faltaban antes del cambio"),
});

export const schemaProyeccionPagoCredito = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  creditoId: z.string().describe("ID del crédito (cred_…): `creditos[].id` de `consultar_creditos`. Viaja en la acción"),
  alias: z.string().describe("Nombre del crédito (ej. 'Crédito de Nómina')"),
  saldoInsolutoCentavos: Centavos.describe("Saldo insoluto pendiente de pago. No cambia al simular"),
  mensualidadCentavos: Centavos.describe(
    "Lo que se paga al mes EN TOTAL. Al simular o programar: `simulado.mensualidadCentavos` / `despues.mensualidadCentavos`",
  ),
  tasaAnualPct: z.number().describe("Tasa de interés anual ordinaria como fracción (ej. 0.245 = 24.5%)"),
  plazoRestanteMeses: z
    .number()
    .int()
    .min(1)
    .max(360)
    .describe("Meses que faltan para liquidar. Al simular o programar: el del escenario"),
  totalInteresesEstimadosCentavos: Centavos.describe(
    "Intereses con IVA de hoy a liquidar. Al simular o programar: el del escenario",
  ),
  fechaLiquidacion: z
    .string()
    .optional()
    .describe("Fecha ISO del último pago (AAAA-MM-DD): `fechaLiquidacion` del escenario, si lo parcheas entero"),
  amortizacionResumen: z
    .array(HitoAmortizacion)
    .min(1)
    .describe("De 1 a 4 hitos: el próximo pago, intermedios y la liquidación. Al simular o programar: los del escenario"),
  antes: EscenarioAntes.optional().describe(
    "Cómo iba ANTES del cambio: el `actual` de `simular_pago_credito` o el `antes` de `programar_abono_capital`. " +
      "Presente = hay una comparación que mostrar («Terminas en 11 meses (antes 15)»). Déjalo fuera al pintar la tarjeta por primera vez",
  ),
  mensualidadContratoCentavos: Centavos.optional().describe(
    "La mensualidad del contrato (`mensualidadContratoCentavos` de la tool). Si `mensualidadCentavos` es mayor, la tarjeta dice cuánto va a capital",
  ),
  programado: z
    .boolean()
    .optional()
    .describe("true SOLO después de que `programar_abono_capital` respondió `aplicado`: badge «Abono programado» y sin botón. Al simular, false"),
  aviso: z
    .string()
    .optional()
    .describe("El `aviso` de `simular_pago_credito` tal cual, si no es null (posible pero rebasa su capacidad de pago). Si es null, déjalo fuera"),
  etiquetaBoton: z.string().default("Programar este pago").describe("Texto del botón que programa el abono"),
  ahorroConAbonoCapitalCentavos: Centavos.optional().describe(
    "Obsoleto: no lo pongas. El ahorro de pagar más al mes lo dice la comparación con `antes`",
  ),
});

export type PropsProyeccionPagoCredito = z.infer<typeof schemaProyeccionPagoCredito>;
export type PropsEscenarioAntes = z.infer<typeof EscenarioAntes>;

export const entradaProyeccionPagoCredito = {
  nombre: "ProyeccionPagoCredito",
  cuandoUsarlo:
    "La persona pregunta '¿Cuánto me falta para terminar de pagar mi crédito?' o '¿Cuánto pagaré de puros intereses?', o pregunta por intereses y su deuda es un crédito a plazo (no una tarjeta). " +
    "Los datos salen de `consultar_creditos` con `incluirAmortizacion: true` y `proximosPagos: 12`: la tabla da los hitos. " +
    "`totalInteresesEstimadosCentavos` = `mensualidadCentavos` × `pagosRestantes` − `saldoInsolutoCentavos`. " +
    "Si con la tarjeta YA en pantalla pregunta '¿y si pago $6,000 al mes?' o 'quiero liquidarlo en 12 meses': llama `simular_pago_credito` y, si `posible`, usa `ajustar_pantalla` sobre ESTA tarjeta (no pintes otra): " +
    "`mensualidadCentavos`, `plazoRestanteMeses`, `totalInteresesEstimadosCentavos`, `fechaLiquidacion` y `amortizacionResumen` con los de `simulado`; `antes` con `actual`; `mensualidadContratoCentavos`; `aviso` si no es null; `programado: false`. " +
    "Si no es posible, no parchees: di el `motivo`. El botón «Programar este pago» dispara `programar_abono_capital` con { creditoId, mensualidadCentavos } en el context; " +
    "cuando la tool responda `aplicado`, vuelve a ajustar la misma tarjeta con `despues`, `antes` y `programado: true`.",
  schema: schemaProyeccionPagoCredito,
  // El boton solo aparece con una simulacion en pantalla (`antes` distinto y sin programar);
  // el host le pone esta accion por default al pintar la tarjeta (`completarAccion`).
  acciones: ["programar_abono_capital"],
};
