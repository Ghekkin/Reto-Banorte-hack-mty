import { registrar } from "@maya/a2ui";
import { Confirmacion } from "./confirmacion/componente";
import { entradaConfirmacion } from "./confirmacion/schema";
import type { EntradaCatalogo } from "./comunes";

/**
 * El catalogo: los 8 componentes del ADR 0004. Un componente = una intencion.
 *
 * Importar este modulo REGISTRA los componentes en el renderer (`packages/a2ui`).
 * `apps/web` lo importa una vez, en el lienzo.
 *
 * Para agregar uno (skill `ui-generativa`): carpeta con schema.ts + componente.tsx
 * + README.md, el `.jsonl` en `ejemplos/`, y dos lineas aqui.
 */

export const CATALOGO: EntradaCatalogo[] = [
  entradaConfirmacion,
  // Fase 1 — rol web:
  // entradaResumenTarjeta,
  // entradaPlanDePago,
  // entradaCalendario,
  // Fase 2 — rol web:
  // entradaGastoPorCategoria,
  // entradaDetalleCategoria,
  // Fase 3 — rol web:
  // entradaSimuladorMeta,
  // entradaMetaActiva,
];

export function registrarCatalogo(): void {
  registrar("Confirmacion", Confirmacion as never);
  // registrar("ResumenTarjeta", ResumenTarjeta as never);
  // …una linea por componente, en el mismo commit que su carpeta.
}

/** Los nombres que el agente tiene permitido emitir. */
export function nombresDelCatalogo(): string[] {
  return CATALOGO.map((c) => c.nombre);
}

export { Confirmacion };
export * from "./comunes";
