#!/usr/bin/env bash
# Prueba de humo del MCP: que este arriba, que liste sus tools y que una responda.
# Nivel 3 de la skill `probar`. Requiere el MCP corriendo (scripts/dev.sh).
set -euo pipefail

MCP="${MCP_URL:-http://localhost:3100/mcp}"
SALUD="${MCP%/mcp}/health"
AUTH=()
[ -n "${MCP_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $MCP_TOKEN")

llamar() {
  curl -sS -X POST "$MCP" \
    -H 'content-type: application/json' \
    -H 'accept: application/json, text/event-stream' \
    "${AUTH[@]}" \
    -d "$1"
}

echo "==> /health"
curl -fsS "$SALUD" | head -c 400; echo

echo "==> tools/list"
llamar '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | tail -c 900; echo

echo "==> tools/call consultar_perfil(usr_beto)"
llamar '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"consultar_perfil","arguments":{"usuarioId":"usr_beto"}}}' | tail -c 900; echo

echo ""
echo "humo ok"
