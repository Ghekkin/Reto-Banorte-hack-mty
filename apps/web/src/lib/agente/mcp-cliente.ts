import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { dynamicTool, jsonSchema, type ToolSet } from "ai";
import { config } from "./config";

/**
 * Cliente MCP del agente. Una conexion por turno: el servidor es stateless y abrirla
 * cuesta milisegundos.
 *
 * Es la unica forma en que el agente toca datos o ejecuta acciones. Nada de fetch
 * directo a la base ni logica de negocio de este lado.
 */
export async function conectarMcp(): Promise<Client> {
  const transporte = new StreamableHTTPClientTransport(new URL(config.urlMcp), {
    requestInit: config.tokenMcp ? { headers: { Authorization: `Bearer ${config.tokenMcp}` } } : undefined,
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
): Promise<{ resultado: unknown; ms: number; ok: boolean }> {
  const inicio = Date.now();
  try {
    const respuesta = await cliente.callTool({ name: nombre, arguments: argumentos });
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

export type LlamadaRegistrada = { nombre: string; ms: number; ok: boolean };

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
        if (!esLectura && "idempotencyKey" in propiedades && !argumentos.idempotencyKey && opciones.idempotencyKey) {
          argumentos.idempotencyKey = opciones.idempotencyKey;
        }
        const { resultado, ms, ok } = await llamarTool(cliente, tool.name, argumentos);
        opciones.alTerminar?.({ nombre: tool.name, ms, ok });
        return resultado;
      },
    });
  }

  return herramientas;
}
