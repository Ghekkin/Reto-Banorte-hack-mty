import "dotenv/config";

/**
 * Toda variable de entorno se lee AQUI y en ningun otro lado. Si agregas una,
 * entra tambien en `.env.example` en el mismo commit (regla del repo).
 */
export const config = {
  puerto: Number(process.env.MCP_PUERTO ?? 3100),
  /** `Authorization: Bearer <token>`. Vacio = sin autenticacion (solo local). */
  token: process.env.MCP_TOKEN ?? "",
  /** `memoria` (CSV de db/datos, default) | `postgres` (detras del flag). ADR 0007 */
  origenDatos: process.env.FEATURE_POSTGRES === "true" ? ("postgres" as const) : ("memoria" as const),
  urlPostgres: process.env.DATABASE_URL ?? "",
  /**
   * La fecha que el MCP considera "hoy". Vacio = la del movimiento mas reciente de
   * los CSV. Los datos sinteticos terminan en una fecha fija: si "hoy" fuera el reloj
   * del servidor, "los ultimos 30 dias" saldrian vacios (`dominio/tiempo.ts`).
   */
  hoy: process.env.MCP_HOY ?? "",
  /** Donde vive el estado que las acciones mutan. Se reinicia antes de cada ensayo. */
  archivoEstado: process.env.MCP_ESTADO ?? "apps/mcp/estado.json",
  version: "0.1.0",
  /** Lo inyecta Coolify al construir. Es como `deploy.sh` sabe que ya se publico. */
  commit: process.env.SOURCE_COMMIT ?? null,
};
