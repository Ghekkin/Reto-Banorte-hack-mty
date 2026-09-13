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

# Las tools que el viaje del ADR 0004 necesita. Se comprueba que ESTEN, no cuantas hay:
# el total crece cada vez que alguien agrega una, y una asercion sobre el total dejaba el
# CI rojo por trabajo bien hecho de otro (paso dos veces). Lo que tiene que fallar es que
# FALTE una de estas. Las demas tools se prueban solas, en las llamadas de mas abajo.
TOOLS_DEL_GUION="consultar_perfil consultar_tarjeta consultar_movimientos simular_reestructura \
consultar_plan aplicar_plan_pago comparar_periodos proyectar_ahorro crear_apartado"

echo "==> tools/list"
LISTA=$(llamar '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | solo_json | jq -r '.result.tools[].name')
echo "    $(echo "$LISTA" | grep -c .) tools publicadas"
for t in $TOOLS_DEL_GUION; do
  if ! echo "$LISTA" | grep -qx "$t"; then
    echo "    FALLO  falta la tool del guion: $t"
    exit 1
  fi
done
echo "    ok  las $(echo "$TOOLS_DEL_GUION" | wc -w | tr -d ' ') tools del viaje estan publicadas"

echo "==> lecturas"
PERFIL=$(tool consultar_perfil '{"usuarioId":"usr_beto"}')
comprobar "perfil de Beto" "Alberto Ramírez Solís" "$(echo "$PERFIL" | jq -r .nombre)"

PANORAMA=$(tool panorama_inicial '{"usuarioId":"usr_beto"}')
comprobar "situacion de Beto" "deuda_critica" "$(echo "$PANORAMA" | jq -r .situacion)"
echo "    porque: $(echo "$PANORAMA" | jq -r .porQue)"

SALUD_BETO=$(tool diagnostico_salud_financiera '{"usuarioId":"usr_beto"}')
comprobar "puntaje de salud de Beto" "39" "$(echo "$SALUD_BETO" | jq -r .puntajeSalud)"
comprobar "calificacion de Beto" "critica" "$(echo "$SALUD_BETO" | jq -r .calificacion)"

# La deuda total tiene que cuadrar con buro: si la tarjeta se contara dos veces
# (aparece tambien como fila de `creditos`), aqui saldrian 12,431,265.
CREDITOS=$(tool consultar_creditos '{"usuarioId":"usr_beto"}')
comprobar "deuda total de Beto" "7692665" "$(echo "$CREDITOS" | jq -r .deudaTotalCentavos)"
comprobar "la deuda mas cara" "tar_beto_clasica" "$(echo "$CREDITOS" | jq -r .creditoMasCaroId)"

TARJETA=$(tool consultar_tarjeta '{"usuarioId":"usr_beto"}')
comprobar "alerta de la tarjeta" "mora" "$(echo "$TARJETA" | jq -r .alerta)"

ANA=$(tool consultar_tarjeta '{"usuarioId":"usr_ana"}')
comprobar "Ana no tiene credito" "sin_tarjeta_credito" "$(echo "$ANA" | jq -r .alerta)"

PLANES=$(tool simular_reestructura '{"usuarioId":"usr_beto"}')
comprobar "plazo recomendado" "18" "$(echo "$PLANES" | jq -r .plazoRecomendado)"
echo "    ahorro a 18 meses: $(echo "$PLANES" | jq -r '.opciones[] | select(.plazoMeses==18) | .ahorroVsMinimoCentavos') centavos"

# Abono a capital (solo la lectura: la accion necesita la migracion 0005 en la base).
PAGO_ANA=$(tool simular_pago_credito '{"usuarioId":"usr_ana","creditoId":"cred_ana_personal","mensualidadCentavos":600000}')
comprobar "Ana pagando \$6,000: pagos que faltan" "11" "$(echo "$PAGO_ANA" | jq -r .simulado.plazoRestanteMeses)"

# Gasto fuera del banco (solo la lectura: la accion necesita la migracion 0006 en la base).
EXTERNO=$(tool simular_gasto_externo '{"usuarioId":"usr_ana","gastos":[{"nombre":"Renta humo","montoCentavos":350000,"frecuencia":"mensual"}]}')
comprobar "Ana con \$3,500 de renta: el gasto del mes sube" "350000" \
  "$(echo "$EXTERNO" | jq -r '.despues.totalCentavos - .antes.totalCentavos')"

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

# La accion tambien mueve la lectura compuesta, y la deuda NO desaparece por
# reestructurar: cambia de revolvente a diferida.
PANORAMA_DESPUES=$(tool panorama_inicial '{"usuarioId":"usr_carmen"}')
comprobar "situacion despues del plan" "plan_activo" "$(echo "$PANORAMA_DESPUES" | jq -r .situacion)"
comprobar "la deuda de la tarjeta sigue ahi" "2841500" \
  "$(tool consultar_creditos '{"usuarioId":"usr_carmen"}' | jq -r .deudaTarjetaCentavos)"

echo ""
echo "humo ok — las tools del viaje, las lecturas y el ciclo de accion completo."
echo "   aviso: el estado quedo con un plan aplicado a usr_carmen."
echo "   antes de un ensayo: pnpm reiniciar-estado"
