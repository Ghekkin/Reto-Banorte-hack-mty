import { resolverValor } from "./bindings";
import type { Accion, Componente } from "./tipos";

/**
 * Arma el `action` que vuelve al agente. Resuelve cada `{path}` del `context`
 * contra el data model: el componente no calcula nada, solo dispara.
 *
 * Toda accion que muta estado lleva `idempotencyKey` (contrato agente-cliente).
 */
export function emitirAccion(opciones: {
  componente: Componente;
  surfaceId: string;
  dataModel: Record<string, unknown>;
  /** El elemento de la lista, si el componente nacio de una plantilla. */
  item?: unknown;
  conversacionId: string;
  /** Lo que el componente sabe y el data model no (el plazo que el usuario acaba de elegir). */
  contextoExtra?: Record<string, unknown>;
  ahora?: () => string;
}): Accion | undefined {
  const { componente, surfaceId, dataModel, item, conversacionId, contextoExtra, ahora } = opciones;
  const evento = componente.action?.event;
  if (!evento) return undefined;

  const timestamp = (ahora ?? (() => new Date().toISOString()))();
  const resuelto = (resolverValor(evento.context ?? {}, dataModel, item) ?? {}) as Record<string, unknown>;

  return {
    name: evento.name,
    surfaceId,
    sourceComponentId: componente.id,
    timestamp,
    context: {
      ...resuelto,
      ...contextoExtra,
      idempotencyKey: `${conversacionId}:${timestamp}`,
    },
  };
}

/** Las que mutan estado se llaman igual que su tool; las de vista llevan prefijo. */
export function esAccionDeMutacion(nombre: string): boolean {
  return !nombre.startsWith("ver_") && !nombre.startsWith("elegir_");
}
