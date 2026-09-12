import { z } from "zod";
import { Centavos, FechaISO, IdCuenta, IdUsuario, LlaveIdempotencia } from "../comunes.js";
import { Frecuencia } from "./proyectar-ahorro.js";

/**
 * `crear_apartado` — **ACCION**. La segunda accion real del reto (fase 3):
 * aparta dinero de una cuenta hacia una meta con aportacion automatica. Cambia
 * el estado; `proyectar_ahorro` posterior ya la ve como meta activa.
 *
 * Idempotente por `idempotencyKey`, igual que `aplicar_plan_pago`.
 */
export const EntradaCrearApartado = z.object({
  usuarioId: IdUsuario,
  nombre: z.string().min(3).describe("Como lo llama la persona: 'Fondo de emergencia'"),
  montoObjetivoCentavos: Centavos,
  aportacionCentavos: Centavos.describe("Cuanto se aparta en cada periodo"),
  frecuencia: Frecuencia.optional().describe("Default: mensual"),
  cuentaOrigenId: IdCuenta.optional().describe("De donde sale el dinero; default, su cuenta de ahorro"),
  idempotencyKey: LlaveIdempotencia,
});
export type EntradaCrearApartado = z.infer<typeof EntradaCrearApartado>;

export const SalidaCrearApartado = z.object({
  aplicado: z.boolean(),
  yaEstaba: z.boolean(),
  mensaje: z.string(),
  meta: z.object({
    id: z.string(),
    nombre: z.string(),
    cuentaOrigenId: IdCuenta,
    montoObjetivoCentavos: Centavos,
    montoActualCentavos: Centavos,
    aportacionCentavos: Centavos,
    frecuencia: Frecuencia,
    apartadoAutomatico: z.boolean(),
    fechaObjetivo: FechaISO,
    primeraAportacionFecha: FechaISO,
    mesesEstimados: z.number().int(),
  }),
});
export type SalidaCrearApartado = z.infer<typeof SalidaCrearApartado>;
