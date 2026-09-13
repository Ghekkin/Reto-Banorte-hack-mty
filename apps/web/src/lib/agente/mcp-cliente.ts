import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { dynamicTool, jsonSchema, type ToolSet } from "ai";
import { CABECERA_DISPOSITIVO, DISPOSITIVO_COMUN } from "@/lib/dispositivo";
import { config } from "./config";

/**
 * Cliente MCP del agente. Una conexion por turno: el servidor es stateless y abrirla
 * cuesta milisegundos.
 *
 * Es la unica forma en que el agente toca datos o ejecuta acciones. Nada de fetch
 * directo a la base ni logica de negocio de este lado.
 *
 * `dispositivoId` (ADR 0012): de que visitante es esta conexion. Viaja en una cabecera y
 * no en los argumentos de cada tool: asi TODA llamada de la conexion —las del modelo, el
 * prefetch, el auditor de widgets— lee y escribe el estado de ese dispositivo, sin que haya
 * que acordarse de pasarlo en cada una, y el modelo no lo ve. Sin dispositivo, el comun.
 */
export async function conectarMcp(opciones: { dispositivoId?: string } = {}): Promise<Client> {
  const cabeceras: Record<string, string> = {};
  if (config.tokenMcp) cabeceras.Authorization = `Bearer ${config.tokenMcp}`;
  if (opciones.dispositivoId && opciones.dispositivoId !== DISPOSITIVO_COMUN) {
    cabeceras[CABECERA_DISPOSITIVO] = opciones.dispositivoId;
  }
  const transporte = new StreamableHTTPClientTransport(new URL(config.urlMcp), {
    requestInit: Object.keys(cabeceras).length ? { headers: cabeceras } : undefined,
  });
  const cliente = new Client({ name: "maya-web", version: "0.1.0" });
  await cliente.connect(transporte);
  return cliente;
}

/** Llama una tool y devuelve su resultado ya parseado, mas cuanto tardo. */
export async function llamarTool(
  cliente: Client,
  nombre: string,
  argumentos: Record<string, unknown>,
  meta: { corridaId?: string } = {},
): Promise<{ resultado: unknown; ms: number; ok: boolean }> {
  const inicio = Date.now();
  try {
    // `_meta.corridaId` viaja con la llamada: el MCP lo guarda en `banorte.registros` y asi
    // su lado de la historia se une con la corrida del agente.
    const respuesta = await cliente.callTool({
      name: nombre,
      arguments: argumentos,
      ...(meta.corridaId ? { _meta: { corridaId: meta.corridaId } } : {}),
    });
    const contenido = (respuesta.content as Array<{ type: string; text?: string }> | undefined)?.[0];
    const texto = contenido?.text ?? "null";
    const ok = !respuesta.isError;
    // Una tool que falla devuelve prosa, no JSON: se le pasa al modelo tal cual para
    // que pueda contarlo en pantalla en vez de romper el turno.
    return { resultado: ok ? JSON.parse(texto) : { error: texto }, ms: Date.now() - inicio, ok };
  } catch (error) {
    return {
      resultado: { error: error instanceof Error ? error.message : String(error) },
      ms: Date.now() - inicio,
      ok: false,
    };
  }
}

/** `mutacion`: la tool era de accion (`readOnlyHint: false`). Es lo que dispara rearmar el Inicio. */
export type LlamadaRegistrada = { nombre: string; ms: number; ok: boolean; mutacion?: boolean };

export type OpcionesDeHerramientas = {
  /** El usuario de este turno. Ninguna tool puede leer datos de otra persona. */
  usuarioId: string;
  /**
   * La llave de idempotencia que trae la accion de la interfaz. Si el modelo llama una
   * tool de accion sin llave, se le pone esta: es la garantia de que un reintento no
   * aplica dos veces (contrato agente-cliente).
   */
  idempotencyKey?: string;
  /** Se llama al terminar cada tool: alimenta la linea `tool` del stream. */
  alTerminar?: (llamada: LlamadaRegistrada) => void;
  /** La corrida que esta llamando: viaja en `_meta` para que el MCP la registre. */
  corridaId?: string;
};

/**
 * Traduce las tools del MCP a tools del AI SDK. `dynamicTool` es justo para esto: el
 * schema de entrada se conoce en tiempo de ejecucion, no de compilacion, porque lo
 * publica el servidor MCP. Asi **agregar una tool al MCP no toca el agente**.
 *
 * Dos cosas se fuerzan aqui y no se le piden al modelo:
 *  - `usuarioId` es siempre el del turno; si el modelo escribe otro, se corrige;
 *  - las tools de accion (`readOnlyHint: false`) reciben la `idempotencyKey` de la
 *    accion que las disparo si el modelo no la puso.
 */
export async function herramientasDelMcp(cliente: Client, opciones: OpcionesDeHerramientas): Promise<ToolSet> {
  const { tools } = await cliente.listTools();
  const herramientas: ToolSet = {};

  for (const tool of tools) {
    const esquema = tool.inputSchema as Record<string, unknown>;
    const propiedades = (esquema.properties ?? {}) as Record<string, unknown>;
    const esLectura = tool.annotations?.readOnlyHint !== false;

    herramientas[tool.name] = dynamicTool({
      description: tool.description ?? tool.title ?? tool.name,
      inputSchema: jsonSchema(esquema as never),
      execute: async (entrada) => {
        const argumentos = { ...((entrada ?? {}) as Record<string, unknown>) };
        if ("usuarioId" in propiedades) argumentos.usuarioId = opciones.usuarioId;
        if (!esLectura) {
          if ("idempotencyKey" in propiedades && !argumentos.idempotencyKey && opciones.idempotencyKey) {
            argumentos.idempotencyKey = opciones.idempotencyKey;
          }
          if (
            argumentos.context &&
            typeof argumentos.context === "object" &&
            !("idempotencyKey" in (argumentos.context as Record<string, unknown>)) &&
            opciones.idempotencyKey
          ) {
            (argumentos.context as Record<string, unknown>).idempotencyKey = opciones.idempotencyKey;
          }
        }
        const { resultado, ms, ok } = await llamarTool(cliente, tool.name, argumentos, { corridaId: opciones.corridaId });
        opciones.alTerminar?.({ nombre: tool.name, ms, ok, mutacion: !esLectura });
        return resultado;
      },
    });
  }

  return herramientas;
}
