import { esBinding, type Props, type Valor } from "./tipos";

/**
 * JSON Pointer (RFC 6901) sobre el data model, mas la resolucion de props.
 *
 * Paths absolutos siempre (`/plan/opciones`). Un path relativo (sin `/` inicial)
 * se resuelve contra el item actual: es lo que permite plantillas dentro de listas.
 * Si el path no existe todavia -> `undefined`, y el componente pinta su estado de
 * carga (skill `ui-generativa`, tres estados).
 */

function segmentos(path: string): string[] {
  if (path === "" || path === "/") return [];
  return path
    .replace(/^\//, "")
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** Lee un valor del objeto por JSON Pointer. `undefined` si el camino no existe. */
export function leer(objeto: unknown, path: string): Valor {
  let actual: unknown = objeto;
  for (const seg of segmentos(path)) {
    if (actual === null || actual === undefined) return undefined;
    if (Array.isArray(actual)) {
      const i = Number(seg);
      if (!Number.isInteger(i)) return undefined;
      actual = actual[i];
    } else if (typeof actual === "object") {
      actual = (actual as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return actual;
}

/**
 * Escribe por JSON Pointer y devuelve un objeto NUEVO (el reducer es puro).
 * `path: "/"` reemplaza el objeto entero.
 */
export function escribir(
  objeto: Record<string, unknown>,
  path: string,
  valor: Valor,
): Record<string, unknown> {
  const segs = segmentos(path);
  if (segs.length === 0) {
    return (valor ?? {}) as Record<string, unknown>;
  }
  const copia: Record<string, unknown> = { ...objeto };
  let actual: Record<string, unknown> = copia;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!;
    const siguiente = actual[seg];
    const clon =
      Array.isArray(siguiente)
        ? [...siguiente]
        : typeof siguiente === "object" && siguiente !== null
          ? { ...(siguiente as Record<string, unknown>) }
          : {};
    actual[seg] = clon;
    actual = clon as Record<string, unknown>;
  }
  actual[segs[segs.length - 1]!] = valor;
  return copia;
}

/**
 * Borra la llave que `path` apunta y devuelve un objeto NUEVO. Es lo que la spec pide
 * cuando `updateDataModel` llega SIN `value`: "the key at 'path' is removed".
 *
 * Un camino que no existe no es un error: el resultado es el mismo objeto.
 * `path: "/"` deja el modelo vacio.
 */
export function borrar(objeto: Record<string, unknown>, path: string): Record<string, unknown> {
  const segs = segmentos(path);
  if (segs.length === 0) return {};

  const copia: Record<string, unknown> = { ...objeto };
  let actual: Record<string, unknown> | unknown[] = copia;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!;
    const siguiente: unknown = Array.isArray(actual)
      ? actual[Number(seg)]
      : (actual as Record<string, unknown>)[seg];
    if (siguiente === null || typeof siguiente !== "object") return copia; // no existe: nada que borrar
    const clon: Record<string, unknown> | unknown[] = Array.isArray(siguiente)
      ? [...siguiente]
      : { ...(siguiente as Record<string, unknown>) };
    if (Array.isArray(actual)) actual[Number(seg)] = clon;
    else (actual as Record<string, unknown>)[seg] = clon;
    actual = clon;
  }

  const ultimo = segs[segs.length - 1]!;
  if (Array.isArray(actual)) {
    const i = Number(ultimo);
    if (Number.isInteger(i)) actual.splice(i, 1);
  } else {
    delete (actual as Record<string, unknown>)[ultimo];
  }
  return copia;
}

/**
 * Sustituye cada `{ path }` de las props por su valor. Recorre objetos y arreglos
 * anidados: un `context` de accion se resuelve con la misma funcion.
 */
export function resolver(
  props: Props | undefined,
  dataModel: Record<string, unknown>,
  item?: unknown,
): Props {
  if (!props) return {};
  return resolverValor(props, dataModel, item) as Props;
}

export function resolverValor(valor: Valor, dataModel: Record<string, unknown>, item?: unknown): Valor {
  if (esBinding(valor)) {
    const absoluto = valor.path.startsWith("/");
    if (absoluto) return leer(dataModel, valor.path);
    return item === undefined ? undefined : leer(item, "/" + valor.path);
  }
  if (Array.isArray(valor)) return valor.map((v) => resolverValor(v, dataModel, item));
  if (valor !== null && typeof valor === "object") {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[k] = resolverValor(v, dataModel, item);
    }
    return salida;
  }
  return valor;
}
