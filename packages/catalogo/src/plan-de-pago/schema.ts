import { z } from "zod";
import { Centavos, PropsBase } from "../comunes";

/**
 * `PlanDePago` — las opciones de reestructura, una por plazo, y el boton que APLICA.
 * Es el componente del flujo accionable de la fase 1: lo que la persona elige aqui es
 * lo que `aplicar_plan_pago` cambia de verdad.
 *
 * `opciones` sale tal cual de `simular_reestructura.opciones`.
 */
export const OpcionDePlan = z.object({
  plazoMeses: z.number().int().describe("Plazo en meses"),
  mensualidadCentavos: Centavos.describe("Lo que pagaria al mes"),
  cat: z.number().describe("CAT como fraccion: 0.2858 = 28.58 %"),
  ahorroCentavos: Centavos.describe("Cuanto se ahorra contra seguir pagando el minimo"),
  recomendado: z.boolean().optional().describe("true en la opcion que conviene; solo una"),
});

export const schemaPlanDePago = PropsBase.extend({
  opciones: z.array(OpcionDePlan).min(1).describe("Una opcion por plazo, de menor a mayor plazo"),
  plazoElegido: z.number().int().optional().describe("El plazo preseleccionado; default: el recomendado"),
  tarjetaId: z.string().optional().describe("La tarjeta que se reestructura; viaja en el context de la accion"),
  etiquetaBoton: z.string().default("Aplicar plan").describe("Texto del boton primario"),
});

export type PropsPlanDePago = z.infer<typeof schemaPlanDePago>;

export const entradaPlanDePago = {
  nombre: "PlanDePago",
  cuandoUsarlo:
    "La persona quiere pagar menos intereses y ya llamaste simular_reestructura: muestra las opciones para que elija un plazo y confirme. El boton dispara aplicar_plan_pago con { plazoMeses, tarjetaId } en el context.",
  schema: schemaPlanDePago,
  acciones: ["aplicar_plan_pago"],
};
