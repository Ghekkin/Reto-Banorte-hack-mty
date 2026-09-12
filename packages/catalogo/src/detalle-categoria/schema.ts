import { z } from "zod";
import { Ancho, Centavos, PropsBase } from "../comunes";

/**
 * `DetalleCategoria` — los movimientos detras de una categoria. Sale de
 * `consultar_movimientos` con `categoriaId`. Es la respuesta a `ver_categoria`.
 */
export const MovimientoDeCategoria = z.object({
  fecha: z.string().describe("AAAA-MM-DD"),
  comercio: z.string().describe("Nombre del comercio; si no hay, la descripcion"),
  descripcion: z.string().optional(),
  montoCentavos: Centavos,
  recurrente: z.boolean().optional().describe("true si se repite cada mes (suscripcion, renta)"),
});

export const schemaDetalleCategoria = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  categoria: z.string().describe("El nombre: 'Restaurantes'"),
  periodo: z.string().optional().describe("AAAA-MM o en palabras"),
  totalCentavos: Centavos.describe("La suma de la categoria en el periodo"),
  movimientos: z.array(MovimientoDeCategoria).describe("Del mas reciente al mas viejo"),
  totalMovimientos: z.number().int().optional().describe("Cuantos hay en total, si solo mandas los primeros"),
});

export type PropsDetalleCategoria = z.infer<typeof schemaDetalleCategoria>;

export const entradaDetalleCategoria = {
  nombre: "DetalleCategoria",
  cuandoUsarlo:
    "La persona toco una categoria (accion ver_categoria) o pregunta por un gasto concreto: los movimientos que la componen, con el comercio y la fecha. Va junto a GastoPorCategoria, no en su lugar.",
  schema: schemaDetalleCategoria,
  acciones: [] as string[],
};
