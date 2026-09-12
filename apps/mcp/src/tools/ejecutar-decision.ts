import { type AccionMutacion, EntradaEjecutarDecision, SalidaEjecutarDecision } from "@maya/schemas";
import { aplicarPlanPago } from "./aplicar-plan-pago.js";
import { cancelarSuscripcion } from "./cancelar-suscripcion.js";
import { crearApartado } from "./crear-apartado.js";
import { crearTopeGasto } from "./crear-tope-gasto.js";
import { consultarPlan } from "./consultar-plan.js";
import { detectarFugas } from "./detectar-fugas.js";
import { proyectarAhorro } from "./proyectar-ahorro.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `ejecutar_decision` — ORQUESTADOR DE ACCION (O2, `docs/arquitectura/orquestadores.md`).
 *
 * Las acciones que mutan estado se llaman igual que su tool
 * (`esAccionDeMutacion` en `packages/a2ui/src/acciones.ts`), asi que la tabla de
 * despacho es literal: el `accion` que llega es uno de estos cuatro nombres.
 *
 * Recibe la accion y su `context` tal como salieron de la interfaz, despacha a la tool
 * de mutacion que corresponde (sin reimplementar su logica: llama su `manejar`), y
 * devuelve YA la lectura posterior en la misma respuesta. El ciclo de accion pasa de 3
 * llamadas (mutacion → lectura → pintar) a 2 (`ejecutar_decision` → pintar).
 */
const TOOLS_DE_MUTACION: Record<AccionMutacion, DefinicionDeTool> = {
  aplicar_plan_pago: aplicarPlanPago,
  crear_apartado: crearApartado,
  cancelar_suscripcion: cancelarSuscripcion,
  crear_tope_gasto: crearTopeGasto,
};

export const ejecutarDecision: DefinicionDeTool = {
  nombre: "ejecutar_decision",
  titulo: "Ejecutar la decision que vino de la interfaz",
  descripcion:
    "ORQUESTADOR DE ACCION: recibe el nombre de la accion tal como llega del `action` de la interfaz " +
    "(`aplicar_plan_pago`, `crear_apartado`, `cancelar_suscripcion` o `crear_tope_gasto`) y su `context` " +
    "(incluida `idempotencyKey`), la ejecuta, y devuelve YA la lectura posterior en la misma respuesta. " +
    "Usala SIEMPRE que la accion que llegue de la interfaz sea una de esas cuatro, en vez de llamar la " +
    "tool de mutacion y despues la de lectura por separado: no reimplementa nada, solo despacha y relee.",
  clase: "accion",
  entrada: EntradaEjecutarDecision.shape,
  manejar: async (argumentos) => {
    const entrada = EntradaEjecutarDecision.parse(argumentos);
    const tool = TOOLS_DE_MUTACION[entrada.accion];

    // `usuarioId` va AL FINAL: nunca se lee de otra persona aunque el context lo traiga.
    const resultadoAccion = await tool.manejar({ ...entrada.context, usuarioId: entrada.usuarioId });
    const estadoPosterior = await leerEstadoPosterior(entrada.accion, entrada.usuarioId, resultadoAccion);

    return SalidaEjecutarDecision.parse({ accion: entrada.accion, resultadoAccion, estadoPosterior });
  },
};

/**
 * La lectura que hoy el agente pide en un paso aparte tras cada accion. `crear_tope_gasto`
 * no tiene una: su propio `resultadoAccion.tope` ya trae el gasto en vivo, releer no
 * agrega nada.
 */
async function leerEstadoPosterior(
  accion: AccionMutacion,
  usuarioId: string,
  resultadoAccion: unknown,
): Promise<unknown> {
  switch (accion) {
    case "aplicar_plan_pago":
      return consultarPlan.manejar({ usuarioId });
    case "crear_apartado": {
      const metaId = (resultadoAccion as { meta?: { id?: string } })?.meta?.id;
      return proyectarAhorro.manejar(metaId ? { usuarioId, metaId } : { usuarioId });
    }
    case "cancelar_suscripcion":
      return detectarFugas.manejar({ usuarioId });
    case "crear_tope_gasto":
      return null;
  }
}
