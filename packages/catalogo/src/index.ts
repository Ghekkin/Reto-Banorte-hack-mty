import { registrar } from "@maya/a2ui";
import { AlertaFugas } from "./alerta-fugas/componente";
import { entradaAlertaFugas } from "./alerta-fugas/schema";
import { Calendario } from "./calendario/componente";
import { entradaCalendario } from "./calendario/schema";
import { ComparadorAntesDespues } from "./comparador-antes-despues/componente";
import { entradaComparadorAntesDespues } from "./comparador-antes-despues/schema";
import { Confirmacion } from "./confirmacion/componente";
import { entradaConfirmacion } from "./confirmacion/schema";
import { DetalleCategoria } from "./detalle-categoria/componente";
import { entradaDetalleCategoria } from "./detalle-categoria/schema";
import { DistribucionPortafolio } from "./distribucion-portafolio/componente";
import { entradaDistribucionPortafolio } from "./distribucion-portafolio/schema";
import { EscenariosInversion } from "./escenarios-inversion/componente";
import { entradaEscenariosInversion } from "./escenarios-inversion/schema";
import { GastoPorCategoria } from "./gasto-por-categoria/componente";
import { entradaGastoPorCategoria } from "./gasto-por-categoria/schema";
import { MetaActiva } from "./meta-activa/componente";
import { entradaMetaActiva } from "./meta-activa/schema";
import { OrdenRebalanceo } from "./orden-rebalanceo/componente";
import { entradaOrdenRebalanceo } from "./orden-rebalanceo/schema";
import { PlanDePago } from "./plan-de-pago/componente";
import { entradaPlanDePago } from "./plan-de-pago/schema";
import { ProyeccionCrecimiento } from "./proyeccion-crecimiento/componente";
import { entradaProyeccionCrecimiento } from "./proyeccion-crecimiento/schema";
import { ProyeccionPagoCredito } from "./proyeccion-pago-credito/componente";
import { entradaProyeccionPagoCredito } from "./proyeccion-pago-credito/schema";
import { RendimientoHistorico } from "./rendimiento-historico/componente";
import { entradaRendimientoHistorico } from "./rendimiento-historico/schema";
import { ResumenTarjeta } from "./resumen-tarjeta/componente";
import { entradaResumenTarjeta } from "./resumen-tarjeta/schema";
import { RiesgoRendimiento } from "./riesgo-rendimiento/componente";
import { entradaRiesgoRendimiento } from "./riesgo-rendimiento/schema";
import { SimuladorMeta } from "./simulador-meta/componente";
import { entradaSimuladorMeta } from "./simulador-meta/schema";
import { TermometroSaludFinanciera } from "./termometro-salud-financiera/componente";
import { entradaTermometroSaludFinanciera } from "./termometro-salud-financiera/schema";
import type { EntradaCatalogo } from "./comunes";

/**
 * El catalogo: componentes del reto Banorte. Un componente = una intencion.
 *
 * Importar este modulo NO registra nada: `registrarCatalogo()` lo hace, y `apps/web` lo
 * llama una vez, en la pagina. El agente y el generador de `catalogo.json` solo leen
 * `CATALOGO` (los schemas), sin tocar React.
 *
 * Para agregar uno (skill `ui-generativa`): carpeta con schema.ts + componente.tsx
 * + README.md, el `.jsonl` en `ejemplos/`, y dos lineas aqui. Las pruebas del paquete
 * dicen exactamente que falta si se olvida un paso.
 */
export const CATALOGO: EntradaCatalogo[] = [
  // Fase 1: salir de la deuda
  entradaResumenTarjeta,
  entradaPlanDePago,
  entradaConfirmacion,
  entradaCalendario,
  // Fase 2: entender el gasto y recortar fugas
  entradaGastoPorCategoria,
  entradaDetalleCategoria,
  entradaAlertaFugas,
  // Fase 3: diagnóstico integral y comparativa de impacto
  entradaTermometroSaludFinanciera,
  entradaComparadorAntesDespues,
  // Fase 4: empezar a ahorrar
  entradaSimuladorMeta,
  entradaMetaActiva,
  // Fase 5: inversiones y patrimonio
  entradaRendimientoHistorico,
  entradaProyeccionCrecimiento,
  entradaEscenariosInversion,
  entradaDistribucionPortafolio,
  entradaOrdenRebalanceo,
  entradaRiesgoRendimiento,
  // Fase 6: proyección de créditos
  entradaProyeccionPagoCredito,
];

export function registrarCatalogo(): void {
  registrar("ResumenTarjeta", ResumenTarjeta as never);
  registrar("PlanDePago", PlanDePago as never);
  registrar("Confirmacion", Confirmacion as never);
  registrar("Calendario", Calendario as never);
  registrar("GastoPorCategoria", GastoPorCategoria as never);
  registrar("DetalleCategoria", DetalleCategoria as never);
  registrar("AlertaFugas", AlertaFugas as never);
  registrar("TermometroSaludFinanciera", TermometroSaludFinanciera as never);
  registrar("ComparadorAntesDespues", ComparadorAntesDespues as never);
  registrar("SimuladorMeta", SimuladorMeta as never);
  registrar("MetaActiva", MetaActiva as never);
  registrar("RendimientoHistorico", RendimientoHistorico as never);
  registrar("ProyeccionCrecimiento", ProyeccionCrecimiento as never);
  registrar("EscenariosInversion", EscenariosInversion as never);
  registrar("DistribucionPortafolio", DistribucionPortafolio as never);
  registrar("OrdenRebalanceo", OrdenRebalanceo as never);
  registrar("RiesgoRendimiento", RiesgoRendimiento as never);
  registrar("ProyeccionPagoCredito", ProyeccionPagoCredito as never);
}

/** Los nombres que el agente tiene permitido emitir. */
export function nombresDelCatalogo(): string[] {
  return CATALOGO.map((c) => c.nombre);
}

export {
  AlertaFugas,
  Calendario,
  ComparadorAntesDespues,
  Confirmacion,
  DetalleCategoria,
  DistribucionPortafolio,
  EscenariosInversion,
  GastoPorCategoria,
  MetaActiva,
  OrdenRebalanceo,
  PlanDePago,
  ProyeccionCrecimiento,
  ProyeccionPagoCredito,
  RendimientoHistorico,
  ResumenTarjeta,
  RiesgoRendimiento,
  SimuladorMeta,
  TermometroSaludFinanciera,
};
export * from "./comunes";


