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
import { analizarGasto } from "./analizar-gasto.js";
import { analizarAhorro } from "./analizar-ahorro.js";
import { ejecutarDecision } from "./ejecutar-decision.js";
import { orientarConsultaNoValida } from "./orientar-consulta-no-valida.js";
import { consultarSugerenciasInversion } from "./consultar-sugerencias-inversion.js";
import { rebalancearPortafolio } from "./rebalancear-portafolio.js";
import { simularRebalanceo } from "./simular-rebalanceo.js";
import { simularPagoCredito } from "./simular-pago-credito.js";
import { programarAbonoCapital } from "./programar-abono-capital.js";

/**
 * Las tools del servidor. El orden es el del viaje que la demo cuenta: primero saber
 * con quien hablas, luego la deuda, luego el gasto, luego el ahorro.
 *
 * `panorama_inicial` va primero a proposito: es lo primero que el modelo lee en
 * `listTools`, y es la llamada con la que deberia abrir toda conversacion.
 * `analizar_gasto` y `analizar_ahorro` van justo despues de sus atomicas por la misma
 * razon: son las fachadas de O4 (`docs/arquitectura/orquestadores.md`), y el prompt les
 * pide preferirlas.
 *
 * Lectura:  panorama_inicial · consultar_perfil · consultar_tarjeta · consultar_movimientos ·
 *           simular_reestructura · consultar_plan · comparar_periodos · proyectar_ahorro ·
 *           diagnostico_salud_financiera · consultar_creditos · simular_pago_credito · detectar_fugas ·
 *           consultar_inversiones · consultar_catalogo_inversiones · consultar_historico_inversion ·
 *           analizar_gasto · analizar_ahorro · simular_rebalanceo
 * Accion:   aplicar_plan_pago (fase 1) · crear_apartado (fase 3) ·
 *           cancelar_suscripcion (fase 2) · crear_tope_gasto (fase 2) · ejecutar_decision ·
 *           programar_abono_capital
 *
 * Las 9 primeras son las del ADR 0004.
 * Paquete 1: diagnostico_salud_financiera, consultar_creditos, panorama_inicial.
 * Paquete 2: detectar_fugas, cancelar_suscripcion, crear_tope_gasto.
 * Paquete Inversiones: consultar_inversiones, consultar_catalogo_inversiones, consultar_historico_inversion.
 * Orquestadores (Bloque A, `docs/arquitectura/orquestadores.md`): analizar_gasto,
 * analizar_ahorro (O4, fachadas de lectura), ejecutar_decision (O2, orquestador de accion).
 * Abono a capital (tarjetas que se ajustan desde el chat, `docs/algoritmos/abono-a-capital.md`):
 * simular_pago_credito (junto a consultar_creditos) y programar_abono_capital.
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
  analizarGasto,
  proyectarAhorro,
  analizarAhorro,
  crearApartado,
  detectarFugas,
  cancelarSuscripcion,
  crearTopeGasto,
  ejecutarDecision,
  diagnosticoSaludFinanciera,
  consultarCreditos,
  simularPagoCredito,
  programarAbonoCapital,
  consultarInversiones,
  consultarCatalogoInversiones,
  consultarHistoricoInversion,
  orientarConsultaNoValida,
  consultarSugerenciasInversion,
  simularRebalanceo,
  rebalancearPortafolio,
];

export function registrarTools(server: McpServer): void {
  for (const tool of TOOLS) registrarTool(server, tool);
}

export { registrarTool, rebalancearPortafolio };
export type { DefinicionDeTool };
