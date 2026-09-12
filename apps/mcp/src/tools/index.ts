import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarTool, type DefinicionDeTool } from "./registro.js";
import { consultarPerfil } from "./consultar-perfil.js";
import { consultarTarjeta } from "./consultar-tarjeta.js";
import { consultarMovimientos } from "./consultar-movimientos.js";
import { simularReestructura } from "./simular-reestructura.js";
import { consultarPlan } from "./consultar-plan.js";
import { aplicarPlanPago } from "./aplicar-plan-pago.js";
import { compararPeriodos } from "./comparar-periodos.js";
import { proyectarAhorro } from "./proyectar-ahorro.js";
import { crearApartado } from "./crear-apartado.js";

/**
 * Las 9 tools del ADR 0004. El orden es el del viaje que la demo cuenta: primero
 * saber con quien hablas, luego la deuda, luego el gasto, luego el ahorro.
 *
 * Lectura:  consultar_perfil · consultar_tarjeta · consultar_movimientos ·
 *           simular_reestructura · consultar_plan · comparar_periodos · proyectar_ahorro
 * Accion:   aplicar_plan_pago (fase 1) · crear_apartado (fase 3)
 * Opcional y fuera de alcance por ahora (ADR 0004, "que NO entra"): crear_tope_gasto.
 */
export const TOOLS: DefinicionDeTool[] = [
  consultarPerfil,
  consultarTarjeta,
  consultarMovimientos,
  simularReestructura,
  consultarPlan,
  aplicarPlanPago,
  compararPeriodos,
  proyectarAhorro,
  crearApartado,
];

export function registrarTools(server: McpServer): void {
  for (const tool of TOOLS) registrarTool(server, tool);
}

export { registrarTool };
export type { DefinicionDeTool };
