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
  /** Se llama cuando el componente dispara su accion declarada. */
  alAccionar?: (contextoExtra?: Record<string, unknown>) => void;
};

const registro = new Map<string, ComponentType<PropsComponente>>();

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
}
