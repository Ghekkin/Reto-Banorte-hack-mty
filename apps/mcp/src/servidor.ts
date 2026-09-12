import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "./config.js";
import { registrarTools } from "./tools/index.js";

/**
 * Construye un `McpServer` con todas las tools. Se llama UNA VEZ POR PETICION:
 * transporte Streamable HTTP stateless, sin estado compartido entre llamadas
 * (patron de `/root/yolani/mcp-tenant/src/server.ts`).
 */
export function construirServidor(): McpServer {
  const server = new McpServer(
    { name: "maya-mcp", version: config.version },
    {
      instructions:
        "Tools del dominio financiero de Maya. Las de lectura consultan los datos " +
        "sinteticos; las de accion cambian el estado y su efecto se ve en una lectura " +
        "posterior. Los montos van en centavos.",
    },
  );
  registrarTools(server);
  return server;
}
