import type { ModelMessage } from "ai";
import { esAccionDeMutacion, esBinding, propsDe, type Componente } from "@maya/a2ui";
import { config } from "./config";
import { systemPrompt } from "./prompt";
import type { PeticionAgente } from "./tipos";

/**
 * De la peticion del cliente a los mensajes del modelo.
 *
 * El historial es SOLO TEXTO (contrato agente-cliente): nunca viaja JSON A2UI de vuelta
 * al modelo. Se mantiene chico a proposito, y el estado real de la pantalla va en un
 * solo bloque de contexto al final, que es el mas fresco.
 *
 * ## El orden es lo que hace que el cache sirva
 *
 * El prompt caching de los dos proveedores es **coincidencia de prefijo**: el primer byte
 * que cambia invalida todo lo que sigue. De ahi el orden de aqui, que no es cosmetico:
 *
 *  1. el **system prompt**, que es lo grande (el catalogo entero con sus schemas y los
 *     ejemplos) y no cambia entre turnos ni entre personas;
 *  2. el **historial**, que solo CRECE: los turnos viejos se mandan byte por byte igual;
 *  3. el **bloque de contexto del turno**, que es lo unico volatil (quien pregunta, que
 *     hay en pantalla, el data model) y por eso va al final, despues del corte del cache.
 *
 * Si alguien mete la fecha de hoy, el usuarioId o el data model arriba, el cache deja de
 * pegar y nadie se entera: el turno solo sale mas caro y mas lento. El `fin` del stream
 * reporta `cacheLeido` justo para poder notarlo.
 */

/** Mas alla de esto, el data model de la pantalla se resume en rutas: el modelo no lo necesita completo. */
const LIMITE_DATA_MODEL = 2000;
/** Un valor literal largo en una prop (un titular, una lista inline) se corta aqui. */
const LIMITE_VALOR_DE_PROP = 80;

export function mensajesDelTurno(peticion: PeticionAgente, panorama?: unknown): ModelMessage[] {
  const mensajes: ModelMessage[] = [
    {
      role: "system",
      content: systemPrompt({ catalogo: config.agenteLigero ? "menu" : "completo" }),
      // El corte del cache va aqui: todo lo de arriba se reusa entre turnos. Claude
      // necesita el breakpoint explicito; Gemini cachea el prefijo estable solo.
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
  ];

  for (const m of peticion.mensajes) {
    if (m.rol === "agente") mensajes.push({ role: "assistant", content: m.texto });
    else if (m.rol === "accion") mensajes.push({ role: "user", content: `[la persona toco la interfaz] ${m.texto}` });
    else mensajes.push({ role: "user", content: m.texto });
  }

  mensajes.push({ role: "user", content: bloqueDeContexto(peticion, panorama) });
  return mensajes;
}

/**
 * El bloque que le dice al modelo donde esta parado: con quien habla, que hay en
 * pantalla y, si vino de un toque, exactamente que accion fue y que se espera de el.
 */
function bloqueDeContexto(peticion: PeticionAgente, panorama?: unknown): string {
  const partes: string[] = ["--- contexto del turno ---", `usuarioId: ${peticion.usuarioId}`];

  if (peticion.superficie) {
    partes.push(`pantalla actual: ${peticion.superficie.componentes.join(", ") || "(vacia)"}`);
    // Los ids y los enlaces de cada tarjeta: es lo que hace posible `ajustar_pantalla`.
    // Sin esto el modelo no sabe como se llama nada de lo que esta viendo.
    const arbol = peticion.superficie.arbol;
    if (arbol?.length) {
      partes.push("componentes en pantalla (id · componente · props):", ...arbol.map(resumirComponente));
    }
    partes.push(`data model actual: ${resumirDataModel(peticion.superficie.dataModel ?? {})}`);
  } else {
    partes.push("pantalla actual: (todavia no hay; es el primer turno)");
  }

  if (panorama) {
    partes.push(`panorama ya calculado: ${JSON.stringify(panorama)}`);
  }

  if (peticion.error) {
    const { path, message } = peticion.error;
    partes.push(
      "",
      `La interfaz NO pudo pintar lo que mandaste en el turno anterior (${path}): ${message}`,
      "Vuelve a pintar la misma pantalla sin ese componente o con uno del catalogo que si exista.",
    );  } else if (peticion.accion) {
    const { name, sourceComponentId, context } = peticion.accion;
    partes.push(
      "",
      `La persona acaba de tocar "${sourceComponentId}" y eso disparo la accion "${name}".`,
      `context de la accion: ${JSON.stringify(context)}`,
      esAccionDeMutacion(name)
        ? `"${name}" cambia estado: llama la tool "ejecutar_decision" con accion: "${name}" y los datos de ese context (incluida ` +
          "`idempotencyKey` tal cual viene), y DESPUES vuelve a pintar la pantalla con el resultado. " +
          "Cierra con `pintar_pantalla`, no con un ajuste: hay que volver a pintar la tarjeta que cambio."
        : `"${name}" solo cambia la vista: no llames tools de accion, consulta lo que necesites y vuelve a pintar.`,
    );
  } else {
    partes.push("", "Contesta el ultimo mensaje de la persona con empatía y enfoque bancario.");
  }

  // El cierre le recuerda cuantas puertas tiene. Con pantalla previa son tres y la eleccion
  // es suya (es la clasificacion de intencion); sin ella, solo puede pintar.
  partes.push(
    "",
    peticion.superficie?.arbol?.length
      ? "Cierra el turno con UNA de tus tres salidas, exactamente una vez: `responder` si solo hay que " +
        "aclarar lo que ya se ve o responder dudas conversacionales cordiales, `ajustar_pantalla` si es lo mismo con otro parametro, `pintar_pantalla` " +
        "si hace falta otra pantalla. Si dudas, `pintar_pantalla`."
      : "Termina llamando `pintar_pantalla` exactamente una vez.",
  );
  return partes.join("\n");
}

/**
 * Una linea por componente: `gasto · GastoPorCategoria · categorias→/gasto/categorias, periodo="2026-08"`.
 *
 * Los enlaces se marcan con `→` porque son la parte accionable: si una prop viene de un
 * path, cambiarla es un parche al data model y la tarjeta se actualiza sola. Los literales
 * se muestran cortos para que el modelo sepa el valor de ahora (para "ordenalo por
 * variacion" hace falta saber como esta ordenado) sin que una lista inline se coma el
 * contexto. `razon` se omite: es una frase larga y no se parchea.
 */
function resumirComponente(componente: Componente): string {
  const props = Object.entries(propsDe(componente))
    .filter(([nombre]) => nombre !== "razon")
    .map(([nombre, valor]) =>
      esBinding(valor) ? `${nombre}→${valor.path}` : `${nombre}=${recortarValor(valor)}`,
    );
  return `  ${componente.id} · ${componente.component}${props.length ? ` · ${props.join(", ")}` : ""}`;
}

function recortarValor(valor: unknown): string {
  const texto = JSON.stringify(valor) ?? "undefined";
  return texto.length <= LIMITE_VALOR_DE_PROP ? texto : `${texto.slice(0, LIMITE_VALOR_DE_PROP)}…`;
}

/**
 * El data model completo si cabe; si no, sus RUTAS con el tipo de cada hoja.
 *
 * Recortar el JSON a la mitad (que es lo que se hacia) es lo peor de los dos mundos: se
 * pierde justo el final, que es donde estan las rutas que el modelo necesitaria para
 * parchear, y encima queda un JSON roto que invita a copiarlo mal. Con las rutas, un data
 * model de 20 KB sigue siendo util en 20 lineas.
 */
export function resumirDataModel(dataModel: Record<string, unknown>): string {
  const completo = JSON.stringify(dataModel);
  if (completo.length <= LIMITE_DATA_MODEL) return completo;
  const rutas = rutasDe(dataModel, "");
  return `(demasiado grande; estas son sus rutas)\n${rutas.map((r) => `  ${r}`).join("\n")}`;
}

/** Las rutas del data model en JSON Pointer, con el tipo de la hoja. */
function rutasDe(valor: unknown, prefijo: string): string[] {
  if (Array.isArray(valor)) return [`${prefijo}: array[${valor.length}]`];
  if (valor !== null && typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>);
    if (entradas.length === 0) return [`${prefijo}: {}`];
    return entradas.flatMap(([k, v]) => rutasDe(v, `${prefijo}/${k.replaceAll("~", "~0").replaceAll("/", "~1")}`));
  }
  return [`${prefijo}: ${valor === null ? "null" : typeof valor} = ${recortarValor(valor)}`];
}
