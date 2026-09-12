import cors from "cors";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { inicializarDatos } from "./datos/index.js";
import { construirServidor } from "./servidor.js";
import { TOOLS } from "./tools/index.js";

/**
 * Servidor MCP de Maya. Streamable HTTP **stateless**: un `McpServer` y un
 * transport por peticion. Sin OAuth: un `Authorization: Bearer` fijo del `.env`
 * basta para el hack (skill `scaffold`).
 */
const app = express();
app.use(express.json({ limit: "4mb" }));
app.use(cors({ origin: true, exposedHeaders: ["mcp-session-id"] }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    servicio: "maya-mcp",
    version: config.version,
    commit: config.commit,
    origenDatos: config.origenDatos,
    tools: TOOLS.map((t) => t.nombre),
  });
});

function autorizado(req: express.Request): boolean {
  if (!config.token) return true; // sin token configurado = solo local
  return req.header("authorization") === `Bearer ${config.token}`;
}

app.post("/mcp", async (req, res) => {
  if (!autorizado(req)) {
    res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "No autorizado" }, id: null });
    return;
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = construirServidor();

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[mcp] fallo manejando la peticion", error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Error interno" }, id: null });
    }
  }
});

// Los datos se cargan al arrancar: si la base no responde, se sabe AHORA y no a
// media demo. Sin datos no se levanta el servidor: un MCP que contesta sin datos es
// peor que uno que no contesta.
const tablas = await inicializarDatos();
app.listen(config.puerto, () => {
  console.log(
    `[mcp] escuchando en http://localhost:${config.puerto}/mcp — ${TOOLS.length} tool(s), ` +
      `${tablas.size} tablas desde ${config.origenDatos}`,
  );
});
