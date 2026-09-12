/**
 * `GET /api/health` — lo mira el healthcheck de Docker, Coolify y `scripts/deploy.sh`.
 * Responde sin tocar el MCP a proposito: dice si ESTA app esta viva, no el sistema.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    ok: true,
    servicio: "maya-web",
    version: process.env.npm_package_version ?? "0.1.0",
    commit: process.env.SOURCE_COMMIT ?? process.env.GIT_SHA ?? null,
  });
}
