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
  categorias: z.array(CategoriaDeGasto).min(1).describe("De mayor a menor; 6 u 8 es un buen numero"),
  categoriaAtipica: z.string().optional().describe("El nombre de la que se salio de su patron; se pinta en rojo"),
});

export type PropsGastoPorCategoria = z.infer<typeof schemaGastoPorCategoria>;

export const entradaGastoPorCategoria = {
  nombre: "GastoPorCategoria",
  cuandoUsarlo:
    "La persona pregunta en que se le va el dinero o por que gasto mas. Ya llamaste comparar_periodos: pasa las categorias y cual es la atipica. Tocar una barra dispara ver_categoria con { categoriaId, categoria }.",
  schema: schemaGastoPorCategoria,
  acciones: ["ver_categoria"],
};
