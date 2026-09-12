import { z } from "zod";
import { Centavos, PropsBase } from "../comunes";

/**
 * `Calendario` — cuando y cuanto toca pagar o aportar. Generico a proposito: lo usa la
 * fase 1 (los pagos del plan, de `consultar_plan.calendario`) y la fase 3 (las
 * aportaciones de la meta). Reutilizacion visible ante el jurado (ADR 0004).
 */
export const EventoDelCalendario = z.object({
  fecha: z.string().describe("AAAA-MM-DD"),
  montoCentavos: Centavos,
  etiqueta: z.string().optional().describe("'Pago 1 de 18', 'Aportación quincenal'…"),
  estado: z
    .enum(["proximo", "pendiente", "pagado", "aportado"])
    .default("pendiente")
    .describe("proximo = el que sigue (se resalta); pagado/aportado = ya ocurrio"),
});

export const schemaCalendario = PropsBase.extend({
  titulo: z.string().default("Tus próximos pagos").describe("'Tus próximos pagos' / 'Tus aportaciones'"),
  eventos: z.array(EventoDelCalendario).describe("En orden cronologico"),
  maximo: z.number().int().min(1).max(36).default(6).describe("Cuantas filas mostrar; el resto se resume"),
  totalCentavos: Centavos.optional().describe("La suma de todo el calendario, si quieres mostrarla al pie"),
});

export type PropsCalendario = z.infer<typeof schemaCalendario>;

export const entradaCalendario = {
  nombre: "Calendario",
  cuandoUsarlo:
    "Despues de aplicar un plan o crear un apartado: cuando y cuanto toca pagar o aportar, fila por fila. Va junto a la Confirmacion, nunca antes de la accion.",
  schema: schemaCalendario,
  acciones: [] as string[],
};
