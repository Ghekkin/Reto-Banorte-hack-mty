import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { stepCountIs, streamText, type LanguageModel, type ToolSet } from "ai";
import { config } from "./config";
import { mensajesDelTurno } from "./historial";
import { conectarMcp, herramientasDelMcp, type LlamadaRegistrada } from "./mcp-cliente";
import { turnoDeEjemplo } from "./mock";
import { hayLlave, modelo, nombreDelModelo, opcionesDelProveedor } from "./modelo";
import { crearPintor, type ResultadoPintar } from "./pantalla";
import { systemPrompt } from "./prompt";
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
};

/** Dos entregas invalidas y se corta: el contrato permite un reintento, no una barra libre. */
const MAX_INTENTOS_DE_PANTALLA = 2;

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
  const usadas: LlamadaRegistrada[] = [];
  let cliente: Client | undefined;
  let pasos = 0;

  try {
    let herramientas = opciones.herramientas;
    if (!herramientas) {
      cliente = await conectarMcp();
      herramientas = await herramientasDelMcp(cliente, {
        usuarioId: peticion.usuarioId,
        idempotencyKey: peticion.accion?.context?.idempotencyKey as string | undefined,
        alTerminar: (llamada) => usadas.push(llamada),
      });
    }

    const pintor = crearPintor();
    const resultado = streamText({
      model: opciones.modelo ?? modelo(),
      system: systemPrompt(),
      messages: mensajesDelTurno(peticion),
      tools: { ...herramientas, pintar_pantalla: pintor.herramienta },
      stopWhen: [
        stepCountIs(config.maxPasos),
        () => pintor.pintada(),
        () => pintor.intentosFallidos() >= MAX_INTENTOS_DE_PANTALLA,
      ],
      providerOptions: opcionesDelProveedor(),
      abortSignal: AbortSignal.timeout(TIMEOUT_TURNO_MS),
    });

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
          yield {
            tipo: "error",
            codigo: "modelo",
            mensaje: parte.error instanceof Error ? parte.error.message : String(parte.error),
          };
          break;

        default:
          break;
      }
    }

    const ultima = pintor.ultima();
    if (pintor.pintada() && ultima) {
      yield { tipo: "texto", valor: ultima.texto };
      yield { tipo: "razon", valor: ultima.razon };
      if (ultima.sugerencias.length) yield { tipo: "sugerencias", valores: ultima.sugerencias };
    } else {
      // Nunca llego una pantalla valida. La conversacion no se queda muda: se contesta
      // con lo que el modelo haya escrito en prosa (contrato agente-cliente, errores).
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

    console.log(
      JSON.stringify({
        agente: nombreDelModelo(),
        usuario: peticion.usuarioId,
        pasos,
        tools: usadas.map((l) => `${l.nombre}${l.ok ? "" : "!"}`),
        pintada: pintor.pintada(),
        ms: Date.now() - inicio,
      }),
    );
  } catch (error) {
    const abortado = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    yield {
      tipo: "error",
      codigo: abortado ? "timeout" : "modelo",
      mensaje: abortado
        ? `el turno paso de ${TIMEOUT_TURNO_MS / 1000} s y se corto`
        : error instanceof Error
          ? error.message
          : String(error),
    };
    yield { tipo: "texto", valor: "Algo falló de mi lado. Intenta de nuevo." };
  } finally {
    await cliente?.close().catch(() => undefined);
  }

  yield { tipo: "fin", pasos, ms: Date.now() - inicio };
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
