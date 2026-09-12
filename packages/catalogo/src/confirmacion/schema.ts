import { z } from "zod";
import { Centavos, PropsBase } from "../comunes";

/**
 * `Confirmacion` — generico a proposito: lo usan la fase 1 (plan aplicado) y la
 * fase 3 (apartado creado). Reutilizacion visible ante el jurado (ADR 0004).
 */
export const schemaConfirmacion = PropsBase.extend({
  titulo: z.string().describe("Lo que acaba de pasar, en pasado: 'Tu plan quedo activo'"),
  detalle: z.string().describe("Una linea con el dato que lo prueba: monto, plazo, fecha"),
  montoCentavos: Centavos.optional().describe("El numero grande, si la confirmacion tiene uno"),
  etiquetaMonto: z.string().optional().describe("Que es ese monto: 'Pago mensual'"),
  siguientePaso: z.string().optional().describe("Que puede hacer ahora la persona"),
  tono: z
    .enum(["exito", "informativo"])
    .default("exito")
    .describe("exito tras una accion que cambio estado; informativo para un aviso"),
});

export type PropsConfirmacion = z.infer<typeof schemaConfirmacion>;

export const entradaConfirmacion = {
  nombre: "Confirmacion",
  cuandoUsarlo:
    "Justo despues de que una tool de accion cambio el estado: el plan quedo aplicado, el apartado quedo creado. Nunca antes de que la accion ocurra.",
  schema: schemaConfirmacion,
  acciones: [] as string[],
};
