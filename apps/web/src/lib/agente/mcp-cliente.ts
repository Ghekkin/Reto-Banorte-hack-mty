import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from "./config";

/**
 * Cliente MCP del agente. Una conexion por turno: el servidor es stateless y
 * abrirla cuesta milisegundos.
 *
 * Es la unica forma en que el agente toca datos o ejecuta acciones. Nada de
 * fetch directo a la base ni logica de negocio de este lado.
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
    return { resultado: JSON.parse(texto), ms: Date.now() - inicio, ok: !respuesta.isError };
  } catch (error) {
    return {
      resultado: { error: error instanceof Error ? error.message : String(error) },
      ms: Date.now() - inicio,
      ok: false,
    };
  }
}
