import { registrar } from "@maya/a2ui";
import { Calendario } from "./calendario/componente";
import { entradaCalendario } from "./calendario/schema";
import { Confirmacion } from "./confirmacion/componente";
import { entradaConfirmacion } from "./confirmacion/schema";
import { DetalleCategoria } from "./detalle-categoria/componente";
import { entradaDetalleCategoria } from "./detalle-categoria/schema";
import { GastoPorCategoria } from "./gasto-por-categoria/componente";
import { entradaGastoPorCategoria } from "./gasto-por-categoria/schema";
import { MetaActiva } from "./meta-activa/componente";
import { entradaMetaActiva } from "./meta-activa/schema";
import { PlanDePago } from "./plan-de-pago/componente";
import { entradaPlanDePago } from "./plan-de-pago/schema";
import { ResumenTarjeta } from "./resumen-tarjeta/componente";
import { entradaResumenTarjeta } from "./resumen-tarjeta/schema";
import { SimuladorMeta } from "./simulador-meta/componente";
import { entradaSimuladorMeta } from "./simulador-meta/schema";
import type { EntradaCatalogo } from "./comunes";

/**
 * El catalogo: los 8 componentes del ADR 0004. Un componente = una intencion.
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
  // Fase 2: entender el gasto
  entradaGastoPorCategoria,
  entradaDetalleCategoria,
  // Fase 3: empezar a ahorrar
  entradaSimuladorMeta,
  entradaMetaActiva,
];

export function registrarCatalogo(): void {
  registrar("ResumenTarjeta", ResumenTarjeta as never);
  registrar("PlanDePago", PlanDePago as never);
  registrar("Confirmacion", Confirmacion as never);
  registrar("Calendario", Calendario as never);
  registrar("GastoPorCategoria", GastoPorCategoria as never);
  registrar("DetalleCategoria", DetalleCategoria as never);
  registrar("SimuladorMeta", SimuladorMeta as never);
  registrar("MetaActiva", MetaActiva as never);
}

/** Los nombres que el agente tiene permitido emitir. */
export function nombresDelCatalogo(): string[] {
  return CATALOGO.map((c) => c.nombre);
}

export { Calendario, Confirmacion, DetalleCategoria, GastoPorCategoria, MetaActiva, PlanDePago, ResumenTarjeta, SimuladorMeta };
export * from "./comunes";
