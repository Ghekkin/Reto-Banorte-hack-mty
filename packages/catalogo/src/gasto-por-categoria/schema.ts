import { z } from "zod";
import { Ancho, Centavos, Heroe, PropsBase } from "../comunes";

/**
 * `GastoPorCategoria` — "¿en que se me va el dinero?". Grafica de barras con la categoria
 * atipica en rojo y el resto en plata, y la lista debajo. Sale de `comparar_periodos`.
 *
 * Desde el 2026-09-13 tambien lleva **gastos de fuera del banco** (fase 2 de los ajustes en
 * vivo): «tambien le doy $2,000 al mes a mi mama en efectivo» → `simular_gasto_externo`, y el
 * agente parchea ESTA tarjeta con `despues` (categorias + total) y `antes`. La fila nueva sale
 * «Fuera del banco · sin guardar» y el boton «Guardar gasto» dispara `registrar_gasto_externo`;
 * al volver, el agente parchea con el `despues` ya guardado. Los nombres de `CategoriaDeGasto`
 * son los de `CategoriaConExterno` (`packages/schemas/src/tools/simular-gasto-externo.ts`).
 * Todo lo nuevo es opcional: lo ya pintado sigue validando.
 */
export const CategoriaDeGasto = z.object({
  categoriaId: z.string().optional().describe("El id de la tool (cat_restaurantes); viaja en la accion"),
  nombre: z.string().describe("Como se muestra: 'Restaurantes'"),
  montoCentavos: Centavos,
  variacionPct: z.number().optional().describe("Fraccion contra el periodo anterior: 0.42 = +42 %"),
  fueraDelBanco: z
    .boolean()
    .optional()
    .describe("true: no sale de los movimientos, lo dijo la persona. Tal cual lo manda la tool"),
  guardado: z
    .boolean()
    .optional()
    .describe("Solo en las de fuera del banco. false: simulado, todavia sin guardar (enciende «Guardar gasto»)"),
  frecuencia: z.enum(["mensual", "unico"]).optional().describe("Solo en las de fuera del banco: mensual o unico"),
});

/** Lo minimo del gasto anterior para decir «$45,200.00 → $47,200.00». Acepta el `antes` de la tool entero. */
export const GastoAntes = z.object({
  totalCentavos: Centavos.describe("El total del periodo antes del cambio"),
});

export const schemaGastoPorCategoria = PropsBase.extend({
  ancho: Ancho.default("amplio"),
  heroe: Heroe,
  periodo: z.string().describe("El periodo, AAAA-MM o ya en palabras: '2026-08' o 'agosto de 2026'"),
  totalCentavos: Centavos.describe("El gasto total del periodo. Con un gasto de fuera: `despues.totalCentavos`"),
  variacionPct: z.number().optional().describe("Variacion del total contra el periodo anterior, como fraccion"),
  categorias: z
    .array(CategoriaDeGasto)
    .min(1)
    .describe(
      "TODAS las categorias del periodo que devolvio la tool, de mayor a menor, las de fuera del banco incluidas " +
        "(con un gasto de fuera: `despues.categorias` tal cual). La suma de " +
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
  antes: GastoAntes.optional().describe(
    "Como iba ANTES de sumar gastos de fuera: el `antes` de `simular_gasto_externo` o de `registrar_gasto_externo`. " +
      "Presente = la tarjeta dice «$45,200.00 → $47,200.00». Dejalo fuera al pintar la tarjeta por primera vez",
  ),
  aviso: z
    .string()
    .optional()
    .describe(
      "El `aviso` de `simular_gasto_externo` tal cual, si no es null (ya no le queda nada libre al mes). Si es null, dejalo fuera; " +
        "para quitar uno que ya estaba en un ajuste posterior, mandalo como cadena vacia",
    ),
  etiquetaBoton: z.string().default("Guardar gasto").describe("Texto del boton que guarda los gastos de fuera sin guardar"),
});

export type PropsGastoPorCategoria = z.infer<typeof schemaGastoPorCategoria>;

export const entradaGastoPorCategoria = {
  nombre: "GastoPorCategoria",
  cuandoUsarlo:
    "La persona pregunta en que se le va el dinero o por que gasto mas. Ya llamaste comparar_periodos: pasa TODAS las categorias que devolvio (su suma tiene que dar el total) y cual es la atipica. Tocar una fila dispara ver_categoria con { categoriaId, categoria }. Si despues pide otro orden, las N mas grandes o resaltar una, eso es `ajustar_pantalla` sobre `orden`, `limite` o `categoriaAtipica`: no vuelvas a pintar la tarjeta. " +
    "Si con la tarjeta YA en pantalla dice un gasto que el banco no ve ('tambien pago $3,500 de renta en efectivo', 'le doy $2,000 al mes a mi mama'): llama `simular_gasto_externo` y usa `ajustar_pantalla` sobre ESTA tarjeta: `totalCentavos` y `categorias` con los de `despues` (la suma sigue dando el total), `antes` con `antes`, y `aviso` si no es null. " +
    "La fila nueva sale «Fuera del banco · sin guardar» y el boton «Guardar gasto» dispara `registrar_gasto_externo` con { gastos, periodo } en el context. Cuando la tool responda `aplicado`, vuelve a ajustar la misma tarjeta con su `despues` (ya `guardado: true`) y su `antes`: el boton desaparece.",
  schema: schemaGastoPorCategoria,
  // El orden importa: la primera es la `action` por default que el host le pone al pintar (tocar
  // una fila). La segunda la dispara el boton «Guardar gasto» con `alAccionar(ctx, nombre)`.
  acciones: ["ver_categoria", "registrar_gasto_externo"],
};
