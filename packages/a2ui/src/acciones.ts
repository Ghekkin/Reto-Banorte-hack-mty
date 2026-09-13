import { resolverValor } from "./bindings";
import { VERSION_A2UI, type Accion, type Componente } from "./tipos";

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
  /**
   * Otra de las acciones que el catalogo declara para este componente (`accionesDe`), en vez de
   * la de su `action`. Ya viene validada por quien llama. Su context es SOLO `contextoExtra`: los
   * enlaces del `action` declarado son de la otra accion y no le corresponden.
   */
  nombre?: string;
  ahora?: () => string;
}): Accion | undefined {
  const { componente, surfaceId, dataModel, item, conversacionId, contextoExtra, nombre, ahora } = opciones;
  const evento = componente.action?.event;
  if (!evento) return undefined;

  const timestamp = (ahora ?? (() => new Date().toISOString()))();
  const otra = nombre !== undefined && nombre !== evento.name;
  const resuelto = otra ? {} : ((resolverValor(evento.context ?? {}, dataModel, item) ?? {}) as Record<string, unknown>);

  return {
    name: otra ? nombre : evento.name,
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

/**
 * El mensaje cliente->servidor tal como lo define `client_to_server.json`: la accion
 * envuelta en `{ version, action }`, exactamente dos propiedades.
 *
 * Nuestro contrato manda `accion` sin envoltura (el objeto de adentro ES el `action` de
 * la spec, campo por campo); el transporte la aporta. Esta funcion existe para que
 * quien quiera hablar A2UI puro —otro cliente, un test de conformidad— tenga el mensaje
 * completo sin rearmarlo a mano.
 */
export function mensajeClienteAServidor(accion: Accion): { version: typeof VERSION_A2UI; action: Accion } {
  return { version: VERSION_A2UI, action: accion };
}
