import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarTool, type DefinicionDeTool } from "./registro.js";
import { consultarPerfil } from "./consultar-perfil.js";

/**
 * Las 9 tools del ADR 0004. Una linea por tool, en el mismo commit que su
 * archivo, su schema en `packages/schemas` y su test.
 *
 * Lectura:  consultar_perfil ✔ · consultar_tarjeta · consultar_movimientos ·
 *           simular_reestructura · comparar_periodos · proyectar_ahorro · consultar_plan
 * Accion:   aplicar_plan_pago (fase 1) · crear_apartado (fase 3)
 * Opcional: crear_tope_gasto
 */
export const TOOLS: DefinicionDeTool[] = [consultarPerfil];

export function registrarTools(server: McpServer): void {
  for (const tool of TOOLS) registrarTool(server, tool);
}

export { registrarTool };
export type { DefinicionDeTool };
