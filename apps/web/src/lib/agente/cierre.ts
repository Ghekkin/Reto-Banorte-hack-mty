import { z } from "zod";
import { tool, type Tool } from "ai";
import type { MensajeA2UI } from "@maya/a2ui";
import { armarParches, entradaAjustarPantalla, type EntradaAjustarPantalla, type PantallaActual } from "./ajustar";
import {
  armarMensajes,
  entradaPintarPantalla,
  MAX_INTENTOS_DE_PANTALLA,
  resolverSugerenciasPantalla,
  type EntradaPintarPantalla,
  type ResultadoPintar,
} from "./pantalla";

/**
 * Las tres salidas de un turno, y la que el modelo elige **es** la clasificacion de
 * intencion.
 *
 * ## Por que tres tools y no un clasificador
 *
 * La pregunta de seguimiento de la persona puede ser tres cosas distintas: una aclaracion
 * sobre lo que ya ve, un cambio de parametro de lo que ya ve, u otra pantalla. Hasta el
 * 2026-09-12 el agente no las distinguia: `prepareStep` forzaba `pintar_pantalla` y el
 * bloque de contexto cerraba con "Termina llamando `pintar_pantalla` exactamente una vez",
 * asi que "¿por que me sale tan alto?" costaba un repintado completo con sus tools y su
 * parpadeo.
 *
 * Se podia haber puesto un clasificador previo con el modelo chico, o heuristicas sobre los
 * verbos del texto. Las tools salen mejor en las tres cosas que importan: **cero latencia
 * extra** (no hay llamada de mas), **un solo punto de falla** en vez de dos, y la decision
 * queda **visible** en la tira de transparencia, que es justo lo que el jurado tiene que
 * poder ver. Y el modelo ya esta leyendo la pregunta: no hace falta que otro se la lea.
 *
 *  - `responder` — aclara y NO toca la pantalla. Cero mensajes A2UI.
 *  - `ajustar_pantalla` — parchea el data model o una prop. Sin `createSurface` (`ajustar.ts`).
 *  - `pintar_pantalla` — la pantalla completa, como siempre (`pantalla.ts`).
 *
 * ## Cuantas puertas hay
 *
 * `pantallaActual` lo decide: **en el primer turno solo existe `pintar_pantalla`**. No hay
 * nada que ajustar ni que aclarar, y ofrecer las tres invitaria al modelo a contestar con
 * texto, que es exactamente lo que este producto existe para no hacer. Lo mismo aplica a un
 * cliente viejo que no manda el arbol de la pantalla.
 */

export const entradaResponder = z.object({
  razon: z
    .string()
    .min(10)
    .describe("Una frase en segunda persona: por que esta respuesta basta y no hace falta cambiar la pantalla"),
  texto: z
    .string()
    .min(1)
    .describe(
      "La aclaracion, de una a tres frases, con el numero que la sostiene. Es lo que le dirias de frente.",
    ),
  sugerencias: z
    .array(z.string())
    .max(3)
    .optional()
    .describe("Hasta 3 siguientes preguntas que la persona podria querer hacer"),
});

export type EntradaResponder = z.infer<typeof entradaResponder>;

export type ResultadoAjustar = { ok: true; parches: number } | { ok: false; errores: string[] };
export type ResultadoResponder = { ok: true };

/**
 * Las acciones que cambian estado y se muestran **en la misma tarjeta** que las disparo, con
 * `ajustar_pantalla`, en vez de apilar otra pantalla con una `Confirmacion`.
 *
 * Decision del 2026-09-13 (`docs/como-funciona/ajustes-en-vivo.md`): la persona toco un boton
 * en una tarjeta; lo que cambio tiene que verse AHI, no en una pantalla nueva debajo que la deja
 * a ella congelada con el numero de antes. Cada accion entra a esta lista solo cuando su
 * componente sabe pintar el estado "ya aplicado" (una prop como `programado`); las demas siguen
 * repintando como siempre.
 */
export const ACCIONES_EN_SU_LUGAR: ReadonlySet<string> = new Set(["programar_abono_capital"]);

/** Con que cerro el modelo el turno. */
export type CierreDelTurno = "pintar" | "ajustar" | "responder";

/** Los nombres de las tres tools de cierre, en el orden en que se le describen al modelo. */
export const TOOLS_DE_CIERRE = ["pintar_pantalla", "ajustar_pantalla", "responder"] as const;

/** true si esa tool cierra el turno (y por tanto su resultado no es una consulta mas). */
export function esToolDeCierre(nombre: string): boolean {
  return (TOOLS_DE_CIERRE as readonly string[]).includes(nombre);
}

export type Cierre = {
  /** Las tools de cierre que se le pasan al modelo, por nombre. */
  herramientas: Record<string, Tool>;
  /** Los mensajes A2UI listos para emitir; se vacia al leerlos. */
  tomarMensajes: () => MensajeA2UI[];
  /** Lo que el modelo escribio junto a la pantalla. */
  ultima: () => { razon: string; texto: string; sugerencias: string[] } | undefined;
  /** true en cuanto cerro con cualquiera de las tres: el turno puede terminar. */
  cerrado: () => boolean;
  /** Con cual de las tres cerro, para el log y la transparencia. */
  con: () => CierreDelTurno | undefined;
  /** Cuantas veces el modelo entrego una pantalla o un parche invalido. */
  intentosFallidos: () => number;
  /** Si el ajuste fue sobre una pantalla ANTERIOR, su id; `undefined` si fue la actual. */
  destino: () => string | undefined;
};

/**
 * Cada turno crea el suyo: guarda los mensajes validados para que el turno los emita en
 * orden, y cuenta los intentos para no reintentar para siempre.
 */
export type OpcionesDeCierre = {
  /**
   * Con el catalogo como menu, el modelo pudo armar un componente sin ver sus props. Si la
   * pantalla se rechaza, esto le regresa el detalle de los que fallaron junto con el error,
   * y el reintento sale bien sin gastar otro paso en `ver_componentes`.
   */
  ayudaParaErrores?: (errores: string[]) => string | undefined;
  /** Datos precalculados o de tools MCP por si el modelo omitió datosJson */
  datosBase?: Record<string, unknown>;
  /** Las pantallas de arriba en el hilo: `ajustar_pantalla` tambien las puede parchear. */
  anteriores?: PantallaActual[];
};

export function crearCierre(pantallaActual?: PantallaActual, opciones: OpcionesDeCierre = {}): Cierre {
  let mensajes: MensajeA2UI[] = [];
  let ultima: { razon: string; texto: string; sugerencias: string[] } | undefined;
  let con: CierreDelTurno | undefined;
  let fallidos = 0;
  let destino: string | undefined;

  const herramientas: Record<string, Tool> = {
    pintar_pantalla: tool({
      description:
        "Entrega la interfaz que resuelve el problema de la persona. Llamala UNA vez por turno, al final, " +
        "cuando ya tengas los datos que necesitas. Usa solo componentes del catalogo. Si algo viene mal, " +
        "te devuelvo los errores y la vuelves a llamar corregida.",
      inputSchema: entradaPintarPantalla,
      execute: (entrada: EntradaPintarPantalla): ResultadoPintar => {
        // En el ultimo intento se poda al tope en vez de rechazar: el modelo ya tuvo su
        // oportunidad de elegir, y una pantalla recortada es mejor que ninguna.
        const armado = armarMensajes(entrada, {
          podarTarjetas: fallidos >= MAX_INTENTOS_DE_PANTALLA - 1,
          datosBase: opciones.datosBase,
        });
        if (!armado.ok) {
          fallidos++;
          const ayuda = opciones.ayudaParaErrores?.(armado.errores);
          return { ok: false, errores: armado.errores, ...(ayuda ? { ayuda } : {}) };
        }
        mensajes = armado.mensajes;
        ultima = { razon: entrada.razon, texto: entrada.texto, sugerencias: resolverSugerenciasPantalla(entrada, opciones.datosBase) };
        con = "pintar";
        return { ok: true, componentes: armado.componentes };
      },
    }),
  };

  if (pantallaActual) {
    herramientas.ajustar_pantalla = tool({
      description:
        "Cambia lo que YA esta en pantalla sin recrearla: la tarjeta se actualiza en su lugar, sin " +
        "parpadeo y sin perder lo que la persona llevaba elegido. Usala cuando pida otro periodo, otro " +
        "plazo, otra mensualidad, otro monto, otro orden, otro escenario, o resaltar algo de lo que ya se " +
        "ve; y para mostrar en la MISMA tarjeta el resultado de una accion que se atiende en su lugar. " +
        "Tambien sirve para una tarjeta de una pantalla anterior (pasa `pantalla`). NO sirve para " +
        "agregar, quitar ni cambiar tarjetas: para eso es `pintar_pantalla`.",
      inputSchema: entradaAjustarPantalla,
      execute: (entrada: EntradaAjustarPantalla): ResultadoAjustar => {
        const armado = armarParches(entrada, pantallaActual, opciones.anteriores);
        if (!armado.ok) {
          fallidos++;
          return { ok: false, errores: armado.errores };
        }
        mensajes = armado.mensajes;
        destino = armado.pantalla;
        ultima = { razon: entrada.razon, texto: entrada.texto, sugerencias: entrada.sugerencias ?? [] };
        con = "ajustar";
        return { ok: true, parches: armado.parches };
      },
    });

    herramientas.responder = tool({
      description:
        "Contesta con palabras y DEJA la pantalla como esta. Solo para aclarar algo que ya se ve: que " +
        "significa una cifra, de donde sale, por que se lo recomiendas. Si la respuesta necesita un dato " +
        "que no esta en pantalla, no es una aclaracion: consulta y usa `ajustar_pantalla` o " +
        "`pintar_pantalla`.",
      inputSchema: entradaResponder,
      execute: (entrada: EntradaResponder): ResultadoResponder => {
        ultima = { razon: entrada.razon, texto: entrada.texto, sugerencias: entrada.sugerencias ?? [] };
        con = "responder";
        return { ok: true };
      },
    });
  }

  return {
    herramientas,
    tomarMensajes: () => {
      const salida = mensajes;
      mensajes = [];
      return salida;
    },
    ultima: () => ultima,
    cerrado: () => con !== undefined,
    con: () => con,
    intentosFallidos: () => fallidos,
    destino: () => destino,
  };
}
