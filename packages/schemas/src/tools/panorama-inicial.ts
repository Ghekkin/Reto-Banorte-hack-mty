import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";
import { CalificacionSalud, TendenciaSalud } from "./diagnostico-salud-financiera.js";

/**
 * `panorama_inicial` — lectura compuesta. La primera llamada de toda conversacion.
 *
 * No agrega datos nuevos: junta en UNA respuesta lo que el agente necesitaba pedir en
 * tres (`consultar_perfil`, `consultar_tarjeta`, `diagnostico_salud_financiera`). El
 * turno de Beto pasa de cuatro pasos a tres, y eso es tiempo que el jurado no pasa
 * mirando una pantalla que no cambia.
 *
 * **La frontera importa**: el MCP clasifica la SITUACION FINANCIERA, que es un dato
 * calculado sobre umbrales fijos. Quien interpreta la intencion y elige la pantalla
 * sigue siendo el modelo. `situacion` no dice que componente pintar.
 */
export const EntradaPanoramaInicial = z.object({
  usuarioId: IdUsuario,
});
export type EntradaPanoramaInicial = z.infer<typeof EntradaPanoramaInicial>;

/**
 * En que esta parada la persona hoy. Se evalua en este orden y gana la primera que
 * aplica: lo que cuesta dinero hoy manda sobre lo que podria costarlo manana.
 */
export const SituacionFinanciera = z.enum([
  "deuda_critica",
  "plan_activo",
  "deuda_alta",
  "sin_margen",
  "estable_con_capacidad",
]);
export type SituacionFinanciera = z.infer<typeof SituacionFinanciera>;

export const SalidaPanoramaInicial = z.object({
  perfil: z.object({
    id: IdUsuario,
    nombre: z.string(),
    edad: z.number().int(),
    ocupacion: z.string(),
    ingresoMensualCentavos: Centavos,
    ciudad: z.string(),
    segmento: z.string(),
  }),
  tarjeta: z
    .object({
      id: z.string(),
      saldoCentavos: Centavos,
      limiteCentavos: Centavos,
      usoDelLimite: z.number(),
      diasMora: z.number().int(),
      tienePlanActivo: z.boolean(),
    })
    .nullable()
    .describe("null cuando no tiene tarjeta de credito: no le ofrezcas reestructurar"),
  salud: z
    .object({
      periodo: z.string(),
      puntajeSalud: z.number().int(),
      calificacion: CalificacionSalud,
      tendencia: TendenciaSalud,
    })
    .nullable()
    .describe("null si no hay diagnostico para esa persona"),
  deuda: z.object({
    totalCentavos: Centavos,
    mensualidadTotalCentavos: Centavos,
    ratioDeudaIngreso: z.number(),
  }),
  capacidadPagoMensualCentavos: Centavos.describe("Lo que puede pagar al mes sin apretarse, ya descontado lo comprometido"),
  situacion: SituacionFinanciera,
  porQue: z.string().describe("El dato concreto que produjo esa `situacion`. Sirve para la linea '¿Por que veo esto?'"),
});
export type SalidaPanoramaInicial = z.infer<typeof SalidaPanoramaInicial>;
