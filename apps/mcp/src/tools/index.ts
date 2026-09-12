import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarTool, type DefinicionDeTool } from "./registro.js";
import { panoramaInicial } from "./panorama-inicial.js";
import { consultarPerfil } from "./consultar-perfil.js";
import { consultarTarjeta } from "./consultar-tarjeta.js";
import { consultarMovimientos } from "./consultar-movimientos.js";
import { simularReestructura } from "./simular-reestructura.js";
import { consultarPlan } from "./consultar-plan.js";
import { aplicarPlanPago } from "./aplicar-plan-pago.js";
import { compararPeriodos } from "./comparar-periodos.js";
import { proyectarAhorro } from "./proyectar-ahorro.js";
import { crearApartado } from "./crear-apartado.js";
import { detectarFugas } from "./detectar-fugas.js";
import { cancelarSuscripcion } from "./cancelar-suscripcion.js";
import { crearTopeGasto } from "./crear-tope-gasto.js";
import { diagnosticoSaludFinanciera } from "./diagnostico-salud-financiera.js";
import { consultarCreditos } from "./consultar-creditos.js";

/**
 * Las tools del servidor. El orden es el del viaje que la demo cuenta: primero saber
 * con quien hablas, luego la deuda, luego el gasto, luego el ahorro.
 *
 * `panorama_inicial` va primero a proposito: es lo primero que el modelo lee en
 * `listTools`, y es la llamada con la que deberia abrir toda conversacion.
 *
 * Lectura:  panorama_inicial · consultar_perfil · consultar_tarjeta · consultar_movimientos ·
 *           simular_reestructura · consultar_plan · comparar_periodos · proyectar_ahorro ·
 *           diagnostico_salud_financiera · consultar_creditos
 * Accion:   aplicar_plan_pago (fase 1) · crear_apartado (fase 3)
 *
 * Las 9 primeras son las del ADR 0004. Las tres ultimas son el Paquete 1 del
 * `docs/arquitectura/roadmap-mcp.md`: el retrato con el que el agente decide, la deuda
 * completa y la lectura compuesta que ahorra viajes.
 *
 * Pendiente y fuera de alcance por ahora: `crear_tope_gasto`, `detectar_fugas` y
 * `cancelar_suscripcion` (Paquete 2).
 */
export const TOOLS: DefinicionDeTool[] = [
  panoramaInicial,
  consultarPerfil,
  consultarTarjeta,
  consultarMovimientos,
  simularReestructura,
  consultarPlan,
  aplicarPlanPago,
  compararPeriodos,
  proyectarAhorro,
  crearApartado,
  detectarFugas,
  cancelarSuscripcion,
  crearTopeGasto,
  diagnosticoSaludFinanciera,
  consultarCreditos,
];

export function registrarTools(server: McpServer): void {
  for (const tool of TOOLS) registrarTool(server, tool);
}

export { registrarTool };
export type { DefinicionDeTool };
