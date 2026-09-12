import { escribir } from "./bindings";
import { hijosFijos, ID_RAIZ, type Componente, type Estado, type EstadoSuperficie, type MensajeA2UI } from "./tipos";

/**
 * El reducer: (estado, mensaje) -> estado nuevo. Puro. No hace fetch, no conoce
 * React. Se prueba con los `.jsonl` de `ejemplos/`.
 *
 * Un mensaje que no aplica (superficie inexistente, por ejemplo) devuelve el
 * MISMO estado y un error: nunca deja el estado a medias.
 */
export type ResultadoProceso = { estado: Estado; error?: string };

export function procesar(estado: Estado, mensaje: MensajeA2UI): ResultadoProceso {
  if ("createSurface" in mensaje) {
    const { surfaceId, catalogId } = mensaje.createSurface;
    const siguiente = new Map(estado);
    siguiente.set(surfaceId, {
      id: surfaceId,
      catalogId,
      componentes: new Map(),
      dataModel: {},
    });
    return { estado: siguiente };
  }

  if ("deleteSurface" in mensaje) {
    const siguiente = new Map(estado);
    siguiente.delete(mensaje.deleteSurface.surfaceId);
    return { estado: siguiente };
  }

  if ("updateComponents" in mensaje) {
    const { surfaceId, components } = mensaje.updateComponents;
    const superficie = estado.get(surfaceId);
    if (!superficie) return { estado, error: `superficie desconocida: ${surfaceId}` };
    const componentes = new Map(superficie.componentes);
    for (const c of components) componentes.set(c.id, c);
    const actualizada: EstadoSuperficie = { ...superficie, componentes, raiz: calcularRaiz(componentes) };
    const siguiente = new Map(estado);
    siguiente.set(surfaceId, actualizada);
    return { estado: siguiente };
  }

  const { surfaceId, path, value } = mensaje.updateDataModel;
  const superficie = estado.get(surfaceId);
  if (!superficie) return { estado, error: `superficie desconocida: ${surfaceId}` };
  const actualizada: EstadoSuperficie = {
    ...superficie,
    dataModel: escribir(superficie.dataModel, path, value),
  };
  const siguiente = new Map(estado);
  siguiente.set(surfaceId, actualizada);
  return { estado: siguiente };
}

/**
 * La spec exige que la raiz del arbol tenga `id: "root"`. Si no llega (agente
 * despistado), se cae al unico componente que nadie declara como hijo, para que
 * la pantalla salga igual y el aviso quede en consola.
 */
export function calcularRaiz(componentes: Map<string, Componente>): string | undefined {
  if (componentes.has(ID_RAIZ)) return ID_RAIZ;
  const hijos = new Set<string>();
  for (const c of componentes.values()) for (const h of hijosFijos(c)) hijos.add(h);
  const sueltos = [...componentes.keys()].filter((id) => !hijos.has(id));
  return sueltos[0];
}

/** Aplica una tanda de mensajes en orden; junta los errores sin cortar el flujo. */
export function procesarVarios(estado: Estado, mensajes: MensajeA2UI[]): ResultadoProceso {
  let actual = estado;
  const errores: string[] = [];
  for (const m of mensajes) {
    const r = procesar(actual, m);
    actual = r.estado;
    if (r.error) errores.push(r.error);
  }
  return errores.length ? { estado: actual, error: errores.join("; ") } : { estado: actual };
}
