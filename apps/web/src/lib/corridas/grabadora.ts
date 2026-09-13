import { createHash, randomUUID } from "node:crypto";
import { asSchema, type LanguageModel, type LanguageModelUsage, type ModelMessage, type StepResult, type ToolSet } from "ai";
import type { LineaStream, PeticionAgente } from "@/lib/agente/tipos";
import { dispositivoParaRegistro } from "@/lib/dispositivo";

/**
 * La grabadora de una corrida: TODO lo que pasa cuando un modelo trabaja, para poder
 * reconstruirlo despues sin adivinar. Una corrida es un turno del chat (`/api/agente`) o una
 * portada del Inicio. Ver `docs/como-funciona/corridas-en-db.md`.
 *
 * Aqui no hay base: la grabadora junta en memoria y le entrega filas a un `Escritor`
 * (`escritor.ts` escribe en PostgreSQL; las pruebas pasan uno que solo guarda). Asi el
 * turno nunca espera a la base, y una base caida no tumba un turno.
 */

export type OrigenTool = "mcp" | "host" | "cierre" | "prefetch";

export type FilaPrompt = { hash: string; tipo: "sistema" | "tools"; contenido: string };

export type FilaCorrida = {
  id: string;
  tipo: "turno" | "portada";
  usuarioId: string | null;
  conversacionId: string | null;
  /** De que visitante fue (migracion 0007, ADR 0012). `null` es el estado comun. */
  dispositivoId: string | null;
  motivo: string | null;
  estado: string;
  proveedor: string | null;
  modelo: string | null;
  opcionesProveedor: unknown;
  config: unknown;
  versionApp: string | null;
  promptSistemaHash: string | null;
  toolsHash: string | null;
  toolsOfrecidas: { nombre: string; origen: OrigenTool }[];
  peticion: unknown;
  mensajesModelo: unknown[];
  lineas: LineaStream[];
  cierre: string | null;
  pasos: number | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  tokensCache: number | null;
  tokensRazonamiento: number | null;
  texto: string | null;
  error: string | null;
  ms: number | null;
  iniciadaEn: string;
  terminadaEn: string | null;
};

export type FilaPaso = {
  paso: number;
  toolsActivas: string[] | null;
  toolChoice: string | null;
  finishReason: string | null;
  modeloRespuesta: string | null;
  respuestaId: string | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  tokensCache: number | null;
  tokensRazonamiento: number | null;
  texto: string | null;
  razonamiento: string | null;
  llamadas: { toolCallId: string; nombre: string; argumentos: unknown }[];
  advertencias: unknown[];
  metadataProveedor: unknown;
  terminadoEn: string;
};

export type FilaTool = {
  paso: number;
  toolCallId: string | null;
  nombre: string;
  origen: OrigenTool;
  argumentos: unknown;
  resultado: unknown;
  ok: boolean;
  error: string | null;
  ms: number | null;
  llamadaEn: string;
};

export type FilaMensajeChat = { rol: string; texto: string | null; datos: unknown };

/** Lo que la grabadora le entrega al terminar: todo, de una vez, en orden. */
export type CorridaTerminada = {
  prompts: FilaPrompt[];
  corrida: FilaCorrida;
  pasos: FilaPaso[];
  tools: FilaTool[];
  /** Solo en un turno con `conversacionId`: lo que dijo la persona y lo que contesto Maya. */
  chat?: { conversacionId: string; usuarioId: string; dispositivoId: string | null; mensajes: FilaMensajeChat[] };
};

export type Escritor = {
  /** false: la grabadora ni siquiera arma filas (flag apagado, sin base o en pruebas). */
  activo: () => boolean;
  /** La fila temprana, con estado `corriendo`: si el proceso muere a medio turno, queda eso. */
  iniciar: (prompts: FilaPrompt[], corrida: FilaCorrida) => Promise<void>;
  terminar: (corrida: CorridaTerminada) => Promise<void>;
};

export type DatosDelModelo = {
  modelo: LanguageModel;
  opcionesProveedor?: unknown;
  config?: Record<string, unknown>;
  promptSistema: string;
  /** Los mensajes completos del modelo; el `system` se guarda aparte, por hash. */
  mensajes: ModelMessage[];
  tools: ToolSet;
  origenDe: (nombre: string) => OrigenTool;
};

export type ResumenDeCorrida = {
  estado: "ok" | "sin_pantalla" | "error" | "timeout" | "cortada";
  cierre?: string | null;
  pasos?: number;
  uso?: LanguageModelUsage;
  texto?: string | null;
  error?: string | null;
};

export type Grabadora = {
  readonly id: string;
  /** false: no se va a guardar nada (y el `fin` no lleva `corridaId`). */
  readonly activa: boolean;
  configurar: (datos: DatosDelModelo) => void;
  /** Lo que `prepareStep` decidio para un paso: que tools podia llamar y si estaba forzado. */
  pasoPreparado: (paso: number, toolsActivas?: string[], toolChoice?: unknown) => void;
  paso: (resultado: StepResult<ToolSet>) => void;
  toolPedida: (toolCallId: string, nombre: string, argumentos: unknown) => void;
  toolTermino: (toolCallId: string, salida: { resultado?: unknown; error?: string; ok: boolean }) => void;
  /** Una tool que el host llamo por su cuenta (prefetch), fuera del bucle del modelo. */
  toolDelHost: (fila: { nombre: string; argumentos: unknown; resultado: unknown; ok: boolean; ms: number }) => void;
  linea: (linea: LineaStream) => void;
  resumir: (resumen: ResumenDeCorrida) => void;
  terminar: () => Promise<void>;
};

/** Un JSON mas grande que esto se guarda recortado y marcado: la base no es un basurero. */
const MAX_BYTES_JSON = 200_000;

export function hashDe(texto: string): string {
  return createHash("sha256").update(texto).digest("hex").slice(0, 32);
}

/** Un valor listo para JSONB: tal cual si cabe; si no, recortado y dicho. */
export function acotar(valor: unknown): unknown {
  if (valor === undefined) return null;
  let texto: string;
  try {
    texto = JSON.stringify(valor) ?? "null";
  } catch {
    return { noSerializable: String(valor) };
  }
  if (texto.length <= MAX_BYTES_JSON) return JSON.parse(texto);
  return { truncado: true, bytes: texto.length, inicio: texto.slice(0, MAX_BYTES_JSON) };
}

function nombreDelModelo(modelo: LanguageModel): { proveedor: string | null; modelo: string } {
  return typeof modelo === "string" ? { proveedor: null, modelo } : { proveedor: modelo.provider, modelo: modelo.modelId };
}

/** Las definiciones tal como las ve el modelo: nombre, origen, descripcion y schema de entrada. */
function definicionesDe(tools: ToolSet, origenDe: (nombre: string) => OrigenTool) {
  return Object.entries(tools).map(([nombre, tool]) => {
    let schema: unknown = null;
    try {
      schema = asSchema(tool.inputSchema as never).jsonSchema;
    } catch {
      // una tool con un schema raro se registra sin schema, no tumba la corrida
    }
    return { nombre, origen: origenDe(nombre), descripcion: tool.description ?? null, schema };
  });
}

function mensajeSinSistema(mensaje: ModelMessage): unknown {
  return mensaje.role === "system" ? { role: "system", content: "(system prompt: ver prompt_sistema_hash)" } : mensaje;
}

/** El mensaje de la persona que abrio este turno, como lo mando la interfaz. */
function entradaDelTurno(peticion: PeticionAgente): FilaMensajeChat | undefined {
  if (peticion.error) {
    return { rol: "aviso_interfaz", texto: peticion.error.message, datos: { error: peticion.error } };
  }
  const ultimo = peticion.mensajes.at(-1);
  if (!ultimo || ultimo.rol === "agente") return undefined;
  return { rol: ultimo.rol, texto: ultimo.texto, datos: peticion.accion ? { accion: peticion.accion } : {} };
}

/** Lo que contesto Maya en este turno, armado desde las lineas que salieron. */
function salidaDelTurno(lineas: LineaStream[], corridaCierre: string | null): FilaMensajeChat {
  const textos = lineas.flatMap((l) => (l.tipo === "texto" ? [l.valor] : []));
  const razon = lineas.find((l) => l.tipo === "razon");
  const sugerencias = lineas.find((l) => l.tipo === "sugerencias");
  return {
    rol: "agente",
    texto: textos.join("\n") || null,
    datos: {
      a2ui: lineas.flatMap((l) => (l.tipo === "a2ui" ? [l.mensaje] : [])),
      razon: razon?.tipo === "razon" ? razon.valor : null,
      sugerencias: sugerencias?.tipo === "sugerencias" ? sugerencias.valores : [],
      cierre: corridaCierre,
      errores: lineas.flatMap((l) => (l.tipo === "error" ? [{ codigo: l.codigo, mensaje: l.mensaje }] : [])),
    },
  };
}

export function crearGrabadora(
  inicio: {
    tipo: "turno" | "portada";
    usuarioId: string;
    conversacionId?: string;
    motivo?: string;
    peticion?: unknown;
    dispositivoId?: string;
  },
  escritor: Escritor,
): Grabadora {
  const id = `cor_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const activa = escritor.activo();
  const t0 = Date.now();
  const ahora = () => new Date().toISOString();

  const prompts: FilaPrompt[] = [];
  const corrida: FilaCorrida = {
    id,
    tipo: inicio.tipo,
    usuarioId: inicio.usuarioId,
    conversacionId: inicio.conversacionId ?? null,
    dispositivoId: dispositivoParaRegistro(inicio.dispositivoId),
    motivo: inicio.motivo ?? null,
    estado: "corriendo",
    proveedor: null,
    modelo: null,
    opcionesProveedor: {},
    config: {},
    versionApp: process.env.SOURCE_COMMIT ?? process.env.GIT_SHA ?? null,
    promptSistemaHash: null,
    toolsHash: null,
    toolsOfrecidas: [],
    peticion: acotar(inicio.peticion ?? null),
    mensajesModelo: [],
    lineas: [],
    cierre: null,
    pasos: null,
    tokensEntrada: null,
    tokensSalida: null,
    tokensCache: null,
    tokensRazonamiento: null,
    texto: null,
    error: null,
    ms: null,
    iniciadaEn: ahora(),
    terminadaEn: null,
  };
  const pasos: FilaPaso[] = [];
  const tools: FilaTool[] = [];
  const preparados = new Map<number, { toolsActivas?: string[]; toolChoice?: unknown }>();
  const enVuelo = new Map<string, FilaTool & { t: number }>();
  let origenDe: (nombre: string) => OrigenTool = () => "mcp";
  let cola: Promise<void> = Promise.resolve();
  let terminada: Promise<void> | undefined;

  /** Las escrituras van en fila, y un fallo se avisa una vez y no se propaga. */
  let avisado = false;
  const encolar = (trabajo: () => Promise<void>) => {
    cola = cola.then(trabajo).catch((error: unknown) => {
      if (avisado) return;
      avisado = true;
      console.warn(`[corridas] no se pudo guardar ${id}: ${error instanceof Error ? error.message : String(error)}`);
    });
  };

  return {
    id,
    activa,

    configurar(datos) {
      if (!activa) return;
      const { proveedor, modelo } = nombreDelModelo(datos.modelo);
      origenDe = datos.origenDe;
      const definiciones = JSON.stringify(definicionesDe(datos.tools, datos.origenDe));
      const sistema = { hash: hashDe(datos.promptSistema), tipo: "sistema" as const, contenido: datos.promptSistema };
      const deTools = { hash: hashDe(definiciones), tipo: "tools" as const, contenido: definiciones };
      prompts.splice(0, prompts.length, sistema, deTools);
      Object.assign(corrida, {
        proveedor,
        modelo,
        opcionesProveedor: acotar(datos.opcionesProveedor ?? {}),
        config: acotar(datos.config ?? {}),
        promptSistemaHash: sistema.hash,
        toolsHash: deTools.hash,
        toolsOfrecidas: Object.keys(datos.tools).map((nombre) => ({ nombre, origen: datos.origenDe(nombre) })),
        mensajesModelo: acotar(datos.mensajes.map(mensajeSinSistema)) as unknown[],
      });
      const copia = { ...corrida };
      const promptsCopia = [...prompts];
      encolar(() => escritor.iniciar(promptsCopia, copia));
    },

    pasoPreparado(paso, toolsActivas, toolChoice) {
      if (!activa) return;
      preparados.set(paso, { toolsActivas, toolChoice });
    },

    paso(resultado) {
      if (!activa) return;
      const n = pasos.length;
      const preparado = preparados.get(n);
      pasos.push({
        paso: n,
        toolsActivas: preparado?.toolsActivas ?? null,
        toolChoice: preparado?.toolChoice === undefined ? null : JSON.stringify(preparado.toolChoice),
        finishReason: resultado.finishReason ?? null,
        modeloRespuesta: resultado.response?.modelId ?? null,
        respuestaId: resultado.response?.id ?? null,
        tokensEntrada: resultado.usage?.inputTokens ?? null,
        tokensSalida: resultado.usage?.outputTokens ?? null,
        tokensCache: resultado.usage?.cachedInputTokens ?? null,
        tokensRazonamiento: resultado.usage?.reasoningTokens ?? null,
        texto: resultado.text || null,
        razonamiento: resultado.reasoningText ?? null,
        llamadas: resultado.toolCalls.map((c) => ({ toolCallId: c.toolCallId, nombre: c.toolName, argumentos: acotar(c.input) })),
        advertencias: (acotar(resultado.warnings ?? []) as unknown[]) ?? [],
        metadataProveedor: acotar(resultado.providerMetadata ?? null),
        terminadoEn: ahora(),
      });
    },

    toolPedida(toolCallId, nombre, argumentos) {
      if (!activa) return;
      enVuelo.set(toolCallId, {
        paso: pasos.length,
        toolCallId,
        nombre,
        origen: origenDe(nombre),
        argumentos: acotar(argumentos),
        resultado: null,
        ok: false,
        error: null,
        ms: null,
        llamadaEn: ahora(),
        t: Date.now(),
      });
    },

    toolTermino(toolCallId, salida) {
      if (!activa) return;
      const fila = enVuelo.get(toolCallId);
      if (!fila) return;
      enVuelo.delete(toolCallId);
      const { t, ...resto } = fila;
      tools.push({
        ...resto,
        resultado: acotar(salida.resultado ?? null),
        ok: salida.ok,
        error: salida.error ?? null,
        ms: Date.now() - t,
      });
    },

    toolDelHost(fila) {
      if (!activa) return;
      tools.push({
        paso: -1,
        toolCallId: null,
        nombre: fila.nombre,
        origen: "prefetch",
        argumentos: acotar(fila.argumentos),
        resultado: acotar(fila.resultado),
        ok: fila.ok,
        error: null,
        ms: fila.ms,
        llamadaEn: ahora(),
      });
    },

    linea(linea) {
      if (!activa) return;
      corrida.lineas.push(acotar(linea) as LineaStream);
    },

    resumir(resumen) {
      if (!activa) return;
      Object.assign(corrida, {
        estado: resumen.estado,
        cierre: resumen.cierre ?? corrida.cierre,
        pasos: resumen.pasos ?? corrida.pasos,
        tokensEntrada: resumen.uso?.inputTokens ?? corrida.tokensEntrada,
        tokensSalida: resumen.uso?.outputTokens ?? corrida.tokensSalida,
        tokensCache: resumen.uso?.cachedInputTokens ?? corrida.tokensCache,
        tokensRazonamiento: resumen.uso?.reasoningTokens ?? corrida.tokensRazonamiento,
        texto: resumen.texto ?? corrida.texto,
        error: resumen.error ?? corrida.error,
      });
    },

    terminar() {
      if (terminada) return terminada;
      if (!activa) return (terminada = Promise.resolve());
      // Una tool que se quedo sin resultado (turno cortado) tambien se registra.
      for (const [, fila] of enVuelo) {
        const { t, ...resto } = fila;
        tools.push({ ...resto, ok: false, error: "sin resultado: la corrida termino antes", ms: Date.now() - t });
      }
      enVuelo.clear();
      corrida.ms = Date.now() - t0;
      corrida.terminadaEn = ahora();
      if (corrida.estado === "corriendo") corrida.estado = "cortada";

      const peticion = inicio.tipo === "turno" ? (inicio.peticion as PeticionAgente | undefined) : undefined;
      const entrada = peticion ? entradaDelTurno(peticion) : undefined;
      const final: CorridaTerminada = {
        prompts: [...prompts],
        corrida: { ...corrida },
        pasos: [...pasos],
        tools: [...tools],
        ...(peticion && inicio.conversacionId
          ? {
              chat: {
                conversacionId: inicio.conversacionId,
                usuarioId: inicio.usuarioId,
                dispositivoId: dispositivoParaRegistro(inicio.dispositivoId),
                mensajes: [...(entrada ? [entrada] : []), salidaDelTurno(corrida.lineas, corrida.cierre)],
              },
            }
          : {}),
      };
      encolar(() => escritor.terminar(final));
      terminada = cola;
      return terminada;
    },
  };
}
