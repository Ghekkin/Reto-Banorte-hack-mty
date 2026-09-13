/**
 * Variables de entorno del agente, leidas en un solo lugar. Toda variable nueva
 * entra tambien en `.env.example`, con comentario, en el mismo commit.
 */
export const config = {
  modelo: process.env.MODELO ?? "gemini",
  /**
   * El id exacto del modelo de Google, por si hay que cambiarlo sin tocar codigo. Existe
   * porque la cuota gratuita es POR MODELO (20 peticiones al dia de `gemini-3.8-flash`) y en
   * un hackathon se agota a media tarde: con esto el ensayo del guion se corre en
   * `gemini-3.5-flash-lite`, que tiene su propia cuota, en vez de quedarse sin verificar.
   * Es el mismo patron que `MODELO_INICIO`, que ya lo hacia para las portadas.
   */
  modeloGemini: process.env.MODELO_GEMINI ?? "gemini-3.8-flash",
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
};

/** La unica superficie de la conversacion (contrato agente-cliente). */
export const SUPERFICIE = "principal";
