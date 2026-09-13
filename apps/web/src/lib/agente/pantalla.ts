import { z } from "zod";
import {
  ID_RAIZ,
  NOMBRES_DE_LAYOUT,
  VERSION_A2UI,
  esBinding,
  hijosFijos,
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
  texto: z
    .string()
    .min(1)
    .describe(
      "Lo que le dirias de frente: de una a tres frases con el dato clave y tu recomendacion. " +
        "No describas la pantalla, aconseja. Nada de parrafos.",
    ),
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

export const MAX_INTENTOS_DE_PANTALLA = 2;

export function resolverSugerenciasPantalla(entrada: EntradaPintarPantalla): string[] {
  if (entrada.sugerencias && entrada.sugerencias.length > 0) {
    return entrada.sugerencias.slice(0, 3);
  }
  try {
    const componentes = JSON.parse(entrada.componentesJson) as Array<Record<string, unknown>>;
    const datos = entrada.datosJson ? (JSON.parse(entrada.datosJson) as Record<string, unknown>) : {};
    const conclusion = componentes.find((c) => c && c.component === "Conclusion");
    if (conclusion && conclusion.sugerencias) {
      if (Array.isArray(conclusion.sugerencias)) {
        return conclusion.sugerencias.filter((s): s is string => typeof s === "string").slice(0, 3);
      }
      if (
        typeof conclusion.sugerencias === "object" &&
        conclusion.sugerencias !== null &&
        "path" in conclusion.sugerencias
      ) {
        const path = String((conclusion.sugerencias as { path: string }).path).replace(/^\//, "");
        const partes = path.split("/");
        let cursor: unknown = datos;
        for (const p of partes) {
          if (cursor && typeof cursor === "object" && p in cursor) {
            cursor = (cursor as Record<string, unknown>)[p];
          } else {
            cursor = undefined;
            break;
          }
        }
        if (Array.isArray(cursor)) {
          return cursor.filter((s): s is string => typeof s === "string").slice(0, 3);
        }
      }
    }
  } catch {
    // Si no parsea, armarMensajes reporta el fallo
  }
  return [];
}

/**
 * Cuantas tarjetas puede traer una pantalla, `Conclusion` incluida.
 *
 * Es un tope de CODIGO y no una linea del prompt porque el prompt ya lo decia ("de 1 a 4")
 * y el modelo se pasaba igual: una pantalla de seis tarjetas no cabe en un celular, obliga
 * a desplazar para encontrar el boton y deja de tener "una sola idea principal". Lo unico
 * que se validaba por cantidad era `heroe <= 1`.
 */
export const TOPE_DE_TARJETAS = 3;

const LAYOUT = new Set<string>(NOMBRES_DE_LAYOUT);

/**
 * Las tarjetas que la persona va a ver de verdad: lo alcanzable desde `root`, sin los
 * componentes de layout (agrupan, no son una idea).
 *
 * Se cuenta sobre el ARBOL y no sobre el arreglo por la misma razon que existe
 * `componentesVisibles` en el motor: un componente que nadie declara como hijo no se
 * pinta, y contarlo haria rechazar pantallas que en pantalla caben de sobra.
 */
export function tarjetasDePantalla(componentes: Componente[]): Componente[] {
  const porId = new Map(componentes.map((c) => [c.id, c]));
  const vistos = new Set<string>();
  const tarjetas: Componente[] = [];
  const pendientes: string[] = [ID_RAIZ];

  while (pendientes.length > 0) {
    const id = pendientes.shift()!;
    if (vistos.has(id)) continue;
    vistos.add(id);
    const componente = porId.get(id);
    if (!componente) continue;
    if (!LAYOUT.has(componente.component)) tarjetas.push(componente);
    pendientes.push(...hijosFijos(componente));
    const plantilla = componente.children;
    if (plantilla && !Array.isArray(plantilla)) pendientes.push(plantilla.componentId);
  }
  return tarjetas;
}

/**
 * Recorta la pantalla al tope, de forma determinista.
 *
 * Es la red de seguridad del ultimo intento: el primer rebase le vuelve al modelo como
 * error de tool para que lo corrija (que es lo que se quiere, porque el modelo sabe cual
 * de sus tarjetas contesta la pregunta), pero si insiste, mas vale una pantalla de tres
 * tarjetas que ninguna. Un turno **nunca** muere por el tope.
 *
 * Se queda con la `Conclusion` —es el veredicto— y con las demas en el orden en que se lee
 * la pantalla. La raiz se rearma como `Column` con solo las que quedaron: reusar sus
 * `children` viejos dejaria ids que ya no existen, y un hijo fantasma tumba el arbol.
 */
export function podarAlTope(componentes: Componente[], tope = TOPE_DE_TARJETAS): Componente[] {
  const tarjetas = tarjetasDePantalla(componentes);
  if (tarjetas.length <= tope) return componentes;

  const porId = new Map(componentes.map((c) => [c.id, c]));
  const raizVieja = porId.get(ID_RAIZ);
  // Con una tarjeta como raiz no hay nada que recortar sin inventar un arbol: las tarjetas
  // del catalogo no llevan hijos, asi que este caso no se da con una pantalla real. Se
  // deja pasar en vez de devolver un arbol roto.
  if (!raizVieja || !LAYOUT.has(raizVieja.component)) return componentes;

  const conclusion = tarjetas.filter((c) => c.component === "Conclusion").slice(0, 1);
  const resto = tarjetas.filter((c) => c.component !== "Conclusion");
  const conservadas = [...conclusion, ...resto].slice(0, tope);

  const salida = new Map<string, Componente>();
  for (const tarjeta of conservadas) recolectarSubarbol(tarjeta.id, porId, salida);
  salida.delete(ID_RAIZ);

  const raiz: Componente = {
    ...raizVieja,
    id: ID_RAIZ,
    component: "Column",
    children: conservadas.map((c) => c.id),
  };
  return [raiz, ...salida.values()];
}

/** El componente y todo lo que cuelga de el, para que podar no deje hijos sin definir. */
function recolectarSubarbol(id: string, porId: Map<string, Componente>, salida: Map<string, Componente>): void {
  if (salida.has(id)) return;
  const componente = porId.get(id);
  if (!componente) return;
  salida.set(id, componente);
  for (const hijo of hijosFijos(componente)) recolectarSubarbol(hijo, porId, salida);
  const plantilla = componente.children;
  if (plantilla && !Array.isArray(plantilla)) recolectarSubarbol(plantilla.componentId, porId, salida);
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

/** Lo que cambia entre el primer intento del modelo y el ultimo. */
export type OpcionesDeArmado = {
  /**
   * Recorta al tope en vez de rechazar. Solo en el ultimo intento: antes de eso, el rebase
   * le vuelve al modelo para que elija el mismo cuales tarjetas se quedan.
   */
  podarTarjetas?: boolean;
};

/**
 * De lo que dijo el modelo a los tres mensajes A2UI del turno.
 *
 * Este es el camino de `pintar_pantalla`: la superficie se **rearma completa**
 * (`createSurface` + la lista entera de componentes + el data model entero). Para cambiar
 * un parametro de lo que ya esta en pantalla sin recrear nada existe `ajustar_pantalla`
 * (`ajustar.ts`), que manda solo los parches y no emite `createSurface`.
 */
export function armarMensajes(entrada: EntradaPintarPantalla, opciones: OpcionesDeArmado = {}): Armado {
  const errores: string[] = [];

  const parseados = parsear(entrada.componentesJson, "componentesJson", errores);
  const datos = entrada.datosJson ? parsear(entrada.datosJson, "datosJson", errores) : {};
  if (errores.length) return { ok: false, errores };

  if (!Array.isArray(parseados)) return { ok: false, errores: ["componentesJson tiene que ser un arreglo de componentes"] };
  if (parseados.length === 0) return { ok: false, errores: ["componentesJson viene vacio"] };
  // El data model es la raiz del JSON Pointer: tiene que ser un objeto. Un arreglo o un
  // texto ahi dejarian al renderer resolviendo `/plan/plazo` contra algo que no lo tiene.
  if (!esObjetoPlano(datos)) return { ok: false, errores: ["datosJson tiene que ser un objeto JSON ({ ... })"] };

  const componentes = opciones.podarTarjetas
    ? podarAlTope(parseados as Componente[])
    : (parseados as Componente[]);

  // El tope va antes de lo demas y corta aqui: con seis tarjetas, los errores de props de
  // las tres que sobran solo estorban en el reintento.
  const tarjetas = tarjetasDePantalla(componentes);
  if (tarjetas.length > TOPE_DE_TARJETAS) {
    return {
      ok: false,
      errores: [
        `la pantalla trae ${tarjetas.length} tarjetas (${tarjetas.map((t) => t.component).join(", ")}) y el tope es ` +
          `${TOPE_DE_TARJETAS}, \`Conclusion\` incluida. Quedate con las que contestan la pregunta y quita el resto.`,
      ],
    };
  }

  const mensajes: MensajeA2UI[] = [
    { version: VERSION_A2UI, createSurface: { surfaceId: SUPERFICIE, catalogId: config.urlCatalogo } },
    { version: VERSION_A2UI, updateComponents: { surfaceId: SUPERFICIE, components: componentes } },
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
  for (const componente of componentes) {
    errores.push(...revisarProps(componente, entrada.razon));
    completarAccion(componente);
  }
  const heroes = componentes.filter((c) => c.heroe === true).map((c) => c.id);
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

/**
 * Un componente con boton y sin `action` es un boton apagado. El catalogo declara que
 * accion dispara cada componente (`acciones`), y todos los componentes ponen en el
 * `context` lo que su accion necesita al tocarse (el plazo elegido, la suscripcion de
 * la fila…), asi que la accion por default vale con `context: {}`. Si el modelo la
 * declaro, se respeta tal cual.
 *
 * Paso el 2026-09-12 con la portada de Inicio: el modelo chico pintaba `PlanDePago`
 * sin `action` en dos corridas seguidas, aun con la regla escrita en el prompt, y el
 * boton "Aplicar plan" salia deshabilitado.
 */
function completarAccion(componente: Componente): void {
  if (componente.action) return;
  const entrada = CATALOGO.find((c) => c.nombre === componente.component);
  const nombre = entrada?.acciones?.[0];
  if (nombre) componente.action = { event: { name: nombre, context: {} } };
}

function parsear(texto: string, campo: string, errores: string[]): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch (error) {
    // Segundo intento con lo que el modelo suele pegarle al JSON: cercas de markdown, una
    // frase antes o despues, dos bloques seguidos. Tirar un turno de 6 s por una comilla
    // de mas no vale la pena, y el contenido se valida igual en los pasos de abajo.
    const rescatado = rescatarJson(texto);
    if (rescatado !== undefined) {
      try {
        return JSON.parse(rescatado) as unknown;
      } catch {
        /* cae al siguiente intento */
      }
    }
    // Tercer intento: comas colgantes (`{"a": 1,}`), el error de sintaxis mas comun de
    // los modelos chicos en un JSON largo. El 2026-09-12 tumbo dos portadas seguidas.
    try {
      return JSON.parse(quitarComasColgantes(rescatado ?? texto)) as unknown;
    } catch {
      /* cae al error de abajo */
    }
    // El detalle del parser va en el mensaje a proposito: es lo que el modelo necesita
    // para corregir en el reintento. Y el fragmento va al log, que es el unico lugar
    // donde se puede ver QUE mando.
    const detalle = error instanceof Error ? error.message : String(error);
    console.warn(JSON.stringify({ pintar_pantalla: campo, detalle, fragmento: fragmentoDelError(texto, detalle) }));
    errores.push(
      `${campo} no es JSON valido (${detalle}). Manda un solo arreglo JSON, sin texto ni cercas alrededor.`,
    );
    return undefined;
  }
}

/**
 * El primer JSON completo que haya dentro del texto. Recorta por balance de llaves y
 * corchetes, ignorando lo que este dentro de una cadena, para no cortar en un `{` que
 * viniera dentro de un titulo.
 */
export function rescatarJson(texto: string): string | undefined {
  const limpio = texto.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const inicio = limpio.search(/[[{]/);
  if (inicio === -1) return undefined;

  const abre = limpio[inicio] === "[" ? "[" : "{";
  const cierra = abre === "[" ? "]" : "}";
  let profundidad = 0;
  let enCadena = false;
  let escapado = false;

  for (let i = inicio; i < limpio.length; i++) {
    const c = limpio[i]!;
    if (enCadena) {
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === abre) profundidad++;
    else if (c === cierra) {
      profundidad--;
      if (profundidad === 0) return limpio.slice(inicio, i + 1);
    }
  }
  return undefined;
}

/**
 * Quita las comas que van justo antes de `}` o `]`, sin tocar lo que este dentro de una
 * cadena. Es el unico arreglo "creativo" que se le hace al JSON del modelo: no cambia
 * ningun valor, solo quita lo que ningun parser acepta.
 */
export function quitarComasColgantes(texto: string): string {
  let salida = "";
  let enCadena = false;
  let escapado = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (enCadena) {
      salida += c;
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') {
      enCadena = true;
      salida += c;
      continue;
    }
    if (c === ",") {
      let j = i + 1;
      while (j < texto.length && /\s/.test(texto[j]!)) j++;
      if (texto[j] === "}" || texto[j] === "]") {
        i = j - 1; // la coma sobra, y el espacio que la seguia tambien
        continue;
      }
    }
    salida += c;
  }
  return salida;
}

/** ~120 caracteres alrededor de la posicion que reporta el parser, para el log. */
function fragmentoDelError(texto: string, detalle: string): string {
  const posicion = Number(/position (\d+)/.exec(detalle)?.[1] ?? 0);
  return texto.slice(Math.max(0, posicion - 60), posicion + 60);
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
 * vez de rechazar la pantalla completa por una frase. Sin `razonDelTurno` (un parche de
 * `ajustar_pantalla`, donde no hay componente completo que validar) no se completa nada.
 */
export function revisarProps(componente: Componente, razonDelTurno?: string): string[] {
  const entrada = CATALOGO.find((c) => c.nombre === componente.component);
  if (!entrada) return []; // layout: no tiene schema propio

  if (componente.razon === undefined && razonDelTurno !== undefined) componente.razon = razonDelTurno;

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
