import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `ProyeccionPagoCredito` — Muestra la trayectoria de amortización de un crédito,
 * desglosando la evolución del saldo insoluto, el pago a capital y los intereses acumulados.
 * Proviene de `consultar_creditos` y `simular_reestructura`.
 */
export const HitoAmortizacion = z.object({
  numeroPago: z.number().int().describe("Número de mensualidad"),
  periodo: z.string().describe("Etiqueta temporal (ej. 'Mes 1', 'Mes 6', 'Mes 12', 'Liquidación')"),
  capitalCentavos: Centavos.describe("Amortización directa a capital acumulada o del periodo"),
  interesCentavos: Centavos.describe("Intereses devengados"),
  saldoFinalCentavos: Centavos.describe("Saldo insoluto restante tras el pago"),
});

export const schemaProyeccionPagoCredito = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  creditoId: z.string().describe("ID del crédito consultado"),
  alias: z.string().describe("Nombre comercial o alias de la persona (ej. 'Crédito de Nómina')"),
  saldoInsolutoCentavos: Centavos.describe("Saldo insoluto pendiente de pago"),
  mensualidadCentavos: Centavos.describe("Monto del pago mensual regular"),
  tasaAnualPct: z.number().describe("Tasa de interés anual ordinaria como fracción (ej. 0.245 = 24.5%)"),
  plazoRestanteMeses: z.number().int().min(1).max(360).describe("Meses faltantes para liquidar el crédito"),
  totalInteresesEstimadosCentavos: Centavos.describe("Suma total de intereses a pagar si se mantiene el calendario"),
  ahorroConAbonoCapitalCentavos: Centavos.optional().describe("Ahorro estimado en intereses con un abono extraordinario a capital"),
  amortizacionResumen: z.array(HitoAmortizacion).min(2).describe("Hitos clave de la tabla de amortización"),
});

export type PropsProyeccionPagoCredito = z.infer<typeof schemaProyeccionPagoCredito>;

export const entradaProyeccionPagoCredito = {
  nombre: "ProyeccionPagoCredito",
  cuandoUsarlo:
    "La persona pregunta '¿Cuánto me falta para terminar de pagar mi crédito?', '¿Cuánto pagaré de puros intereses?' o busca simular abonos extraordinarios a capital. Dispara simular_abono_capital.",
  schema: schemaProyeccionPagoCredito,
  acciones: ["simular_abono_capital"],
};
