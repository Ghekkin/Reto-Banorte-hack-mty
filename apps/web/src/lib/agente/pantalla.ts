import { z } from "zod";
import { tool, type Tool } from "ai";
import {
  NOMBRES_DE_LAYOUT,
  VERSION_A2UI,
  esBinding,
  propsDe,
  validarMensaje,
  type Componente,
  type MensajeA2UI,
} from "@maya/a2ui";
import { crearValidador } from "@maya/a2ui/esquema";
import { CATALOGO } from "@maya/catalogo";
import catalogoPublicado from "@maya/catalogo/catalogo.json";
import { SUPERFICIE, config } from "./config";

/**
 * `pintar_pantalla`: la tool con la que el agente entrega la interfaz.
 *
 * Por que una tool y no el texto de la respuesta: asi el modelo usa un solo mecanismo
 * (llamadas a tools) para todo el turno, el bucle del AI SDK se encarga del reintento,
 * y **nada sale de aqui sin validarse**. Si el JSON viene mal, el modelo recibe los
 * errores como resultado de la tool y lo corrige en el siguiente paso, igual que si una
 * tool de datos le hubiera fallado (contrato agente-cliente: un reintento, luego prosa).
 *
 * El modelo entrega los componentes como TEXTO JSON a proposito. Un schema estricto de
 * "arreglo de componentes con props arbitrarias" no se puede expresar de forma que los
 * dos proveedores lo acepten (props planas y distintas por componente); con texto + esta
 * validacion, el contrato se cumple igual y no depende de las rarezas de cada API.
 */

export const entradaPintarPantalla = z.object({
  razon: z
    .string()
    .min(10)
    .describe("Una frase en segunda persona: por que ESTA pantalla y no otra, con el dato que lo justifica"),
  texto: z.string().min(1).describe("Una sola frase de cierre para la conversacion. Nada de parrafos"),
  componentesJson: z
    .string()
    .describe(
      "Arreglo JSON de componentes A2UI. Props PLANAS junto a `id` y `component`. " +
        'Un componente con `id: "root"` es la raiz. Ejemplo: ' +
        '[{"id":"root","component":"Column","children":["tarjeta"]},{"id":"tarjeta","component":"Confirmacion","titulo":"…","detalle":"…","razon":"…"}]',
    ),
  datosJson: z
    .string()
    .optional()
    .describe('Objeto JSON del data model, si usas enlaces {"path":"/…"} en las props. Default: {}'),
  sugerencias: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Hasta 3 siguientes preguntas que la persona podria querer hacer"),
});

export type EntradaPintarPantalla = z.infer<typeof entradaPintarPantalla>;

export type ResultadoPintar = { ok: true; componentes: number } | { ok: false; errores: string[] };

export type Pintor = {
  /** La tool que se le pasa al modelo. */
  herramienta: Tool;
  /** Los mensajes A2UI listos para emitir; se vacia al leerlos. */
  tomarMensajes: () => MensajeA2UI[];
  /** Lo que el modelo escribio junto a la pantalla. */
  ultima: () => { razon: string; texto: string; sugerencias: string[] } | undefined;
  /** true en cuanto una pantalla valida salio: el turno puede terminar. */
  pintada: () => boolean;
  /** Cuantas veces el modelo entrego una pantalla invalida. */
  intentosFallidos: () => number;
};

/**
 * Cada turno crea su propio pintor: guarda los mensajes validados para que el turno los
 * emita en orden, y cuenta los intentos para no reintentar para siempre.
 */
export function crearPintor(): Pintor {
  let mensajes: MensajeA2UI[] = [];
  let ultima: { razon: string; texto: string; sugerencias: string[] } | undefined;
  let pintada = false;
  let fallidos = 0;

  const herramienta = tool({
    description:
      "Entrega la interfaz que resuelve el problema de la persona. Llamala UNA vez por turno, al final, " +
      "cuando ya tengas los datos que necesitas. Usa solo componentes del catalogo. Si algo viene mal, " +
      "te devuelvo los errores y la vuelves a llamar corregida.",
    inputSchema: entradaPintarPantalla,
    execute: (entrada: EntradaPintarPantalla): ResultadoPintar => {
      const armado = armarMensajes(entrada);
      if (!armado.ok) {
        fallidos++;
        return { ok: false, errores: armado.errores };
      }
      mensajes = armado.mensajes;
      ultima = {
        razon: entrada.razon,
        texto: entrada.texto,
        sugerencias: entrada.sugerencias ?? [],
      };
      pintada = true;
      return { ok: true, componentes: armado.componentes };
    },
  });

  return {
    herramienta,
    tomarMensajes: () => {
      const salida = mensajes;
      mensajes = [];
      return salida;
    },
    ultima: () => ultima,
    pintada: () => pintada,
    intentosFallidos: () => fallidos,
  };
}

/**
 * La validacion contra los JSON Schema oficiales de A2UI con NUESTRO catalogo dentro
 * (`packages/a2ui/src/esquema.ts`). Compilar ajv cuesta unos cientos de ms, asi que se
 * hace una vez por proceso y no una por turno.
 */
let validadorOficial: ReturnType<typeof crearValidador> | undefined;
function esquemaDelCatalogo(): ReturnType<typeof crearValidador> {
  validadorOficial ??= crearValidador(catalogoPublicado);
  return validadorOficial;
}

/** Los nombres que el agente tiene permitido emitir: el catalogo mas el layout basico. */
export function nombresPermitidos(): Set<string> {
  return new Set<string>([...NOMBRES_DE_LAYOUT, ...CATALOGO.map((c) => c.nombre)]);
}

type Armado = { ok: true; mensajes: MensajeA2UI[]; componentes: number } | { ok: false; errores: string[] };

/**
 * De lo que dijo el modelo a los tres mensajes A2UI del turno.
 *
 * La superficie se **rearma completa** en cada turno (`createSurface` + la lista entera
 * de componentes + el data model entero). Es mas simple y mas predecible que mandar
 * parches: `procesar()` fusiona componentes por id, asi que un update parcial dejaria
 * vivos los de la pantalla anterior y la interfaz mentiria.
 */
export function armarMensajes(entrada: EntradaPintarPantalla): Armado {
  const errores: string[] = [];

  const componentes = parsear(entrada.componentesJson, "componentesJson", errores);
  const datos = entrada.datosJson ? parsear(entrada.datosJson, "datosJson", errores) : {};
  if (errores.length) return { ok: false, errores };

  if (!Array.isArray(componentes)) return { ok: false, errores: ["componentesJson tiene que ser un arreglo de componentes"] };
  if (componentes.length === 0) return { ok: false, errores: ["componentesJson viene vacio"] };
  // El data model es la raiz del JSON Pointer: tiene que ser un objeto. Un arreglo o un
  // texto ahi dejarian al renderer resolviendo `/plan/plazo` contra algo que no lo tiene.
  if (!esObjetoPlano(datos)) return { ok: false, errores: ["datosJson tiene que ser un objeto JSON ({ ... })"] };

  const mensajes: MensajeA2UI[] = [
    { version: VERSION_A2UI, createSurface: { surfaceId: SUPERFICIE, catalogId: config.urlCatalogo } },
    { version: VERSION_A2UI, updateComponents: { surfaceId: SUPERFICIE, components: componentes as Componente[] } },
    { version: VERSION_A2UI, updateDataModel: { surfaceId: SUPERFICIE, path: "/", value: datos } },
  ];

  // 1) y 2) Estructura, catalogo por nombre y arbol completo (raiz `root` e hijos que
  // existan): la misma puerta que usa el cliente, en su modo "la pantalla viene entera".
  const permitidos = nombresPermitidos();
  for (const mensaje of mensajes) {
    const resultado = validarMensaje(mensaje, { nombres: permitidos, arbolCompleto: true });
    if (!resultado.ok) errores.push(...resultado.errores);
  }

  // 3) Las props de cada componente, contra el schema de su entrada del catalogo, y la
  // regla de diseno que ningun schema individual puede ver: un solo heroe por pantalla.
  for (const componente of componentes as Componente[]) {
    errores.push(...revisarProps(componente, entrada.razon));
  }
  const heroes = (componentes as Componente[]).filter((c) => c.heroe === true).map((c) => c.id);
  if (heroes.length > 1) {
    errores.push(`solo un componente por pantalla puede llevar heroe: true; lo llevan ${heroes.join(", ")}`);
  }

  // 4) Y el cerco de verdad: los JSON Schema OFICIALES de A2UI v0.9.1 con nuestro
  // catalogo en el lugar de `anyComponent`. Va al final porque los pasos 2 y 3 dan
  // mejores mensajes para lo suyo (y el 3 completa la `razon` que falte); este pilla lo
  // que ninguno mira: props inventadas, formas mal anidadas, nombres de accion que el
  // catalogo no declara. Cuando un componente nuevo entra al catalogo, esto lo valida
  // sin que nadie escriba una regla.
  if (errores.length === 0) {
    const validar = esquemaDelCatalogo();
    for (const mensaje of mensajes) {
      errores.push(...validar(mensaje).map((e) => `${e.donde} ${e.mensaje}`));
    }
  }

  return errores.length ? { ok: false, errores } : { ok: true, mensajes, componentes: componentes.length };
}

function parsear(texto: string, campo: string, errores: string[]): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch (error) {
    errores.push(`${campo} no es JSON valido: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Valida las props contra el schema del catalogo. Las props enlazadas (`{path}`) no se
 * pueden validar por valor —lo resuelve el cliente contra el data model—, asi que se
 * omiten sus errores y se revisa todo lo demas.
 *
 * `razon` es obligatoria en todo componente del catalogo y es la evidencia de que el
 * agente decidio; si al modelo se le olvida en un componente, se le pone la del turno en
 * vez de rechazar la pantalla completa por una frase.
 */
function revisarProps(componente: Componente, razonDelTurno: string): string[] {
  const entrada = CATALOGO.find((c) => c.nombre === componente.component);
  if (!entrada) return []; // layout: no tiene schema propio

  if (componente.razon === undefined) componente.razon = razonDelTurno;

  const props = propsDe(componente);
  const enlazadas = new Set(Object.keys(props).filter((k) => esBinding(props[k])));
  const literales: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) if (!enlazadas.has(k)) literales[k] = v;

  const resultado = entrada.schema.safeParse(literales);
  if (resultado.success) return [];

  return resultado.error.issues
    .filter((issue) => !enlazadas.has(String(issue.path[0])))
    .map((issue) => `${componente.component} (${componente.id}): ${issue.path.join(".") || "props"} ${issue.message}`);
}
