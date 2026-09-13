import { z } from "zod";
import { VERSION_A2UI, escribir, leer, type Componente, type MensajeA2UI } from "@maya/a2ui";
import { CATALOGO } from "@maya/catalogo";
import { SUPERFICIE } from "./config";
import { nombresPermitidos, revisarProps } from "./pantalla";

/**
 * `ajustar_pantalla`: cambiar lo que YA esta en pantalla sin recrearla.
 *
 * ## Por que existe
 *
 * Hasta el 2026-09-12 el agente tenia una sola salida —`pintar_pantalla`— y esa salida
 * rearma la superficie completa: `createSurface` (que **borra** el data model, ver
 * `procesar.ts`) mas la lista entera de componentes mas el data model entero. Consecuencia:
 * "y si fueran 24 meses" costaba un turno completo con sus tools, la pantalla parpadeaba
 * con sus esqueletos de carga, y cualquier estado que la interfaz hubiera acumulado se
 * perdia.
 *
 * Pero el motor A2UI nunca necesito eso. `procesar()` aplica un `updateDataModel` **sin
 * tocar `componentes` ni `raiz`**, y `<Superficie>` re-resuelve todas las props contra el
 * data model en cada render. O sea: cambiar un dato ya re-renderizaba la tarjeta sola. Lo
 * unico que faltaba era una forma de mandar el parche.
 *
 * ## Que emite
 *
 * Un `updateDataModel` por parche, con el path REAL (`/gasto/periodo`), nunca `"/"`, y
 * **sin `createSurface`**: el data model sobrevive, que es todo el punto. Y si hay que
 * cambiar una prop literal (activar una variante), un `updateComponents` con los
 * componentes fusionados.
 *
 * `updateComponents` **reemplaza** el componente por id, no lo fusiona campo por campo
 * (asi lo define la spec y asi lo hace `procesar`). Por eso un parche de props se manda
 * como el componente COMPLETO: las props viejas mas las nuevas. Es la razon por la que la
 * peticion trae el arbol entero y no solo los nombres.
 *
 * ## Lo que NO puede hacer
 *
 * Agregar, quitar ni reordenar tarjetas: solo parchea ids que ya existen. Por eso el tope
 * de `TOPE_DE_TARJETAS` no se revisa aqui —un parche no puede meter una cuarta tarjeta por
 * la puerta de atras— y por eso un cambio de tema es `pintar_pantalla`, no un ajuste.
 */

export const entradaAjustarPantalla = z.object({
  razon: z
    .string()
    .min(10)
    .describe("Una frase en segunda persona: por que este cambio, con el dato que lo justifica"),
  texto: z
    .string()
    .min(1)
    .describe("Una o dos frases: que cambio y que significa. Corto, la pantalla ya lo muestra."),
  parchesDatos: z
    .union([z.string(), z.array(z.unknown())])
    .describe(
      'Arreglo de parches al data model, cada uno { "path": "/ruta/exacta", "value": <lo nuevo> }. ' +
        "El path sale de los enlaces que ves en la pantalla actual. Ejemplo: " +
        '[{"path":"/gasto/periodo","value":"2026-07"},{"path":"/gasto/totalCentavos","value":4310050}]. ' +
        "Si solo cambias props literales, manda []",
    ),
  parchesComponentes: z
    .union([z.string(), z.array(z.unknown())])
    .optional()
    .describe(
      'Arreglo de parches de props, cada uno { "id": "<id de la pantalla>", "props": { ... } }. ' +
        "Solo para props que NO vienen del data model (una variante, un resaltado, una etiqueta): " +
        '[{"id":"gasto","props":{"orden":"variacion"}}]. Las props que no menciones se quedan como estan',
    ),
  sugerencias: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Hasta 3 siguientes preguntas que la persona podria querer hacer"),
});

export type EntradaAjustarPantalla = z.infer<typeof entradaAjustarPantalla>;

/** La pantalla contra la que se valida el parche: lo que el cliente reporto que se ve. */
export type PantallaActual = {
  arbol: Componente[];
  dataModel: Record<string, unknown>;
};

export type Ajustado =
  | { ok: true; mensajes: MensajeA2UI[]; parches: number }
  | { ok: false; errores: string[] };

/** Las llaves que un parche de props NO puede tocar: cambiar el arbol es repintar. */
const NO_PARCHEABLES = new Set(["id", "component", "children", "child", "action"]);

export function armarParches(entrada: EntradaAjustarPantalla, pantalla: PantallaActual): Ajustado {
  const errores: string[] = [];

  const parchesDatos = parsearArreglo(entrada.parchesDatos, "parchesDatos", errores);
  const parchesComponentes =
    entrada.parchesComponentes === undefined
      ? []
      : parsearArreglo(entrada.parchesComponentes, "parchesComponentes", errores);
  if (errores.length) return { ok: false, errores };

  if (parchesDatos.length === 0 && parchesComponentes.length === 0) {
    return {
      ok: false,
      errores: [
        "no mandaste ningun parche. Si no hay nada que cambiar en la pantalla, usa `responder`; " +
          "si hace falta otra pantalla, usa `pintar_pantalla`.",
      ],
    };
  }

  const mensajes: MensajeA2UI[] = [];

  for (const [i, parche] of parchesDatos.entries()) {
    const p = parche as { path?: unknown; value?: unknown };
    if (typeof p.path !== "string" || !p.path.startsWith("/")) {
      errores.push(`parchesDatos[${i}].path tiene que ser una ruta del data model que empiece con "/"`);
      continue;
    }
    if (!("value" in p)) {
      errores.push(`parchesDatos[${i}] no trae \`value\`. Para borrar una llave, usa \`pintar_pantalla\`.`);
      continue;
    }
    if (!alcanzable(pantalla.dataModel, p.path)) {
      errores.push(
        `parchesDatos[${i}]: "${p.path}" no existe en el data model de esta pantalla y su contenedor tampoco. ` +
          `Las rutas que hay son: ${rutasDePrimerNivel(pantalla.dataModel)}. Un dato nuevo se pinta con \`pintar_pantalla\`.`,
      );
      continue;
    }
    mensajes.push({ version: VERSION_A2UI, updateDataModel: { surfaceId: SUPERFICIE, path: p.path, value: p.value } });
  }

  const porId = new Map(pantalla.arbol.map((c) => [c.id, c]));
  const fusionados: Componente[] = [];

  for (const [i, parche] of parchesComponentes.entries()) {
    const p = parche as { id?: unknown; props?: unknown };
    if (typeof p.id !== "string") {
      errores.push(`parchesComponentes[${i}].id falta`);
      continue;
    }
    const viejo = porId.get(p.id);
    if (!viejo) {
      errores.push(
        `parchesComponentes[${i}]: no hay ningun componente con id "${p.id}" en esta pantalla. ` +
          `Los que hay son: ${[...porId.keys()].join(", ")}.`,
      );
      continue;
    }
    if (typeof p.props !== "object" || p.props === null || Array.isArray(p.props)) {
      errores.push(`parchesComponentes[${i}].props tiene que ser un objeto con las props que cambian`);
      continue;
    }
    const prohibidas = Object.keys(p.props).filter((k) => NO_PARCHEABLES.has(k));
    if (prohibidas.length) {
      errores.push(
        `parchesComponentes[${i}] intenta cambiar ${prohibidas.join(", ")} de "${p.id}". Un ajuste cambia props, ` +
          "no la estructura ni las acciones: para eso usa `pintar_pantalla`.",
      );
      continue;
    }
    if (!CATALOGO.some((c) => c.nombre === viejo.component)) {
      errores.push(`parchesComponentes[${i}]: "${p.id}" es ${viejo.component}, de layout, y no tiene props que ajustar`);
      continue;
    }
    // El componente COMPLETO, no solo lo que cambia: `updateComponents` reemplaza por id.
    fusionados.push({ ...viejo, ...(p.props as Record<string, unknown>) });
  }

  if (fusionados.length) {
    mensajes.push({ version: VERSION_A2UI, updateComponents: { surfaceId: SUPERFICIE, components: fusionados } });
  }

  // El componente fusionado se valida entero contra el schema de su entrada del catalogo:
  // asi una prop nueva mal escrita se cacha aqui y no en el navegador. Sin `razonDelTurno`,
  // porque el componente ya trae la suya y la del ajuste habla de otra cosa.
  //
  // Se valida contra el data model YA PARCHEADO, no contra el que llego: un parche de datos
  // y uno de props del mismo turno pueden depender entre si, y validar contra el modelo
  // viejo reportaria un error que el turno ya arreglo.
  const modeloResultante = conParchesAplicados(pantalla.dataModel, parchesDatos);
  const permitidos = nombresPermitidos();
  for (const componente of fusionados) {
    errores.push(...revisarProps(componente, undefined, modeloResultante));
    if (!permitidos.has(componente.component)) {
      errores.push(`${componente.id}: "${componente.component}" no esta en el catalogo`);
    }
  }

  if (errores.length) return { ok: false, errores };
  return { ok: true, mensajes, parches: mensajes.length };
}

/**
 * El data model como quedaria despues de este turno.
 *
 * `escribir` es pura y devuelve un objeto nuevo, asi que esto no muta la pantalla que llego.
 * Un parche con path invalido ya se reporto arriba y aqui se ignora.
 */
function conParchesAplicados(dataModel: Record<string, unknown>, parches: unknown[]): Record<string, unknown> {
  let modelo = dataModel;
  for (const parche of parches) {
    const p = parche as { path?: unknown; value?: unknown };
    if (typeof p.path !== "string" || !p.path.startsWith("/") || !("value" in p)) continue;
    modelo = escribir(modelo, p.path, p.value as never);
  }
  return modelo;
}

/**
 * Si la ruta se puede escribir sin inventarse media pantalla: o ya existe, o existe el
 * objeto que la contiene (agregar una llave a algo que ya esta es legitimo; crear
 * `/inversiones/portafolio/clases` de la nada, no).
 */
function alcanzable(dataModel: Record<string, unknown>, path: string): boolean {
  if (leer(dataModel, path) !== undefined) return true;
  const corte = path.lastIndexOf("/");
  if (corte <= 0) return true; // una llave de primer nivel: el contenedor es el data model
  const padre = leer(dataModel, path.slice(0, corte));
  return typeof padre === "object" && padre !== null && !Array.isArray(padre);
}

function rutasDePrimerNivel(dataModel: Record<string, unknown>): string {
  const llaves = Object.keys(dataModel).map((k) => `/${k}`);
  return llaves.length ? llaves.join(", ") : "(el data model esta vacio)";
}

/**
 * Los parches, vengan como arreglo nativo o como texto JSON.
 *
 * Las dos formas hacen falta y esto no es defensivo de mas: el 2026-09-12, en el primer
 * ensayo del ciclo live con el modelo real, Gemini mando `parchesDatos` como **arreglo**
 * (que es lo natural leyendo la descripcion) y el schema pedia `string`. El AI SDK rechazo
 * la llamada, el turno gasto un paso reintentando y salio una linea de error en la tira de
 * transparencia para algo que no era un error de nadie. `pintar_pantalla` no tiene el
 * problema porque sus campos se llaman `componentesJson` y `datosJson`, y ese nombre le
 * dice al modelo que van como texto.
 *
 * Se acepta texto igual porque es lo que hara el otro proveedor y lo que produce cualquiera
 * que copie la forma de `pintar_pantalla`.
 */
function parsearArreglo(entrada: string | unknown[], campo: string, errores: string[]): unknown[] {
  if (Array.isArray(entrada)) return entrada;
  let valor: unknown;
  try {
    valor = JSON.parse(entrada) as unknown;
  } catch (error) {
    errores.push(
      `${campo} no es JSON valido (${error instanceof Error ? error.message : String(error)}). ` +
        "Manda un solo arreglo, sin texto ni cercas alrededor.",
    );
    return [];
  }
  if (!Array.isArray(valor)) {
    errores.push(`${campo} tiene que ser un arreglo`);
    return [];
  }
  return valor;
}
