import { VERSION_A2UI, type MensajeA2UI } from "./tipos";

/**
 * Puerta de entrada: ninguna linea que no pase por aqui toca el estado, ni en el
 * cliente ni al salir del agente (contrato agente-cliente).
 *
 * Lo que hay: validacion estructural fiel al formato de la spec (props planas
 * junto a `id` y `component`, `children` como lista o plantilla, raiz `root`).
 *
 * LO QUE FALTA, del rol `contrato` (ADR 0008, punto 2): cargar con ajv
 * `spec/v0_9_1/json/server_to_client.json` (+ `common_types.json` y el schema de
 * NUESTRO catalogo en el lugar de `catalog.json#/$defs/anyComponent`) y correr los
 * 8 casos de `spec/v0_9_1/test/cases/` como tests. `ajv` ya es dependencia para eso.
 * Hasta entonces, esta funcion es la unica puerta y por eso rechaza de mas, no de menos.
 */

export type Resultado =
  | { ok: true; mensaje: MensajeA2UI }
  | { ok: false; errores: string[] };

const CLAVES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"] as const;

/** Nombres que el catalogo acepta; se lo pasa quien valida (registro.nombres()). */
export function validarMensaje(entrada: unknown, componentesValidos?: Set<string>): Resultado {
  const errores: string[] = [];
  if (typeof entrada !== "object" || entrada === null) {
    return { ok: false, errores: ["el mensaje no es un objeto"] };
  }
  const m = entrada as Record<string, unknown>;

  if (m.version !== VERSION_A2UI) {
    errores.push(`version debe ser "${VERSION_A2UI}", llego ${JSON.stringify(m.version)}`);
  }

  const presentes = CLAVES.filter((c) => c in m);
  if (presentes.length !== 1) {
    errores.push(`el mensaje debe llevar exactamente uno de ${CLAVES.join(", ")}; lleva ${presentes.length}`);
    return { ok: false, errores };
  }

  const clave = presentes[0]!;
  const cuerpo = m[clave] as Record<string, unknown>;
  if (typeof cuerpo !== "object" || cuerpo === null) {
    return { ok: false, errores: [`${clave} no es un objeto`] };
  }
  if (typeof cuerpo.surfaceId !== "string" || cuerpo.surfaceId.length === 0) {
    errores.push(`${clave}.surfaceId falta o no es texto`);
  }

  if (clave === "createSurface" && typeof cuerpo.catalogId !== "string") {
    errores.push("createSurface.catalogId falta o no es texto");
  }

  if (clave === "updateComponents") {
    const lista = cuerpo.components;
    if (!Array.isArray(lista)) {
      errores.push("updateComponents.components no es un arreglo");
    } else {
      const ids = new Set<string>();
      for (const [i, c] of lista.entries()) {
        if (typeof c !== "object" || c === null) {
          errores.push(`components[${i}] no es un objeto`);
          continue;
        }
        const comp = c as Record<string, unknown>;
        if (typeof comp.id !== "string" || comp.id.length === 0) errores.push(`components[${i}].id falta`);
        else if (ids.has(comp.id)) errores.push(`components[${i}].id duplicado: ${comp.id}`);
        else ids.add(comp.id);
        if (typeof comp.component !== "string") errores.push(`components[${i}].component falta`);
        else if (componentesValidos && !componentesValidos.has(comp.component)) {
          errores.push(`components[${i}].component "${comp.component}" no esta en el catalogo`);
        }
        if (comp.children !== undefined) {
          const hijos = comp.children;
          const esLista = Array.isArray(hijos) && hijos.every((h) => typeof h === "string");
          const esPlantilla =
            typeof hijos === "object" &&
            hijos !== null &&
            typeof (hijos as Record<string, unknown>).componentId === "string" &&
            typeof (hijos as Record<string, unknown>).path === "string";
          if (!esLista && !esPlantilla) {
            errores.push(`components[${i}].children no es ni lista de ids ni plantilla { componentId, path }`);
          }
        }
        if (comp.child !== undefined && typeof comp.child !== "string") {
          errores.push(`components[${i}].child debe ser el id de un componente`);
        }
      }
      // La spec pide id "root" en UNA de las listas, no en cada mensaje: un
      // updateComponents incremental es legitimo. Lo resuelve `calcularRaiz`.
    }
  }

  if (clave === "updateDataModel" && typeof cuerpo.path !== "string") {
    errores.push("updateDataModel.path falta o no es texto");
  }

  return errores.length === 0
    ? { ok: true, mensaje: entrada as MensajeA2UI }
    : { ok: false, errores };
}
