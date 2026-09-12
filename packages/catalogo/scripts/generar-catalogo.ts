import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { CATALOG_COMPONENT_COMMON, ESQUEMAS_DE_LAYOUT } from "@maya/a2ui/layout/esquemas";
import { CATALOGO } from "../src/index";

/**
 * Genera `catalogo.json`: **un catalogo A2UI de verdad**, con la misma forma que
 * `packages/a2ui/spec/v0_9_1/catalogs/basic/catalog.json`.
 *
 * Eso importa porque `server_to_client.json` valida cada componente contra
 * `catalog.json#/$defs/anyComponent` —una ref relativa que la spec deja abierta—. Si
 * nuestro catalogo tiene esa forma, el validador OFICIAL valida NUESTROS componentes
 * sin una sola regla escrita a mano (ver `packages/a2ui/src/esquema.ts`).
 *
 * Lo consumen tres:
 *  - el agente, para validar la pantalla antes de emitirla y para su prompt;
 *  - `apps/web`, que lo sirve en `/catalogo/v1.json` — el `catalogId` de cada
 *    `createSurface`, que un juez puede abrir;
 *  - los tests, que comprueban que cada ejemplo `.jsonl` valida contra el.
 *
 * Se corre con `pnpm catalogo` y **no se edita a mano**: agregar un componente es
 * agregar su Zod y dos lineas en `src/index.ts`. Lo demas sale de aqui.
 */

const COMUNES = "https://a2ui.org/specification/v0_9/common_types.json";

/**
 * La URL de desarrollo, SIEMPRE. El archivo generado tiene que ser identico en cualquier
 * maquina: el CI corre `pnpm catalogo` y exige que no cambie nada (`ci-y-deploy.yml`), y
 * una variable de entorno ahi dentro haria fallar el diff segun quien lo corra.
 *
 * En produccion, `apps/web/src/app/catalogo/v1.json/route.ts` reescribe `$id` y
 * `catalogId` con `URL_CATALOGO` al servirlo, que es la URL que un juez abre.
 */
const URL = "http://localhost:3000/catalogo/v1.json";

type Esquema = Record<string, unknown>;

/**
 * Toda prop acepta su valor literal **o** un enlace al data model (`{ "path": "/…" }`),
 * que es como A2UI separa la estructura de los datos. La spec lo hace con sus
 * `DynamicString`/`DynamicNumber`; nosotros envolvemos el schema de Zod para no perder
 * las restricciones propias (enums, minimos, formas) por el camino.
 *
 * `description` y `default` se quedan afuera del `anyOf` para que el modelo los lea sin
 * tener que entrar en las ramas.
 */
function enlazable(prop: Esquema): Esquema {
  const { description, default: porDefecto, ...resto } = prop;
  return {
    ...(description === undefined ? {} : { description }),
    ...(porDefecto === undefined ? {} : { default: porDefecto }),
    anyOf: [resto, { $ref: `${COMUNES}#/$defs/DataBinding` }],
  };
}

/**
 * La accion que el componente puede declarar, restringida a las suyas: el catalogo dice
 * que `PlanDePago` solo puede emitir `aplicar_plan_pago`, y el validador lo hace cumplir.
 * Es un `allOf` sobre el `Action` oficial: se refina, no se reemplaza.
 */
function accion(nombres: string[]): Esquema {
  return {
    description: `La accion que este componente devuelve al agente. Nombres validos: ${nombres.join(", ")}.`,
    allOf: [
      { $ref: `${COMUNES}#/$defs/Action` },
      { type: "object", properties: { event: { type: "object", properties: { name: { enum: nombres } } } } },
    ],
  };
}

const componentes: Record<string, Esquema> = {};

for (const entrada of CATALOGO) {
  const zod = z.toJSONSchema(entrada.schema, { io: "input" }) as {
    properties?: Record<string, Esquema>;
    required?: string[];
  };
  const props: Record<string, Esquema> = { component: { const: entrada.nombre } };
  for (const [nombre, prop] of Object.entries(zod.properties ?? {})) props[nombre] = enlazable(prop);
  if (entrada.acciones?.length) props.action = accion(entrada.acciones);

  componentes[entrada.nombre] = {
    type: "object",
    // `cuandoUsarlo` va como `description`: es lo que el modelo lee para elegir, y
    // tambien lo que un juez lee al abrir la URL del catalogo.
    description: entrada.cuandoUsarlo,
    allOf: [
      { $ref: `${COMUNES}#/$defs/ComponentCommon` },
      { $ref: "#/$defs/CatalogComponentCommon" },
      { type: "object", properties: props, required: ["component", ...(zod.required ?? [])] },
    ],
    // Lo que cierra la puerta a props inventadas: con `allOf`, `additionalProperties` no
    // ve lo que evaluaron las ramas; `unevaluatedProperties` si. Es lo que usa la spec.
    unevaluatedProperties: false,
  };
}

/** Los de layout viven en `packages/a2ui` (son del renderer, no del dominio). */
for (const [nombre, esquema] of Object.entries(ESQUEMAS_DE_LAYOUT)) componentes[nombre] = esquema;

const catalogo = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: URL,
  catalogId: URL,
  title: "Catalogo Maya — componentes financieros",
  description:
    "Los componentes que el agente puede invocar. Uno por intencion del usuario. " +
    "Mismo formato que el catalogo basico de A2UI v0.9.1, asi que los JSON Schema " +
    "oficiales de la spec validan estos componentes sin modificarse.",
  a2uiVersion: "v0.9.1",
  generadoPor: "pnpm catalogo",
  components: componentes,
  /** Sin funciones de cliente: toda decision es del agente (solo `action.event`). */
  functions: {},
  $defs: {
    CatalogComponentCommon: CATALOG_COMPONENT_COMMON,
    anyComponent: {
      oneOf: Object.keys(componentes).map((nombre) => ({ $ref: `#/components/${nombre}` })),
      discriminator: { propertyName: "component" },
    },
    anyFunction: {
      $comment: "Maya no implementa `functionCall`: quien decide es el agente. Ninguna funcion valida.",
      not: {},
    },
    theme: {
      type: "object",
      description: "Tema de la superficie. La shell mapea `primaryColor` a su token de color.",
      properties: {
        primaryColor: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        iconUrl: { type: "string", format: "uri" },
        agentDisplayName: { type: "string" },
      },
      additionalProperties: true,
    },
  },
};

const destino = resolve(import.meta.dirname, "../catalogo.json");
writeFileSync(destino, JSON.stringify(catalogo, null, 2) + "\n");
const propios = CATALOGO.length;
const layout = Object.keys(ESQUEMAS_DE_LAYOUT).length;
console.log(`catalogo.json con ${propios} componente(s) propio(s) + ${layout} de layout -> ${destino}`);
