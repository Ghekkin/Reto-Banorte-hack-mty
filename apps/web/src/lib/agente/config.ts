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
  /**
   * Tope de pasos del bucle de tools por turno (ADR 0005: <= 8). Un paso es una
   * ronda modelo -> tools. Es el freno contra un turno que se cicla en la demo.
   */
  maxPasos: Number(process.env.AGENTE_MAX_PASOS ?? 8),
  /**
   * Agente ligero en tokens de entrada (`FEATURE_AGENTE_LIGERO=1`; apagado por default):
   * el system prompt lleva el catalogo como MENU y el modelo pide el detalle de lo que va a
   * pintar con `ver_componentes`; y no ve las 5 tools de mutacion directas, porque toda
   * accion pasa por `ejecutar_decision`. Baja ~45 % los tokens de entrada por turno, pero
   * Gemini cachea peor ese prefijo: con el cache pegando sale igual o mas caro. Medido y
   * explicado en `docs/como-funciona/agente.md`.
   */
  agenteLigero: process.env.FEATURE_AGENTE_LIGERO === "1",
};

/** La unica superficie de la conversacion (contrato agente-cliente). */
export const SUPERFICIE = "principal";
