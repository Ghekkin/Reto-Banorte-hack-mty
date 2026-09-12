import "dotenv/config";

/**
 * Toda variable de entorno se lee AQUI y en ningun otro lado. Si agregas una,
 * entra tambien en `.env.example` en el mismo commit (regla del repo).
 */
export const config = {
  puerto: Number(process.env.MCP_PUERTO ?? 3100),
  /** `Authorization: Bearer <token>`. Vacio = sin autenticacion (solo local). */
  token: process.env.MCP_TOKEN ?? "",
  /**
   * El origen es PostgreSQL, sin alternativa (ADR 0010). Se deja el campo porque el
   * `/health` lo reporta y porque decir de donde salen los datos es parte de la
   * respuesta cuando el jurado pregunta.
   */
  origenDatos: "postgres" as const,
  urlPostgres: process.env.DATABASE_URL ?? "",
  /**
   * La fecha que el MCP considera "hoy". Vacio = la del movimiento mas reciente de
   * los datos. Los datos sinteticos terminan en una fecha fija: si "hoy" fuera el reloj
   * del servidor, "los ultimos 30 dias" saldrian vacios (`dominio/tiempo.ts`).
   */
  hoy: process.env.MCP_HOY ?? "",
  version: "0.1.0",
  /** Lo inyecta Coolify al construir. Es como `deploy.sh` sabe que ya se publico. */
  commit: process.env.SOURCE_COMMIT ?? null,
};
