#!/usr/bin/env bash
# Levanta todo lo que la demo necesita, en orden, y espera a que responda.
# Puertos fijos: web 3000, mcp 3100 (skill `scaffold`). Ctrl-C baja los dos.
set -euo pipefail
cd "$(dirname "$0")/.."

MCP_PUERTO="${MCP_PUERTO:-3100}"
WEB_PUERTO="${WEB_PUERTO:-3000}"

if [ ! -f .env ]; then
  echo "  FALTA .env. Copia .env.example a .env y llena DATABASE_URL (obligatoria) y la"
  echo "  llave de Gemini. Sin base, el MCP no arranca (ADR 0010)."
  exit 1
fi

# El .env vive en la raiz, pero cada app corre con su propio cwd: Next busca
# apps/web/.env y no lo encuentra. Se cargan aqui y se exportan, asi los dos procesos
# heredan las mismas variables y hay un solo archivo que mantener.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "  FALTA DATABASE_URL en .env: los datos viven en PostgreSQL (ADR 0010)." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "==> pnpm install (primera vez)"
  pnpm install
fi

# El catalogo que el agente lee y que apps/web sirve en /catalogo/v1.json
pnpm --filter @maya/catalogo generar >/dev/null

limpiar() {
  echo ""
  echo "==> bajando servicios"
  kill 0 2>/dev/null || true
}
trap limpiar EXIT INT TERM

echo "==> MCP en :$MCP_PUERTO"
MCP_PUERTO="$MCP_PUERTO" pnpm --filter @maya/mcp dev &

for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:$MCP_PUERTO/health" >/dev/null 2>&1; then
    echo "    /health responde"
    break
  fi
  sleep 1
done

echo "==> web en :$WEB_PUERTO"
pnpm --filter @maya/web dev &

echo ""
echo "  web      http://localhost:$WEB_PUERTO"
echo "  mcp      http://localhost:$MCP_PUERTO/mcp   (health: /health)"
echo "  catalogo http://localhost:$WEB_PUERTO/catalogo/v1.json"
echo ""
wait
