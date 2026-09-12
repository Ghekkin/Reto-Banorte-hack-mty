/**
 * Los schemas de los cuatro componentes de layout, en el formato de catalogo de A2UI
 * (`spec/v0_9_1/catalogs/basic/catalog.json`: `allOf` de ComponentCommon +
 * CatalogComponentCommon + las props propias, con `unevaluatedProperties: false`).
 *
 * Por que a mano y no con Zod: este paquete no depende de Zod ni tiene por que. Son
 * cuatro componentes tontos de una docena de lineas; el catalogo financiero si sale de
 * Zod, en `packages/catalogo`.
 *
 * Por que existen: el agente tiene permitido emitir `Column`, `Row`, `Text` y
 * `Divider`, asi que el catalogo que publicamos tiene que describirlos. Si no, el
 * validador oficial rechazaria una pantalla que el agente armo bien.
 */
import { NOMBRES_DE_LAYOUT, type NombreDeLayout } from "./nombres";

const COMUNES = "https://a2ui.org/specification/v0_9/common_types.json";

/** La separacion entre hijos, con los mismos nombres que usan los componentes React. */
const SEPARACION = {
  type: "string",
  description: "Separacion entre los hijos. Default: normal",
  enum: ["chica", "normal", "amplia"],
  default: "normal",
} as const;

/**
 * Las dos props comunes de NUESTRO catalogo. Los de layout no hacen nada con ellas, pero
 * las aceptan: van publicados en el mismo `catalogo.json` que los financieros, asi que
 * para el modelo son "componentes del catalogo" y les pone `razon` como le pide el
 * prompt. Rechazar la pantalla completa por una frase decorativa en un `Text` es un mal
 * negocio: se acepta y se ignora. (`ancho` si tiene efecto en un contenedor raiz: la
 * envoltura del renderer le pone `data-ancho` y la rejilla bento le da dos columnas.)
 */
const COMUNES_DEL_CATALOGO = {
  ancho: {
    type: "string",
    description: "normal = 1 columna de la rejilla; amplio = 2",
    enum: ["normal", "amplio"],
    default: "normal",
  },
  razon: {
    type: "string",
    description: "Solo la llevan los componentes financieros; aqui se acepta y se ignora",
  },
} as const;

/** Un componente del catalogo, con la envoltura que pide la spec. */
function componente(nombre: NombreDeLayout, propias: Record<string, unknown>, requeridas: string[], descripcion: string) {
  return {
    type: "object",
    allOf: [
      { $ref: `${COMUNES}#/$defs/ComponentCommon` },
      { $ref: "#/$defs/CatalogComponentCommon" },
      {
        type: "object",
        description: descripcion,
        properties: { component: { const: nombre }, ...COMUNES_DEL_CATALOGO, ...propias },
        required: ["component", ...requeridas],
      },
    ],
    unevaluatedProperties: false,
  };
}

const HIJOS = {
  description:
    "Los hijos: arreglo de ids, o una plantilla { componentId, path } para repetir un componente por cada elemento de una lista del data model.",
  $ref: `${COMUNES}#/$defs/ChildList`,
} as const;

export const ESQUEMAS_DE_LAYOUT: Record<NombreDeLayout, Record<string, unknown>> = {
  Column: componente("Column", { children: HIJOS, separacion: SEPARACION }, ["children"], "Apila a sus hijos en vertical."),
  Row: componente("Row", { children: HIJOS, separacion: SEPARACION }, ["children"], "Acomoda a sus hijos en horizontal; salta de linea si no caben."),
  Text: componente(
    "Text",
    {
      texto: { description: "El texto a mostrar.", $ref: `${COMUNES}#/$defs/DynamicString` },
      tono: { type: "string", description: "suave para texto secundario", enum: ["normal", "suave"], default: "normal" },
    },
    ["texto"],
    "Una linea de texto. Para titulos y cifras, usa el componente del catalogo que corresponda.",
  ),
  Divider: componente("Divider", {}, [], "Una linea divisoria."),
};

/** `weight`, la unica prop comun del catalogo basico: el flex-grow dentro de Row/Column. */
export const CATALOG_COMPONENT_COMMON = {
  type: "object",
  properties: {
    weight: {
      type: "number",
      description:
        "Peso relativo dentro de un Row o Column, como flex-grow. Solo cuando el componente es hijo directo de un Row o Column.",
    },
  },
} as const;

/** Para que nadie pueda agregar un componente de layout y olvidar su schema. */
export function hayEsquemaDeCadaLayout(): boolean {
  return NOMBRES_DE_LAYOUT.every((n) => n in ESQUEMAS_DE_LAYOUT);
}
