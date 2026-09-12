/**
 * La validacion contra los JSON Schema OFICIALES de A2UI v0.9.1 (ADR 0008, punto 2).
 *
 * Vive en su propio punto de entrada (`@maya/a2ui/esquema`) y NO se re-exporta desde
 * `index.ts` a proposito: arrastra ajv y ~50 KB de schemas, y el navegador no los
 * necesita. Quien valida de verdad es el agente, en el servidor, antes de emitir
 * (contrato agente-cliente: un mensaje invalido nunca viaja). El cliente se queda con
 * la puerta liviana de `validar.ts`.
 *
 * ## El truco que hace esto posible
 *
 * `server_to_client.json` no trae el catalogo dentro: lo referencia con
 * `catalog.json#/$defs/anyComponent`, una ref RELATIVA que se resuelve contra su
 * propio `$id`. Es decir, la spec deja un hueco con forma de catalogo. Nosotros
 * decidimos que schema entra en ese hueco:
 *
 *  - el catalogo basico oficial  -> corren los 76 casos de conformidad de `spec/test/`;
 *  - el catalogo de Maya         -> el mismo validador oficial rechaza un `PlanDePago`
 *                                   con una prop que no existe.
 *
 * Un solo validador, dos catalogos, cero reglas escritas a mano.
 *
 * ## Por que no se usa el `oneOf` de arriba
 *
 * `server_to_client.json` es un `oneOf` de los cuatro mensajes, y cada componente es
 * otro `oneOf` sobre todo el catalogo. Un `variant` mal escrito produce 81 errores:
 * los de las tres ramas de mensaje que no aplican, mas uno por cada componente del
 * catalogo. Inservible para que un modelo se corrija.
 *
 * Asi que entramos por el nodo exacto: el `$defs` del mensaje que si es, y el schema
 * del componente que el propio JSON dice ser (`component: "PlanDePago"`). Son los
 * mismos schemas oficiales, leidos mas adentro. La conformidad no se negocia —para eso
 * esta `validadorDeDocumento()`, que si entra por arriba y es el que corren los tests.
 */
import AjvMod from "ajv/dist/2020.js";
import formatosMod from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { ErrorDeEsquema, ValidadorDeEsquema } from "./validar";
import comunes from "../spec/v0_9_1/json/common_types.json";
import catalogoBasico from "../spec/v0_9_1/catalogs/basic/catalog.json";
import servidorACliente from "../spec/v0_9_1/json/server_to_client.json";
import clienteAServidor from "../spec/v0_9_1/json/client_to_server.json";

/* ajv y ajv-formats son CommonJS; segun quien los cargue, la clase llega en `default`. */
const Ajv = ((AjvMod as unknown as { default?: unknown }).default ?? AjvMod) as typeof AjvMod;
const agregarFormatos = ((formatosMod as unknown as { default?: unknown }).default ??
  formatosMod) as (ajv: unknown) => void;

/** El espacio de nombres de la spec. Las refs relativas se resuelven contra esto. */
const BASE = "https://a2ui.org/specification/v0_9/";
const ID_CATALOGO = `${BASE}catalog.json`;
const ID_SERVIDOR = `${BASE}server_to_client.json`;
const ID_CLIENTE = `${BASE}client_to_server.json`;

/** Cada clave de mensaje con el `$defs` que la define en el schema oficial. */
const DEFINICION: Record<string, string> = {
  createSurface: "CreateSurfaceMessage",
  updateComponents: "UpdateComponentsMessage",
  updateDataModel: "UpdateDataModelMessage",
  deleteSurface: "DeleteSurfaceMessage",
};

/* `ErrorDeEsquema` y `ValidadorDeEsquema` se definen en `validar.ts`: ahi es donde se
   consumen, y asi este modulo (con ajv dentro) nunca aparece en el bundle del cliente. */

/** Un catalogo A2UI: el basico oficial, el nuestro, o el de quien sea. */
export type CatalogoA2UI = {
  components?: Record<string, unknown>;
  $defs?: Record<string, unknown>;
  [clave: string]: unknown;
};

function nuevoAjv(catalogo: CatalogoA2UI) {
  const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
  agregarFormatos(ajv);
  ajv.addSchema(comunes, `${BASE}common_types.json`);
  // El catalogo entra con el `$id` que la ref relativa espera, sea cual sea el suyo.
  ajv.addSchema({ ...catalogo, $id: ID_CATALOGO }, ID_CATALOGO);
  ajv.addSchema(servidorACliente, ID_SERVIDOR);
  ajv.addSchema(clienteAServidor, ID_CLIENTE);
  return ajv;
}

function traducir(errores: ErrorObject[] | null | undefined): ErrorDeEsquema[] {
  return (errores ?? []).map((e) => ({
    donde: e.instancePath || "/",
    mensaje: detalle(e),
  }));
}

/** El mensaje de ajv mas el dato que lo hace accionable (que valores si se aceptan). */
function detalle(e: ErrorObject): string {
  const base = e.message ?? "no cumple el schema";
  if (e.keyword === "enum") {
    const valores = (e.params as { allowedValues?: unknown[] }).allowedValues ?? [];
    return `${base}: ${valores.map((v) => JSON.stringify(v)).join(", ")}`;
  }
  if (e.keyword === "additionalProperties" || e.keyword === "unevaluatedProperties") {
    const prop =
      (e.params as { additionalProperty?: string; unevaluatedProperty?: string }).additionalProperty ??
      (e.params as { unevaluatedProperty?: string }).unevaluatedProperty;
    return `la propiedad "${prop}" no existe en este componente`;
  }
  if (e.keyword === "required") {
    return `falta la propiedad "${(e.params as { missingProperty?: string }).missingProperty}"`;
  }
  return base;
}

/**
 * El validador que usa el agente: preciso, con el catalogo que se le pase.
 *
 * Devuelve `[]` cuando el mensaje es valido. Nunca lanza: un mensaje que ni parece
 * mensaje tambien sale como error, porque quien llama ya tiene como reportarlo.
 */
export function crearValidador(catalogo: CatalogoA2UI): ValidadorDeEsquema {
  const ajv = nuevoAjv(catalogo);
  const porMensaje = new Map<string, ValidateFunction>();
  for (const [clave, def] of Object.entries(DEFINICION)) {
    const v = ajv.getSchema(`${ID_SERVIDOR}#/$defs/${def}`);
    if (v) porMensaje.set(clave, v);
  }
  const nombresDelCatalogo = new Set(Object.keys(catalogo.components ?? {}));
  const porComponente = new Map<string, ValidateFunction>();
  for (const nombre of nombresDelCatalogo) {
    const v = ajv.getSchema(`${ID_CATALOGO}#/components/${nombre}`);
    if (v) porComponente.set(nombre, v);
  }

  return (mensaje: unknown): ErrorDeEsquema[] => {
    if (typeof mensaje !== "object" || mensaje === null) {
      return [{ donde: "/", mensaje: "el mensaje no es un objeto" }];
    }
    const m = mensaje as Record<string, unknown>;
    const claves = Object.keys(DEFINICION).filter((c) => c in m);
    if (claves.length !== 1) {
      return [
        {
          donde: "/",
          mensaje: `el mensaje debe llevar exactamente uno de ${Object.keys(DEFINICION).join(", ")}; lleva ${claves.length}`,
        },
      ];
    }
    const clave = claves[0]!;
    const validarMensajeDelTipo = porMensaje.get(clave);
    if (!validarMensajeDelTipo) return [{ donde: "/", mensaje: `tipo de mensaje desconocido: ${clave}` }];

    const errores: ErrorDeEsquema[] = [];
    if (!validarMensajeDelTipo(m)) {
      const prefijo = "/updateComponents/components/";
      for (const e of validarMensajeDelTipo.errors ?? []) {
        // Los errores de dentro de un componente los reemplaza el paso de abajo, que
        // sabe contra que componente comparar. El `oneOf` de `anyComponent` solo grita.
        if (e.instancePath.startsWith(prefijo) || e.keyword === "oneOf") continue;
        errores.push(...traducir([e]));
      }
    }

    if (clave === "updateComponents") {
      const cuerpo = m.updateComponents as { components?: unknown };
      const lista = Array.isArray(cuerpo?.components) ? cuerpo.components : [];
      for (const [i, componente] of lista.entries()) {
        errores.push(...validarComponente(componente, i, porComponente, nombresDelCatalogo));
      }
    }

    return errores;
  };
}

function validarComponente(
  componente: unknown,
  indice: number,
  porComponente: Map<string, ValidateFunction>,
  nombres: Set<string>,
): ErrorDeEsquema[] {
  const donde = `/updateComponents/components/${indice}`;
  if (typeof componente !== "object" || componente === null) {
    return [{ donde, mensaje: "no es un objeto" }];
  }
  const nombre = (componente as { component?: unknown }).component;
  if (typeof nombre !== "string") {
    return [{ donde: `${donde}/component`, mensaje: "falta el nombre del componente" }];
  }
  if (!nombres.has(nombre)) {
    return [
      {
        donde: `${donde}/component`,
        mensaje: `"${nombre}" no esta en el catalogo. Los que existen: ${[...nombres].sort().join(", ")}`,
      },
    ];
  }
  const validar = porComponente.get(nombre);
  if (!validar) return [];
  if (validar(componente)) return [];
  return traducir(validar.errors).map((e) => ({
    donde: `${donde}${e.donde === "/" ? "" : e.donde}`,
    mensaje: `${nombre}: ${e.mensaje}`,
  }));
}

/**
 * El validador de conformidad: entra por arriba del documento, como lo hace cualquier
 * implementacion de A2UI. Es el que corren los casos oficiales de `spec/v0_9_1/test/`,
 * y por eso no recorta ni un error: si el schema oficial dice que algo es invalido,
 * aqui sale invalido.
 */
export function validadorDeDocumento(catalogo: CatalogoA2UI = catalogoBasico as CatalogoA2UI): {
  servidorACliente: (mensaje: unknown) => ErrorDeEsquema[];
  clienteAServidor: (mensaje: unknown) => ErrorDeEsquema[];
} {
  const ajv = nuevoAjv(catalogo);
  const servidor = ajv.getSchema(ID_SERVIDOR);
  const cliente = ajv.getSchema(ID_CLIENTE);
  const correr = (v: ValidateFunction | undefined) => (mensaje: unknown): ErrorDeEsquema[] => {
    if (!v) return [{ donde: "/", mensaje: "el schema oficial no se pudo compilar" }];
    return v(mensaje) ? [] : traducir(v.errors);
  };
  return { servidorACliente: correr(servidor), clienteAServidor: correr(cliente) };
}

/** El catalogo basico de la spec (18 componentes). Solo para conformidad y pruebas. */
export { catalogoBasico };
