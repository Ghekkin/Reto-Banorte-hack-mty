import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `GastoPorCategoria` — "¿en que se me va el dinero?". Grafica de barras con la categoria
 * atipica en rojo y el resto en plata, y la lista debajo. Sale de `comparar_periodos`.
 */
export const CategoriaDeGasto = z.object({
  categoriaId: z.string().optional().describe("El id de la tool (cat_restaurantes); viaja en la accion"),
  nombre: z.string().describe("Como se muestra: 'Restaurantes'"),
  montoCentavos: Centavos,
  variacionPct: z.number().optional().describe("Fraccion contra el periodo anterior: 0.42 = +42 %"),
});

export const schemaGastoPorCategoria = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  periodo: z.string().describe("El periodo, AAAA-MM o ya en palabras: '2026-08' o 'agosto de 2026'"),
  totalCentavos: Centavos.describe("El gasto total del periodo"),
  variacionPct: z.number().optional().describe("Variacion del total contra el periodo anterior, como fraccion"),
  categorias: z
    .array(CategoriaDeGasto)
    .min(1)
    .describe(
      "TODAS las categorias del periodo que devolvio la tool, de mayor a menor. La suma de " +
        "montoCentavos TIENE que dar exactamente totalCentavos: si recortas la lista, la tarjeta " +
        "muestra un total que no cuadra con lo que lista. No la recortes; la tarjeta se encarga " +
        "de acotar su alto y dejar el resto scrollable.",
    ),
  categoriaAtipica: z.string().optional().describe("El nombre de la que se salio de su patron; se pinta en rojo"),
  orden: z
    .enum(["monto", "variacion", "nombre"])
    .default("monto")
    .describe(
      "Como se ordena la lista. `monto`: de mayor gasto a menor (el default y casi siempre el " +
        "correcto). `variacion`: de la que mas subio a la que mas bajo, para 'que se me disparo'. " +
        "`nombre`: alfabetico, para buscar una en concreto. Es una prop de VISTA: cambiarla con " +
        "ajustar_pantalla reordena la tarjeta sin volver a pedir los datos",
    ),
  limite: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Cuantas categorias se listan tras ordenar; el resto se agrupa en un renglon 'Otras N'. " +
        "Solo cuando la persona pida ver las N mas grandes: sin esto se listan todas y la tarjeta " +
        "acota su alto sola. NO recortes `categorias` para lograr esto, usa esta prop: la suma " +
        "tiene que seguir cuadrando con el total",
    ),
});

export type PropsGastoPorCategoria = z.infer<typeof schemaGastoPorCategoria>;

export const entradaGastoPorCategoria = {
  nombre: "GastoPorCategoria",
  cuandoUsarlo:
    "La persona pregunta en que se le va el dinero o por que gasto mas. Ya llamaste comparar_periodos: pasa TODAS las categorias que devolvio (su suma tiene que dar el total) y cual es la atipica. Tocar una fila dispara ver_categoria con { categoriaId, categoria }. Si despues pide otro orden, las N mas grandes o resaltar una, eso es `ajustar_pantalla` sobre `orden`, `limite` o `categoriaAtipica`: no vuelvas a pintar la tarjeta.",
  schema: schemaGastoPorCategoria,
  acciones: ["ver_categoria"],
};
