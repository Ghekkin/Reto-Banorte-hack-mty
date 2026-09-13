import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `TermometroSaludFinanciera` — Visualiza el diagnóstico holístico de salud financiera (0 a 100)
 * y los ratios determinantes: endeudamiento, capacidad de ahorro y cobertura de emergencia.
 * Procede de `diagnostico_salud_financiera`.
 */
export const schemaTermometroSaludFinanciera = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  puntajeSalud: z.number().int().min(0).max(100).describe("Puntaje integral de salud financiera del 0 al 100"),
  calificacion: z.enum(["critica", "fragil", "estable", "sana"]).describe("Calificación cualitativa del estado financiero"),
  tendencia: z.enum(["mejora", "estable", "empeora"]).describe("Dirección de la salud respecto al mes previo"),
  cambioVsMesAnterior: z.number().int().describe("Puntos que varió el puntaje contra el mes anterior"),
  ratioDeudaIngresoPct: z.number().describe("Porcentaje del ingreso mensual comprometido en pago de deudas"),
  tasaAhorroPct: z.number().describe("Porcentaje del ingreso ahorrado de forma recurrente"),
  mesesFondoEmergencia: z.number().describe("Meses de gasto que cubre el saldo líquido actual"),
  montoAhorradoCentavos: Centavos.describe("Saldo total acumulado en ahorro líquido"),
  habito: z.string().optional().describe("Diagnóstico o hábito clave identificado por el modelo"),
});

export type PropsTermometroSaludFinanciera = z.infer<typeof schemaTermometroSaludFinanciera>;

export const entradaTermometroSaludFinanciera = {
  nombre: "TermometroSaludFinanciera",
  cuandoUsarlo:
    "La persona pregunta '¿Cómo están mis finanzas?', '¿Cuál es mi diagnóstico?' o el agente resume su salud integral antes de proponer metas. Muestra el score 0-100 y pilares. Dispara ver_como_mejorar.",
  schema: schemaTermometroSaludFinanciera,
  acciones: ["ver_como_mejorar"],
};
