import { z } from "zod";
import { Centavos, FechaISO, IdCuenta, IdUsuario } from "../comunes.js";

/**
 * `proyectar_ahorro` — lectura (calculo). La fase 3, y la respuesta adaptativa de
 * Ana: sin deuda que reestructurar, el agente propone ahorrar. Devuelve cuanto
 * puede apartar al mes, cuando llegaria a su objetivo y tres escenarios para que
 * el slider del simulador tenga de donde tirar.
 *
 * Detalle en `docs/algoritmos/proyeccion-de-ahorro.md`.
 */
export const Frecuencia = z.enum(["mensual", "quincenal"]);
export type Frecuencia = z.infer<typeof Frecuencia>;

export const EntradaProyectarAhorro = z.object({
  usuarioId: IdUsuario,
  metaId: z.string().optional().describe("Una meta que ya existe; si no viene, se usa la meta activa principal"),
  montoObjetivoCentavos: Centavos.optional()
    .describe(
      "El objetivo a alcanzar. OBLIGATORIO si la persona no tiene una meta creada, o si simulas " +
        "una meta nueva: sin `metaId` con objetivo y sin esto, la tool no sabe contra que proyectar " +
        "y devuelve error. Para un fondo de emergencia, tres meses de gastos es un objetivo razonable.",
    ),
  aportacionCentavos: Centavos.optional()
    .describe(
      "Lo que la persona movio en el slider. Omitela (o manda 0) para que se use la " +
        "capacidad de ahorro calculada de la persona. Ojo: si esa capacidad es CERO " +
        "(alguien con la deuda al limite), no hay de donde proyectar y tienes que mandar " +
        "tu una aportacion; `panorama_inicial` te dice la capacidad antes de preguntar.",
    ),
  frecuencia: Frecuencia.optional().describe("Default: mensual"),
});
export type EntradaProyectarAhorro = z.infer<typeof EntradaProyectarAhorro>;

export const Escenario = z.object({
  aportacionCentavos: Centavos,
  frecuencia: Frecuencia,
  mesesEstimados: z.number().int(),
  fechaEstimada: FechaISO,
  cabeEnCapacidad: z.boolean(),
});
export type Escenario = z.infer<typeof Escenario>;

export const SalidaProyectarAhorro = z.object({
  meta: z
    .object({ id: z.string(), nombre: z.string(), estatus: z.string() })
    .nullable()
    .describe("La meta que se uso como base; null si es una simulacion desde cero"),
  cuentaOrigenId: IdCuenta.nullable(),
  saldoInicialCentavos: Centavos.describe("Lo que ya lleva ahorrado"),
  montoObjetivoCentavos: Centavos,
  faltanteCentavos: Centavos,
  capacidadMensualCentavos: Centavos.describe("Lo que su flujo permite apartar sin apretarse"),
  aportacionCentavos: Centavos.describe("La aportacion con la que se hizo esta proyeccion"),
  frecuencia: Frecuencia,
  mesesEstimados: z.number().int(),
  fechaEstimada: FechaISO,
  escenarios: z.array(Escenario).describe("Tres puntos para el slider: conservador, sugerido y agresivo"),
});
export type SalidaProyectarAhorro = z.infer<typeof SalidaProyectarAhorro>;
