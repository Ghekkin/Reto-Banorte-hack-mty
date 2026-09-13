import { z } from "zod";
import { IdUsuario } from "../comunes.js";
import { SalidaAplicarPlanPago } from "./aplicar-plan-pago.js";
import { SalidaCancelarSuscripcion } from "./cancelar-suscripcion.js";
import { SalidaConsultarCreditos } from "./consultar-creditos.js";
import { SalidaConsultarInversiones } from "./consultar-inversiones.js";
import { SalidaConsultarPlan } from "./consultar-plan.js";
import { SalidaCrearApartado } from "./crear-apartado.js";
import { SalidaCrearTopeGasto } from "./crear-tope-gasto.js";
import { SalidaDetectarFugas } from "./detectar-fugas.js";
import { SalidaProgramarAbonoCapital } from "./programar-abono-capital.js";
import { SalidaProyectarAhorro } from "./proyectar-ahorro.js";
import { SalidaRebalancearPortafolio } from "./rebalancear-portafolio.js";

/**
 * `ejecutar_decision` — ORQUESTADOR DE ACCION (O2, `docs/arquitectura/orquestadores.md`).
 *
 * Las acciones que mutan estado se llaman igual que su tool (`esAccionDeMutacion` en
 * `packages/a2ui/src/acciones.ts`), asi que la tabla de despacho es literal: el `name`
 * que trae el `action` de la interfaz es exactamente uno de estos.
 *
 * `ejecutar_decision` despacha a la tool de mutacion correspondiente, y devuelve YA la
 * lectura posterior en la misma respuesta: el ciclo de accion pasa de 3 llamadas
 * (mutacion → lectura → pintar) a 2 (`ejecutar_decision` → pintar). No agrega logica de
 * negocio propia: solo despacha y relee.
 */
export const AccionMutacion = z.enum([
  "aplicar_plan_pago",
  "crear_apartado",
  "cancelar_suscripcion",
  "crear_tope_gasto",
  "rebalancear_portafolio",
  "confirmar_rebalanceo",
  "programar_abono_capital",
]);
export type AccionMutacion = z.infer<typeof AccionMutacion>;

export const EntradaEjecutarDecision = z.object({
  usuarioId: IdUsuario,
  accion: AccionMutacion.describe("El `name` de la accion, identico al que llega del `action` de la interfaz"),
  context: z
    .record(z.string(), z.unknown())
    .describe(
      "El `context` de la accion A2UI, tal cual (incluida `idempotencyKey`): los campos que esa accion " +
        "necesita — p.ej. `tarjetaId` + `plazoMeses` para `aplicar_plan_pago`, `suscripcionId` para " +
        "`cancelar_suscripcion`. Se valida internamente contra el schema de la tool que corresponde.",
    ),
});
export type EntradaEjecutarDecision = z.infer<typeof EntradaEjecutarDecision>;

export const SalidaEjecutarDecision = z.object({
  accion: AccionMutacion,
  resultadoAccion: z.union([
    SalidaAplicarPlanPago,
    SalidaCrearApartado,
    SalidaCancelarSuscripcion,
    SalidaCrearTopeGasto,
    SalidaRebalancearPortafolio,
    SalidaProgramarAbonoCapital,
  ]),
  estadoPosterior: z
    .union([SalidaConsultarPlan, SalidaProyectarAhorro, SalidaDetectarFugas, SalidaConsultarInversiones, SalidaConsultarCreditos])
    .nullable()
    .describe(
      "La lectura que normalmente seguiria a la accion. `null` en `crear_tope_gasto`: su propio " +
        "`resultadoAccion.tope` ya trae el gasto en vivo, releer no agrega nada.",
    ),
});

export type SalidaEjecutarDecision = z.infer<typeof SalidaEjecutarDecision>;
