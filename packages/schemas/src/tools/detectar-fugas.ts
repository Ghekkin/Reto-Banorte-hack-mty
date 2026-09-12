import { z } from "zod";
import { Centavos, FechaISO, IdUsuario } from "../comunes.js";

/**
 * `detectar_fugas` — LECTURA. Detecta fugas de dinero cruzando suscripciones
 * activas y cargos recurrentes de la persona. Identifica suscripciones sin uso reciente
 * y movimientos recurrentes no registrados como suscripción.
 */
export const EntradaDetectarFugas = z.object({
  usuarioId: IdUsuario,
  mesesSinUso: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Meses sin cargo reciente para marcar suscripciones candidatas a cancelar (default: 2)"),
});
export type EntradaDetectarFugas = z.infer<typeof EntradaDetectarFugas>;

export const SalidaDetectarFugas = z.object({
  totalMensualCentavos: Centavos,
  pctDelIngreso: z.number().describe("Proporción del ingreso mensual que representan las suscripciones activas (0 a 1)"),
  suscripciones: z.array(
    z.object({
      id: z.string(),
      concepto: z.string(),
      comercio: z.string(),
      giro: z.string(),
      montoCentavos: Centavos,
      diaCargo: z.number().int(),
      periodicidad: z.string(),
      desde: FechaISO,
      mesesActiva: z.number().int(),
      ultimoCargoFecha: FechaISO.nullable(),
      sinUsoReciente: z.boolean(),
    }),
  ),
  recurrentesNoSuscritos: z.array(
    z.object({
      comercio: z.string(),
      montoCentavos: Centavos,
      categoriaId: z.string(),
      ultimaFecha: FechaISO,
    }),
  ),
  totalAnualCentavos: Centavos,
});
export type SalidaDetectarFugas = z.infer<typeof SalidaDetectarFugas>;
