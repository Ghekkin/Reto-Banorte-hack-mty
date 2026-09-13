import type { ComponentType, ReactNode } from "react";

/**
 * `nombre del catalogo -> componente React`. `packages/catalogo` registra los
 * suyos al importarse; `layout/` registra Column, Row, Text, Divider.
 *
 * Es un Map en memoria del proceso: el mismo registro sirve al renderer para
 * pintar y al agente para saber que nombres tiene permitido emitir.
 */

/** Props que recibe todo componente del catalogo, ya resueltas. */
export type PropsComponente = Record<string, unknown> & {
  children?: ReactNode;
  /**
   * Se llama cuando el componente dispara su accion declarada. Con `nombre`, dispara OTRA de
   * las acciones que su entrada del catalogo declara (`accionesDe`): p. ej. «Guardar gasto» en
   * una tarjeta cuya accion declarada es tocar una fila. Un nombre que no esta declarado se
   * ignora.
   */
  alAccionar?: (contextoExtra?: Record<string, unknown>, nombre?: string) => void;
};

const registro = new Map<string, ComponentType<PropsComponente>>();

/**
 * Las acciones que cada componente puede disparar ademas de la declarada en su `action`.
 *
 * ## Por que existe
 *
 * En A2UI un componente lleva UNA `action`. `GastoPorCategoria` ya la usa para abrir el
 * detalle de una fila (`ver_categoria`), y los ajustes en vivo le piden un segundo boton,
 * «Guardar gasto» (`registrar_gasto_externo`, `docs/como-funciona/ajustes-en-vivo.md`). Meter
 * un componente nuevo solo para el boton rompe la idea de "la misma tarjeta cambia", y cambiar
 * la `action` segun el estado obliga al agente a parchear estructura.
 *
 * La salida: la entrada del catalogo declara la lista completa (`acciones`), el catalogo la
 * registra aqui, y el renderer deja pasar un `nombre` distinto al de `action` SOLO si esta en
 * esa lista. El mensaje que sale sigue siendo un `action` A2UI valido, con su propio nombre; lo
 * que el componente no puede hacer es inventarse uno.
 */
const accionesExtra = new Map<string, readonly string[]>();

export function definirAcciones(nombre: string, acciones: readonly string[]): void {
  accionesExtra.set(nombre, acciones);
}

/** Las acciones declaradas en el catalogo para ese componente (vacio si no declaro ninguna). */
export function accionesDe(nombre: string): readonly string[] {
  return accionesExtra.get(nombre) ?? [];
}

export function registrar(nombre: string, componente: ComponentType<PropsComponente>): void {
  if (registro.has(nombre) && process.env.NODE_ENV !== "production") {
    console.warn(`[a2ui] "${nombre}" ya estaba registrado; se reemplaza`);
  }
  registro.set(nombre, componente);
}

export function registrarVarios(mapa: Record<string, ComponentType<PropsComponente>>): void {
  for (const [nombre, componente] of Object.entries(mapa)) registrar(nombre, componente);
}

export function obtener(nombre: string): ComponentType<PropsComponente> | undefined {
  return registro.get(nombre);
}

/** Los nombres que el agente puede emitir y que `validar` acepta. */
export function nombres(): Set<string> {
  return new Set(registro.keys());
}

export function limpiar(): void {
  registro.clear();
  accionesExtra.clear();
}
