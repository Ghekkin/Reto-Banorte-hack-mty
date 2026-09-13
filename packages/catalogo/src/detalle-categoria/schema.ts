import { z } from "zod";
import { Ancho, Centavos, Limite, PropsBase } from "../comunes";

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
  orden: z
    .enum(["fecha", "monto", "comercio"])
    .default("fecha")
    .describe(
      "Como se ordena. `fecha`: del mas reciente al mas viejo (el default). `monto`: del mas grande al " +
        "mas chico, para 'cual fue el gasto mas fuerte'. `comercio`: alfabetico. Es una prop de VISTA: " +
        "cambiarla con ajustar_pantalla reordena sin volver a pedir los datos",
    ),
  limite: Limite,
});

export type PropsDetalleCategoria = z.infer<typeof schemaDetalleCategoria>;

export const entradaDetalleCategoria = {
  nombre: "DetalleCategoria",
  cuandoUsarlo:
    "La persona toco una categoria (accion ver_categoria) o pregunta por un gasto concreto: los movimientos que la componen, con el comercio y la fecha. Va junto a GastoPorCategoria, no en su lugar. Si despues pide otro orden o solo los N mas grandes, eso es `ajustar_pantalla` sobre `orden` o `limite`.",
  schema: schemaDetalleCategoria,
  acciones: [] as string[],
};
