import { z } from "zod";
import { Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `ResumenTarjeta` — la situacion de la tarjeta en una sola cifra. Es LA tarjeta heroe
 * de la fase 1 (degradado de marca) y, tras `aplicar_plan_pago`, la misma tarjeta con el
 * badge "Plan activo" y el saldo revolvente en cero: el cambio real, visible.
 *
 * Las props salen tal cual de `consultar_tarjeta`.
 */
export const schemaResumenTarjeta = PropsBase.extend({
  heroe: Heroe,
  mascara: z.string().describe("Los ultimos digitos, como los da la tool: '•••• 4821'"),
  saldoCentavos: Centavos.describe("Saldo revolvente HOY. Cero si ya se difirio a un plan"),
  limiteCentavos: Centavos.describe("Limite de la tarjeta; con el saldo sale el % de uso"),
  pagoMinimoCentavos: Centavos.optional().describe("Pago minimo del periodo; se omite si hay plan"),
  fechaLimitePago: z.string().optional().describe("AAAA-MM-DD del proximo pago o del limite de pago"),
  diasMora: z.number().int().min(0).default(0).describe("Dias de atraso; > 0 pinta el badge 'Atrasado'"),
  planActivo: z.boolean().default(false).describe("true tras aplicar_plan_pago: badge 'Plan activo'"),
  mensualidadCentavos: Centavos.optional().describe("La mensualidad fija del plan, si hay plan"),
});

export type PropsResumenTarjeta = z.infer<typeof schemaResumenTarjeta>;

export const entradaResumenTarjeta = {
  nombre: "ResumenTarjeta",
  cuandoUsarlo:
    "La persona pregunta por su tarjeta, su deuda o sus intereses y hace falta poner su situacion en una sola cifra. Casi siempre es la tarjeta heroe de la pantalla de deuda; despues de aplicar un plan, la misma tarjeta muestra 'Plan activo' con el saldo en cero.",
  schema: schemaResumenTarjeta,
  acciones: [] as string[],
};
