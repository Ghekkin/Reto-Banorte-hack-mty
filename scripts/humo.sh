#!/usr/bin/env bash
# Prueba de humo del MCP: que este arriba, que liste sus tools, que las lecturas
# contesten y que el CICLO DE LA ACCION cambie el estado de verdad.
# Nivel 3 de la skill `probar`. Requiere el MCP corriendo (scripts/dev.sh).
#
# La accion se prueba con usr_carmen a proposito: Beto y Ana son los del guion de la
# demo y tienen que quedar como estaban. Aun asi, antes de un ensayo se corre
# `pnpm reiniciar-estado` (skill `checklist-demo`).
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

# El transporte Streamable HTTP puede contestar SSE: se saca el JSON de la linea `data:`.
solo_json() {
  sed -n 's/^data: //p' | tail -n 1
}

# El resultado de una tool viene como texto JSON dentro de content[0].text.
tool() {
  local nombre="$1" argumentos="$2"
  llamar "{\"jsonrpc\":\"2.0\",\"id\":9,\"method\":\"tools/call\",\"params\":{\"name\":\"$nombre\",\"arguments\":$argumentos}}" \
    | solo_json | jq -r '.result.content[0].text // (.error.message | tostring)'
}

comprobar() {
  local que="$1" esperado="$2" recibido="$3"
  if [ "$esperado" = "$recibido" ]; then
    echo "    ok  $que = $recibido"
  else
    echo "    FALLO  $que: esperaba $esperado, llego $recibido"
    exit 1
  fi
}

echo "==> /health"
curl -fsS "$SALUD" | jq -c '{ok, origenDatos, tools: (.tools | length)}'

echo "==> tools/list"
TOOLS=$(llamar '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | solo_json | jq -r '.result.tools | length')
comprobar "tools publicadas" "9" "$TOOLS"

echo "==> lecturas"
PERFIL=$(tool consultar_perfil '{"usuarioId":"usr_beto"}')
comprobar "perfil de Beto" "Alberto Ramírez Solís" "$(echo "$PERFIL" | jq -r .nombre)"

TARJETA=$(tool consultar_tarjeta '{"usuarioId":"usr_beto"}')
comprobar "alerta de la tarjeta" "mora" "$(echo "$TARJETA" | jq -r .alerta)"

ANA=$(tool consultar_tarjeta '{"usuarioId":"usr_ana"}')
comprobar "Ana no tiene credito" "sin_tarjeta_credito" "$(echo "$ANA" | jq -r .alerta)"

PLANES=$(tool simular_reestructura '{"usuarioId":"usr_beto"}')
comprobar "plazo recomendado" "18" "$(echo "$PLANES" | jq -r .plazoRecomendado)"
echo "    ahorro a 18 meses: $(echo "$PLANES" | jq -r '.opciones[] | select(.plazoMeses==18) | .ahorroVsMinimoCentavos') centavos"

GASTO=$(tool comparar_periodos '{"usuarioId":"usr_beto","periodo":"2026-08"}')
comprobar "gasto de agosto" "3334950" "$(echo "$GASTO" | jq -r .gastoCentavos)"

MOVS=$(tool consultar_movimientos '{"usuarioId":"usr_beto","categoriaId":"cat_restaurantes","desde":"2026-08-01","hasta":"2026-08-31"}')
echo "    movimientos de restaurantes en agosto: $(echo "$MOVS" | jq -r .total)"

echo "==> ciclo de la accion (usr_carmen)"
ANTES=$(tool consultar_tarjeta '{"usuarioId":"usr_carmen"}')
comprobar "saldo antes" "2841500" "$(echo "$ANTES" | jq -r .tarjeta.saldoCentavos)"

LLAVE="humo:$(date +%s)"
ACCION=$(tool aplicar_plan_pago "{\"usuarioId\":\"usr_carmen\",\"tarjetaId\":\"tar_carmen_oro\",\"plazoMeses\":12,\"idempotencyKey\":\"$LLAVE\"}")
echo "    $(echo "$ACCION" | jq -r .mensaje)"

REPETIDA=$(tool aplicar_plan_pago "{\"usuarioId\":\"usr_carmen\",\"tarjetaId\":\"tar_carmen_oro\",\"plazoMeses\":12,\"idempotencyKey\":\"$LLAVE\"}")
comprobar "idempotencia (segunda llamada no aplica)" "false" "$(echo "$REPETIDA" | jq -r .aplicado)"

DESPUES=$(tool consultar_tarjeta '{"usuarioId":"usr_carmen"}')
comprobar "saldo despues" "0" "$(echo "$DESPUES" | jq -r .tarjeta.saldoCentavos)"
comprobar "alerta despues" "plan_activo" "$(echo "$DESPUES" | jq -r .alerta)"

PLAN=$(tool consultar_plan '{"usuarioId":"usr_carmen"}')
comprobar "pagos en el calendario" "12" "$(echo "$PLAN" | jq -r '.calendario | length')"
comprobar "el calendario cierra en cero" "0" "$(echo "$PLAN" | jq -r '.calendario[-1].saldoFinalCentavos')"

echo ""
echo "humo ok — 9 tools, lecturas y ciclo de accion completo."
echo "   aviso: el estado quedo con un plan aplicado a usr_carmen."
echo "   antes de un ensayo: pnpm reiniciar-estado"
