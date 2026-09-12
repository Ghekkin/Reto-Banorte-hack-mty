/**
 * Variables de entorno del agente, leidas en un solo lugar. Toda variable nueva
 * entra tambien en `.env.example`, con comentario, en el mismo commit.
 */
export const config = {
  modelo: process.env.MODELO ?? "gemini",
  llaveGoogle: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  llaveAnthropic: process.env.ANTHROPIC_API_KEY ?? "",
  pensamientoGemini: process.env.GEMINI_THINKING ?? "low",
  urlMcp: process.env.MCP_URL ?? "http://localhost:3100/mcp",
  tokenMcp: process.env.MCP_TOKEN ?? "",
  /** El `catalogId` de cada `createSurface`. Un juez puede abrirlo. */
  urlCatalogo: process.env.URL_CATALOGO ?? "http://localhost:3000/catalogo/v1.json",
};
