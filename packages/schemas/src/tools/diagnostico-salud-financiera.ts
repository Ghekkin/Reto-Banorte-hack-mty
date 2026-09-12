import { z } from "zod";
import { Centavos, IdUsuario } from "../comunes.js";

/**
 * `diagnostico_salud_financiera` — lectura. El retrato completo de la persona, no
 * solo su deuda: puntaje, tendencia y los cuatro ratios que explican por que.
 *
 * Es lo que le permite al agente decidir la pantalla con algo mas rico que
 * "tiene deuda / no tiene deuda". Beto sale en 39 y cayendo; Ana en 74; Carmen en
 * 85 y subiendo. Tres personas, tres pantallas distintas, con el dato que lo
 * justifica.
 *
 * **Refleja el estado**: el habito detectado sale de una foto mensual que no sabe de
 * las acciones de la demo. Si la persona ya aplico un plan de pago, un habito sobre
 * la tarjeta deja de ser cierto y se devuelve con `vigente: false` para que el agente
 * no lo pinte. Ver `docs/algoritmos/puntaje-de-salud.md`.
 */
export const EntradaDiagnosticoSaludFinanciera = z.object({
  usuarioId: IdUsuario,
  periodo: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "usa AAAA-MM")
    .optional()
    .describe("Mes a diagnosticar; por defecto el mas reciente que exista"),
  mesesHistoria: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe("Cuantos meses devolver en `serie` para graficar la evolucion. Default 6"),
});
export type EntradaDiagnosticoSaludFinanciera = z.infer<typeof EntradaDiagnosticoSaludFinanciera>;

/** El puntaje en palabras. El agente habla con esto, no con el numero pelado. */
export const CalificacionSalud = z.enum(["critica", "fragil", "estable", "sana"]);
export type CalificacionSalud = z.infer<typeof CalificacionSalud>;

/** Hacia donde va, comparado con el mes anterior. */
export const TendenciaSalud = z.enum(["mejora", "estable", "empeora"]);
export type TendenciaSalud = z.infer<typeof TendenciaSalud>;

/** Un mes de la serie: lo minimo para dibujar la evolucion sin mandar todo. */
export const PuntoDeSerie = z.object({
  periodo: z.string(),
  puntajeSalud: z.number().int(),
  tasaAhorroPct: z.number().describe("Fraccion: 0.2449 = ahorro del 24.49 % del ingreso"),
  ahorroCentavos: Centavos.describe("Negativo cuando gasto mas de lo que ingreso ese mes"),
});
export type PuntoDeSerie = z.infer<typeof PuntoDeSerie>;

export const SalidaDiagnosticoSaludFinanciera = z.object({
  periodo: z.string(),
  puntajeSalud: z.number().int().describe("0 a 100. Mas alto es mejor"),
  calificacion: CalificacionSalud,
  tendencia: TendenciaSalud,
  cambioVsMesAnterior: z
    .number()
    .int()
    .describe("Puntos que subio o bajo contra el mes anterior; 0 si no hay mes previo"),
  ingresoCentavos: Centavos,
  gastoCentavos: Centavos,
  ahorroCentavos: Centavos,
  tasaAhorroPct: z.number(),
  ratioDeudaIngresoPct: z.number().describe("Fraccion del ingreso comprometida en pagos de deuda"),
  gastoEsencialPct: z.number(),
  gastoDiscrecionalPct: z.number(),
  mesesFondoEmergencia: z.number().describe("Cuantos meses de gasto cubre su ahorro liquido"),
  habito: z.object({
    texto: z.string().describe("La frase del diagnostico, ya redactada"),
    vigente: z.boolean().describe("false: el dato en el que se basa ya cambio. NO lo pintes"),
    razonSiNoVigente: z.string().nullable(),
  }),
  serie: z.array(PuntoDeSerie).describe("Del mas antiguo al mas reciente, para graficar"),
});
export type SalidaDiagnosticoSaludFinanciera = z.infer<typeof SalidaDiagnosticoSaludFinanciera>;
