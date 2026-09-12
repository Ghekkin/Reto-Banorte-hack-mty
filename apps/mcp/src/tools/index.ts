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
import { consultarInversiones } from "./consultar-inversiones.js";
import { consultarCatalogoInversiones } from "./consultar-catalogo-inversiones.js";
import { consultarHistoricoInversion } from "./consultar-historico-inversion.js";

/**
 * Las tools del servidor. El orden es el del viaje que la demo cuenta: primero saber
 * con quien hablas, luego la deuda, luego el gasto, luego el ahorro.
 *
 * `panorama_inicial` va primero a proposito: es lo primero que el modelo lee en
 * `listTools`, y es la llamada con la que deberia abrir toda conversacion.
 *
 * Lectura:  panorama_inicial · consultar_perfil · consultar_tarjeta · consultar_movimientos ·
 *           simular_reestructura · consultar_plan · comparar_periodos · proyectar_ahorro ·
 *           diagnostico_salud_financiera · consultar_creditos · detectar_fugas ·
 *           consultar_inversiones · consultar_catalogo_inversiones · consultar_historico_inversion
 * Accion:   aplicar_plan_pago (fase 1) · crear_apartado (fase 3) ·
 *           cancelar_suscripcion (fase 2) · crear_tope_gasto (fase 2)
 *
 * Las 9 primeras son las del ADR 0004.
 * Paquete 1: diagnostico_salud_financiera, consultar_creditos, panorama_inicial.
 * Paquete 2: detectar_fugas, cancelar_suscripcion, crear_tope_gasto.
 * Paquete Inversiones: consultar_inversiones, consultar_catalogo_inversiones, consultar_historico_inversion.
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
  consultarInversiones,
  consultarCatalogoInversiones,
  consultarHistoricoInversion,
];

export function registrarTools(server: McpServer): void {
  for (const tool of TOOLS) registrarTool(server, tool);
}

export { registrarTool };
export type { DefinicionDeTool };
