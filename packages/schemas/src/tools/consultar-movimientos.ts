import { z } from "zod";
import { Centavos, FechaISO, IdCuenta, IdUsuario } from "../comunes.js";

/**
 * `consultar_movimientos` — lectura. El detalle: que se cobro, cuando, de quien.
 * La usa el agente cuando la persona pregunta por una categoria concreta
 * ("¿que son esos $4,800 de restaurantes?") y para justificar cualquier numero
 * grande que ponga en pantalla.
 *
 * Devuelve SIEMPRE los totales del filtro completo y solo `limite` filas: el
 * historial del modelo es chico a proposito (ADR 0005, disciplina de prompt).
 */
export const EntradaConsultarMovimientos = z.object({
  usuarioId: IdUsuario,
  desde: FechaISO.optional().describe("Inclusivo. Por defecto, los ultimos 30 dias"),
  hasta: FechaISO.optional().describe("Inclusivo. Por defecto, hoy"),
  categoriaId: z.string().optional().describe("Filtra por categoria: cat_restaurantes, cat_financiero…"),
  cuentaId: IdCuenta.optional(),
  soloAtipicos: z.boolean().optional().describe("true = solo los movimientos marcados como fuera de patron"),
  limite: z.number().int().min(1).max(100).optional().describe("Cuantas filas devolver. Default 20"),
});
export type EntradaConsultarMovimientos = z.infer<typeof EntradaConsultarMovimientos>;

export const Movimiento = z.object({
  id: z.string(),
  fecha: FechaISO,
  tipo: z.enum(["cargo", "abono"]),
  montoCentavos: Centavos,
  categoriaId: z.string(),
  categoria: z.string().describe("Nombre para pantalla: 'Restaurantes'"),
  comercio: z.string().describe("Nombre del comercio; vacio si no aplica"),
  descripcion: z.string(),
  esRecurrente: z.boolean(),
  esAtipico: z.boolean(),
});
export type Movimiento = z.infer<typeof Movimiento>;

export const SalidaConsultarMovimientos = z.object({
  desde: FechaISO,
  hasta: FechaISO,
  total: z.number().int().describe("Cuantos movimientos cumplen el filtro"),
  mostrados: z.number().int(),
  sumaCargosCentavos: Centavos,
  sumaAbonosCentavos: Centavos,
  movimientos: z.array(Movimiento),
});
export type SalidaConsultarMovimientos = z.infer<typeof SalidaConsultarMovimientos>;
