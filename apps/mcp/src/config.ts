import { join } from "node:path";
import { config as cargarDotenv } from "dotenv";

/**
 * El `.env` vive en la RAIZ del repo y este proceso corre con `cwd` en `apps/mcp`, asi
 * que `import "dotenv/config"` a secas no encontraba nada: buscaba `apps/mcp/.env`.
 * Funcionaba solo porque `scripts/dev.sh` exportaba las variables antes, y eso pide
 * bash. Arrancando con `pnpm --filter @maya/mcp dev` en Windows, el MCP se quedaba sin
 * `DATABASE_URL` y no levantaba (ADR 0010: sin base no arranca).
 *
 * La ruta se resuelve desde este archivo, no desde `cwd`. dotenv no sobreescribe lo que
 * ya esta en el entorno, asi que Docker y Coolify siguen mandando.
 *
 * **Bajo vitest no se carga nada.** El aislamiento de las pruebas depende de que
 * `DATABASE_URL` este VACIA: `datos/estado.ts` usa eso para saber que no hay base y
 * guardar las acciones en memoria. Si se carga el `.env`, `pnpm test` escribe en la
 * tabla `acciones_aplicadas` de la demo, que es exactamente lo que el ADR 0010 (punto 6)
 * promete que no pasa. Para probar contra una base real, se pasa la variable a mano.
 */
if (!process.env.VITEST) {
  cargarDotenv({ path: join(import.meta.dirname, "..", "..", "..", ".env") });
}

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
