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
  ahorroConAbonoCapitalCentavos: Centavos.optional().describe(
    "Ahorro en intereses con un abono extraordinario a capital. SOLO si una tool lo calculo; hoy ninguna lo hace, asi que dejalo fuera en vez de estimarlo",
  ),
  amortizacionResumen: z.array(HitoAmortizacion).min(2).describe("Hitos clave de la tabla de amortización"),
});

export type PropsProyeccionPagoCredito = z.infer<typeof schemaProyeccionPagoCredito>;

export const entradaProyeccionPagoCredito = {
  nombre: "ProyeccionPagoCredito",
  cuandoUsarlo:
    "La persona pregunta '¿Cuánto me falta para terminar de pagar mi crédito?' o '¿Cuánto pagaré de puros intereses?', o pregunta por intereses y su deuda es un crédito a plazo (no una tarjeta). " +
    "Los datos salen de `consultar_creditos` con `incluirAmortizacion: true` y `proximosPagos: 12`: la tabla da los hitos. " +
    "`totalInteresesEstimadosCentavos` = `mensualidadCentavos` × `pagosRestantes` − `saldoInsolutoCentavos` (lo que falta pagar de puros intereses). " +
    "No lleva boton: todavia no hay tool que simule un abono a capital.",
  schema: schemaProyeccionPagoCredito,
  // Sin acciones: `simular_abono_capital` no lo atendia ninguna tool del MCP, asi que el boton
  // mandaba al agente una accion sin destino (ver la bitacora de parlack, 2026-09-12 13:30).
  acciones: [] as string[],
};
