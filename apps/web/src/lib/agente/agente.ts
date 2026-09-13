import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { stepCountIs, streamText, type LanguageModel, type LanguageModelUsage, type ToolSet } from "ai";
import { config } from "./config";
import { mensajesDelTurno } from "./historial";
import { conectarMcp, herramientasDelMcp, llamarTool, type LlamadaRegistrada } from "./mcp-cliente";
import { turnoDeEjemplo } from "./mock";
import { hayLlave, modelo, nombreDelModelo, opcionesDelProveedor } from "./modelo";
import { crearPintor, crearRespondedor, type ResultadoPintar } from "./pantalla";
import { TIMEOUT_TURNO_MS, type LineaStream, type PeticionAgente } from "./tipos";

/**
 * El turno del agente: interpreta la intencion, llama tools del MCP, emite la interfaz
 * en A2UI y cierra el ciclo cuando la persona toca algo.
 *
 * Es un bucle de tools del AI SDK con una sola regla rara: **entregar la pantalla
 * tambien es una tool** (`pintar_pantalla`, en `pantalla.ts`). Con eso, el turno termina
 * cuando hay una pantalla valida, un JSON malo se reintenta como cualquier otro error de
 * tool, y nada llega al renderer sin validarse.
 *
 * Los tres pasos del reto quedan visibles en el stream: `tool` (interpretar con datos),
 * `a2ui` (generar la interfaz), y —cuando viene una accion— la tool de mutacion seguida
 * de otra pantalla (ejecutar y que la UI cambie con el resultado).
 */
export type OpcionesDeTurno = {
  /** Para pruebas: un modelo simulado en vez del proveedor real. */
  modelo?: LanguageModel;
  /** Para pruebas: tools ya armadas, sin abrir conexion al MCP. */
  herramientas?: ToolSet;
  /** La senal de la peticion HTTP: si la persona cierra la pestana, el turno se corta. */
  senal?: AbortSignal;
  /** Tope del turno en ms. Default `TIMEOUT_TURNO_MS`; las pruebas lo bajan. */
  timeoutMs?: number;
  /**
   * Se llama al cerrar un turno en el que una tool de ACCION del MCP aplico algo. Es el
   * gancho con el que el Inicio personalizado se rearma justo despues de un plan
   * aplicado o un apartado creado, sin que el agente sepa que existe el Inicio.
   */
  alMutar?: (usuarioId: string) => void;
};

/** Dos entregas invalidas y se corta: el contrato permite un reintento, no una barra libre. */
const MAX_INTENTOS_DE_PANTALLA = 2;

/**
 * Cuantos pasos del tope se le guardan a `pintar_pantalla`. Con 2, el modelo tiene
 * `maxPasos - 2` para consultar y en el siguiente paso se le fuerza la tool de pintar:
 * uno para pintar y uno de gracia si la primera entrega viene invalida.
 */
const PASOS_RESERVADOS_PARA_PINTAR = 2;

export async function* correrTurno(
  peticion: PeticionAgente,
  opciones: OpcionesDeTurno = {},
): AsyncGenerator<LineaStream> {
  const inicio = Date.now();
  yield { tipo: "estado", valor: "pensando" };

  if (!opciones.modelo && !hayLlave()) {
    yield* turnoDeEjemplo(peticion, inicio);
    return;
  }

  /** `toolCallId` -> que tool fue y cuando empezo, para medir cada llamada. */
  const enVuelo = new Map<string, { nombre: string; inicio: number }>();
  /** La promesa de uso de tokens del proveedor; se resuelve al cerrar el stream. */
  let uso: Promise<LanguageModelUsage> | undefined;
  const usadas: LlamadaRegistrada[] = [];
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_TURNO_MS;
  let cliente: Client | undefined;
  let pasos = 0;
  /** Que corto el turno antes de tiempo, si algo lo corto. Decide que error se reporta. */
  let corte: "timeout" | "cliente" | "modelo" | undefined;

  try {
    let herramientas = opciones.herramientas;
    if (!herramientas) {
      // El MCP caido es un error de TOOLS, no del modelo: el panel de transparencia y
      // quien lea el log tienen que saber donde mirar.
      try {
        cliente = await conectarMcp();
        herramientas = await herramientasDelMcp(cliente, {
          usuarioId: peticion.usuarioId,
          idempotencyKey: peticion.accion?.context?.idempotencyKey as string | undefined,
          alTerminar: (llamada) => usadas.push(llamada),
        });
      } catch (error) {
        yield {
          tipo: "error",
          codigo: "tool",
          mensaje: `no pude conectar al MCP en ${config.urlMcp}: ${error instanceof Error ? error.message : String(error)}`,
        };
        yield { tipo: "texto", valor: "No alcanzo tus datos en este momento. Intenta de nuevo en un momento." };
        yield { tipo: "fin", pasos: 0, ms: Date.now() - inicio };
        return;
      }
    }

    // Prefetch determinista (O3): solo en el primer turno (sin superficie previa),
    // se consulta panorama_inicial antes del bucle del modelo para ahorrar un round trip.
    let panorama: unknown = undefined;
    if (!peticion.superficie) {
      if (cliente) {
        try {
          const res = await llamarTool(cliente, "panorama_inicial", { usuarioId: peticion.usuarioId });
          if (res.ok && res.resultado && typeof res.resultado === "object" && !("error" in (res.resultado as Record<string, unknown>))) {
            panorama = res.resultado;
            usadas.push({ nombre: "panorama_inicial", ms: res.ms, ok: true });
            yield { tipo: "tool", nombre: "panorama_inicial", ms: res.ms, ok: true };
          }
        } catch {
          // Si el prefetch falla, no tumba el turno: cae a como esta hoy
        }
      } else if (herramientas && "panorama_inicial" in herramientas) {
        try {
          const toolPanorama = herramientas["panorama_inicial"];
          if (toolPanorama && "execute" in toolPanorama && typeof toolPanorama.execute === "function") {
            const inicioTool = Date.now();
            const res = await toolPanorama.execute({ usuarioId: peticion.usuarioId }, { toolCallId: "prefetch", messages: [] });
            if (res && typeof res === "object" && !("error" in (res as Record<string, unknown>))) {
              panorama = res;
              const ms = Date.now() - inicioTool;
              usadas.push({ nombre: "panorama_inicial", ms, ok: true });
              yield { tipo: "tool", nombre: "panorama_inicial", ms, ok: true };
            }
          }
        } catch {
          // degradacion suave
        }
      }
    }

    // Dos razones para cortar: el tope del turno, y que la persona haya cerrado la
    // pestana. Cualquiera de las dos aborta la llamada al proveedor y las tools en vuelo.
    const porTiempo = AbortSignal.timeout(timeoutMs);
    const senal = opciones.senal ? AbortSignal.any([porTiempo, opciones.senal]) : porTiempo;

    const pintor = crearPintor();
    const respondedor = crearRespondedor();
    const resultado = streamText({
      model: opciones.modelo ?? modelo(),
      // El system prompt va como PRIMER MENSAJE, no en `system`, para poder marcarlo
      // como prefijo cacheable (ver `mensajesDelTurno`). En Gemini termina igual en
      // `systemInstruction`; en Claude lleva el `cache_control`.
      messages: mensajesDelTurno(peticion, panorama),
      // El SDK avisa de esto en cada turno y tiene razon en general: un mensaje `system`
      // dentro de `messages` es un vector de inyeccion SI puede venir de la persona. Aqui
      // no puede: lo arma `systemPrompt()`, es una constante nuestra, y lo que escribe la
      // persona entra como `user`. Va explicito para que la decision se lea en el codigo y
      // no como un warning que todos aprenden a ignorar.
      allowSystemInMessages: true,
      tools: {
        ...herramientas,
        pintar_pantalla: pintor.herramienta,
        responder_conversacion: respondedor.herramienta,
      },
      stopWhen: [
        stepCountIs(config.maxPasos),
        () => pintor.pintada() || respondedor.respondida(),
        () => pintor.intentosFallidos() >= MAX_INTENTOS_DE_PANTALLA,
      ],
      // El ultimo paso se reserva para entregar pantalla o respuesta. Sin esto, un turno
      // que se entretiene consultando se queda sin pasos y contesta en prosa disculpandose.
      prepareStep: ({ stepNumber }) =>
        stepNumber >= config.maxPasos - PASOS_RESERVADOS_PARA_PINTAR
          ? { toolChoice: "required", activeTools: ["pintar_pantalla", "responder_conversacion"] }
          : undefined,
      providerOptions: opcionesDelProveedor(),
      abortSignal: senal,
    });

    uso = resultado.usage;
    let prosa = "";

    for await (const parte of resultado.fullStream) {
      switch (parte.type) {
        case "tool-call":
          enVuelo.set(parte.toolCallId, { nombre: parte.toolName, inicio: Date.now() });
          yield { tipo: "estado", valor: parte.toolName === "pintar_pantalla" ? "pintando" : "consultando" };
          break;

        case "tool-result":
          if (parte.toolName === "pintar_pantalla") {
            yield* emitirPantalla(parte.output as ResultadoPintar, pintor);
          } else if (parte.toolName === "responder_conversacion") {
            // Entrega conversacional: no se emite como tool de datos externa
          } else {
            // Una tool del MCP que falla no lanza: devuelve `{ error }` (mcp-cliente.ts).
            // Por eso el `ok` de la linea sale del resultado y no de una excepcion.
            yield {
              tipo: "tool",
              nombre: parte.toolName,
              ms: transcurrido(enVuelo, parte.toolCallId),
              ok: !esResultadoConError(parte.output),
            };
          }
          break;

        case "tool-error":
          yield { tipo: "tool", nombre: parte.toolName, ms: transcurrido(enVuelo, parte.toolCallId), ok: false };
          yield {
            tipo: "error",
            codigo: "tool",
            mensaje: `${parte.toolName}: ${parte.error instanceof Error ? parte.error.message : String(parte.error)}`,
          };
          break;

        case "text-delta":
          prosa += parte.text;
          break;

        case "finish-step":
          pasos++;
          break;

        case "error":
          corte = "modelo";
          yield {
            tipo: "error",
            codigo: "modelo",
            mensaje: parte.error instanceof Error ? parte.error.message : String(parte.error),
          };
          break;

        // El AI SDK no lanza cuando se dispara el abortSignal: emite esta parte y cierra
        // el stream. Sin este caso, un timeout se reportaba como "el modelo no entrego
        // pantalla", que es otra cosa y manda a buscar el problema en el lugar equivocado.
        case "abort":
          corte = opciones.senal?.aborted ? "cliente" : "timeout";
          break;

        default:
          break;
      }
    }

    const ultima = pintor.ultima();
    const conversacion = respondedor.ultima();

    if (pintor.pintada() && ultima) {
      yield { tipo: "texto", valor: ultima.texto };
      yield { tipo: "razon", valor: ultima.razon };
      if (ultima.sugerencias.length) yield { tipo: "sugerencias", valores: ultima.sugerencias };
    } else if (respondedor.respondida() && conversacion) {
      yield { tipo: "texto", valor: conversacion.texto };
      if (conversacion.sugerencias.length) yield { tipo: "sugerencias", valores: conversacion.sugerencias };
    } else if (corte === "timeout") {
      yield { tipo: "error", codigo: "timeout", mensaje: `el turno paso de ${timeoutMs / 1000} s y se corto` };
      yield { tipo: "texto", valor: "Me tarde de mas. Intenta de nuevo." };
    } else if (corte === "cliente") {
      // Nadie esta leyendo: no vale la pena inventar una respuesta.
    } else if (corte === "modelo") {
      // El error del proveedor ya salio arriba; solo falta que la conversacion no quede muda.
      yield { tipo: "texto", valor: "Algo falló de mi lado. Intenta de nuevo." };
    } else if (prosa.trim() && pintor.intentosFallidos() === 0) {
      // El modelo contestó en texto conversacional sin errores de pantalla
      yield { tipo: "texto", valor: prosa.trim() };
    } else {
      // Nunca llego una pantalla valida tras intentarlo o no hubo respuesta.
      yield {
        tipo: "error",
        codigo: "a2ui",
        mensaje: `el modelo no entrego una pantalla valida en ${pasos} paso(s)`,
      };
      yield {
        tipo: "texto",
        valor: prosa.trim() || "No pude armar la pantalla esta vez. ¿Me lo preguntas de otra forma?",
      };
    }

    if (usadas.some((l) => l.ok && l.mutacion)) {
      try {
        opciones.alMutar?.(peticion.usuarioId);
      } catch (error) {
        console.warn(`[agente] alMutar fallo: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // `entrada` y `cache` no son decoracion: el prompt caching es invisible cuando NO
    // funciona —el turno solo sale mas caro y mas lento—, y el 2026-09-12 el proyecto se
    // quedo sin cuota sin que nadie supiera cuanto costaba un turno. Con estos dos
    // numeros, UNA llamada real dice si el caché pega y cuanto se reenvia por peticion.
    const consumo = await resultado.usage.catch(() => undefined);
    console.log(
      JSON.stringify({
        agente: nombreDelModelo(),
        usuario: peticion.usuarioId,
        pasos,
        tools: usadas.map((l) => `${l.nombre}${l.ok ? "" : "!"}`),
        pintada: pintor.pintada() || respondedor.respondida(),
        corte: corte ?? null,
        entrada: consumo?.inputTokens ?? null,
        salida: consumo?.outputTokens ?? null,
        // null = el proveedor no reporto nada; 0 = reporto que no cacheo nada.
        cache: consumo?.cachedInputTokens ?? null,
        ms: Date.now() - inicio,
      }),
    );
  } catch (error) {
    // Por si algun proveedor SI lanza al abortar (el contrato del SDK es emitir `abort`,
    // pero esto no cuesta nada y evita reportar un timeout como error del modelo).
    const abortado = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    yield {
      tipo: "error",
      codigo: abortado ? "timeout" : "modelo",
      mensaje: abortado
        ? `el turno paso de ${timeoutMs / 1000} s y se corto`
        : error instanceof Error
          ? error.message
          : String(error),
    };
    yield { tipo: "texto", valor: "Algo falló de mi lado. Intenta de nuevo." };
  } finally {
    await cliente?.close().catch(() => undefined);
  }

  yield { tipo: "fin", pasos, ms: Date.now() - inicio, ...(await tokensDeCache(uso)) };
}

/**
 * Lo que el proveedor dice que sirvio desde su cache. Va al `fin` del stream porque el
 * caching es invisible por definicion: sin este numero, "el prompt caching funciona" es
 * una creencia. Si sale 0 turno tras turno, algo rompio el prefijo estable.
 */
async function tokensDeCache(uso: Promise<LanguageModelUsage> | undefined): Promise<{ cacheLeido?: number }> {
  if (!uso) return {};
  try {
    const { cachedInputTokens } = await uso;
    return typeof cachedInputTokens === "number" ? { cacheLeido: cachedInputTokens } : {};
  } catch {
    return {};
  }
}

/** Cuanto tardo una llamada; si no se registro el inicio, 0 en vez de un numero raro. */
function transcurrido(enVuelo: Map<string, { inicio: number }>, toolCallId: string): number {
  const registro = enVuelo.get(toolCallId);
  return registro ? Date.now() - registro.inicio : 0;
}

/** La convencion de `mcp-cliente.ts`: una tool que fallo devuelve `{ error: "..." }`. */
function esResultadoConError(salida: unknown): boolean {
  return typeof salida === "object" && salida !== null && "error" in salida;
}

/** Los mensajes A2UI ya validados, o el error para que el modelo lo corrija. */
async function* emitirPantalla(
  resultado: ResultadoPintar,
  pintor: ReturnType<typeof crearPintor>,
): AsyncGenerator<LineaStream> {
  if (!resultado.ok) {
    yield { tipo: "error", codigo: "a2ui", mensaje: resultado.errores.join("; ") };
    return;
  }
  for (const mensaje of pintor.tomarMensajes()) {
    yield { tipo: "a2ui", mensaje };
  }
}
