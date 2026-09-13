/**
 * Schemas Zod de las tools MCP. Dueno: rol `contrato`.
 *
 * Una tool nueva: archivo en `src/tools/<nombre>.ts` con `EntradaX` y `SalidaX`,
 * exportado aqui, y en el MISMO commit su mock en `apps/mcp` (skill `cambiar-schema`).
 *
 * Las 9 del ADR 0004:
 *   lectura  consultar_perfil · consultar_tarjeta · consultar_movimientos ·
 *            simular_reestructura · consultar_plan · comparar_periodos · proyectar_ahorro
 *   accion   aplicar_plan_pago · crear_apartado
 *
 * Paquete 1 (deuda y salud, `docs/arquitectura/roadmap-mcp.md`):
 *   lectura  diagnostico_salud_financiera · consultar_creditos · panorama_inicial
 */
export * from "./comunes.js";
export * from "./tools/consultar-perfil.js";
export * from "./tools/consultar-tarjeta.js";
export * from "./tools/consultar-movimientos.js";
export * from "./tools/simular-reestructura.js";
export * from "./tools/consultar-plan.js";
export * from "./tools/aplicar-plan-pago.js";
export * from "./tools/comparar-periodos.js";
export * from "./tools/proyectar-ahorro.js";
export * from "./tools/crear-apartado.js";
export * from "./tools/detectar-fugas.js";
export * from "./tools/cancelar-suscripcion.js";
export * from "./tools/crear-tope-gasto.js";
export * from "./tools/diagnostico-salud-financiera.js";
export * from "./tools/consultar-creditos.js";
export * from "./tools/panorama-inicial.js";
export * from "./tools/consultar-inversiones.js";
export * from "./tools/consultar-catalogo-inversiones.js";
export * from "./tools/consultar-historico-inversion.js";
export * from "./tools/analizar-gasto.js";
export * from "./tools/analizar-ahorro.js";
export * from "./tools/ejecutar-decision.js";
export * from "./tools/orientar-consulta-no-valida.js";
export * from "./tools/consultar-sugerencias-inversion.js";
export * from "./tools/rebalancear-portafolio.js";
export * from "./tools/simular-rebalanceo.js";
export * from "./tools/simular-pago-credito.js";
export * from "./tools/programar-abono-capital.js";
