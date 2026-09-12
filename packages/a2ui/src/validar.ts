import { hijosFijos, ID_RAIZ, VERSION_A2UI, type Componente, type MensajeA2UI } from "./tipos";

/**
 * La puerta. Ninguna linea que no pase por aqui toca el estado, ni en el cliente ni al
 * salir del agente (contrato agente-cliente).
 *
 * Son tres cercos, de barato a caro, y el que llama elige hasta donde llega:
 *
 *  1. **Estructura** (siempre): el formato de la spec —exactamente una clave de mensaje,
 *     `version`, props planas, `children` como lista o plantilla—. No necesita nada.
 *  2. **Catalogo por nombre** (`nombres`): el componente existe en el registro. Es lo que
 *     el cliente puede comprobar en el navegador sin cargar ajv.
 *  3. **Schemas oficiales** (`esquema`): cada prop de cada componente contra los JSON
 *     Schema de `spec/v0_9_1/` con NUESTRO catalogo en el lugar de `anyComponent`. Vive
 *     en `@maya/a2ui/esquema` porque arrastra ajv; lo usa el agente, en el servidor.
 *
 * Y un cerco aparte, para cuando el mensaje trae la pantalla entera (`arbolCompleto`):
 * que exista la raiz `root` y que ningun componente cite a un hijo que no viene. La spec
 * permite mandar la pantalla en varios `updateComponents`, asi que esto NO se exige por
 * defecto: lo pide quien sabe que manda todo junto (el agente, en cada turno).
 */

export type Resultado = { ok: true; mensaje: MensajeA2UI } | { ok: false; errores: string[] };

/** Un error del validador de schemas: donde (JSON Pointer) y que. */
export type ErrorDeEsquema = { donde: string; mensaje: string };

/** La forma de lo que devuelve `crearValidador()` de `@maya/a2ui/esquema`. */
export type ValidadorDeEsquema = (mensaje: unknown) => ErrorDeEsquema[];

export type OpcionesDeValidacion = {
  /** Los nombres que el catalogo acepta (`registro.nombres()`). */
  nombres?: Set<string>;
  /** El validador contra los schemas oficiales, si quien llama puede pagarlo. */
  esquema?: ValidadorDeEsquema;
  /** El `updateComponents` trae la pantalla completa: se exige raiz e hijos existentes. */
  arbolCompleto?: boolean;
};

const CLAVES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"] as const;

/**
 * `validarMensaje(m)` valida estructura. `validarMensaje(m, nombres)` agrega el catalogo
 * por nombre (forma historica, se mantiene). `validarMensaje(m, { … })` es el control
 * completo.
 */
export function validarMensaje(entrada: unknown, opciones?: Set<string> | OpcionesDeValidacion): Resultado {
  const { nombres, esquema, arbolCompleto } = normalizar(opciones);
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
      if (lista.length === 0) errores.push("updateComponents.components viene vacio");
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
        else if (nombres && !nombres.has(comp.component)) {
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
      // updateComponents incremental es legitimo. Por eso `arbolCompleto` es opcional.
      if (arbolCompleto && errores.length === 0) {
        errores.push(...revisarArbolCompleto(lista as Componente[]));
      }
    }
  }

  // `path` y `value` son opcionales en la spec (sin `value` se borra la llave), asi que
  // aqui solo se comprueba el tipo de lo que si vino.
  if (clave === "updateDataModel" && cuerpo.path !== undefined && typeof cuerpo.path !== "string") {
    errores.push("updateDataModel.path no es texto");
  }

  // El cerco caro va al final: si la estructura ya esta mal, sus errores solo estorban.
  if (esquema && errores.length === 0) {
    errores.push(...esquema(entrada).map((e) => `${e.donde} ${e.mensaje}`));
  }

  return errores.length === 0 ? { ok: true, mensaje: entrada as MensajeA2UI } : { ok: false, errores };
}

function normalizar(opciones?: Set<string> | OpcionesDeValidacion): OpcionesDeValidacion {
  if (!opciones) return {};
  return opciones instanceof Set ? { nombres: opciones } : opciones;
}

/**
 * Una lista de componentes que se supone completa tiene que poder pintarse: con raiz
 * `root` y sin citar hijos que no existen. Un hijo inexistente no es un error de la
 * spec, es un hueco invisible en la pantalla; vale mas rechazarlo aqui —donde el agente
 * lee el error y lo corrige— que descubrirlo en el navegador.
 */
export function revisarArbolCompleto(componentes: Componente[]): string[] {
  const errores: string[] = [];
  const ids = new Set(componentes.map((c) => c.id));
  if (!ids.has(ID_RAIZ)) {
    errores.push(`falta el componente raiz: uno de los componentes tiene que tener id "${ID_RAIZ}"`);
  }
  for (const componente of componentes) {
    for (const hijo of hijosFijos(componente)) {
      if (!ids.has(hijo)) errores.push(`${componente.id} declara el hijo "${hijo}", que no esta en la lista`);
    }
    const plantilla = componente.children;
    if (plantilla && !Array.isArray(plantilla) && !ids.has(plantilla.componentId)) {
      errores.push(`${componente.id} usa la plantilla "${plantilla.componentId}", que no esta en la lista`);
    }
  }
  return errores;
}
