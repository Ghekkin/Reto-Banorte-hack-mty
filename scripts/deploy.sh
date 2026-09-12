#!/usr/bin/env bash
# Dispara el deploy de las dos apps en Coolify y espera a que sus /health respondan.
#
# Desde el VPS:        scripts/deploy.sh
# Desde GitHub Actions: el workflow .github/workflows/ci-y-deploy.yml hace lo mismo.
#
# Secretos: /opt/reto/.env en el VPS (COOLIFY_URL, COOLIFY_TOKEN, los uuid de las apps).
# Nunca en el repo.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f /opt/reto/.env ]; then
  set -a; . /opt/reto/.env; set +a
fi

: "${COOLIFY_URL:?falta COOLIFY_URL}"
: "${COOLIFY_TOKEN:?falta COOLIFY_TOKEN}"
: "${COOLIFY_APP_WEB_UUID:?falta COOLIFY_APP_WEB_UUID}"
: "${COOLIFY_APP_MCP_UUID:?falta COOLIFY_APP_MCP_UUID}"
URL_WEB="${URL_WEB_PUBLICA:-}"
URL_MCP="${URL_MCP_PUBLICA:-}"

disparar() {
  local nombre="$1" uuid="$2"
  echo "==> deploy de $nombre ($uuid)"
  # Es POST: en Coolify 4.3 el GET responde 405 ("This endpoint has changed to a POST request").
  #
  # Con reintentos porque el panel devuelve 502 de vez en cuando (esta detras de un
  # proxy y se reinicia solo mientras construye otra cosa). Un hipo de 2 segundos no
  # puede tumbar un deploy a las 3 am.
  local intento respuesta codigo
  for intento in 1 2 3 4 5; do
    respuesta=$(curl -sS -o /tmp/deploy-respuesta -w "%{http_code}" -X POST \
      -H "Authorization: Bearer $COOLIFY_TOKEN" \
      "$COOLIFY_URL/api/v1/deploy?uuid=$uuid&force=false" || echo "000")
    codigo="$respuesta"
    if [ "$codigo" = "200" ] || [ "$codigo" = "201" ]; then
      head -c 300 /tmp/deploy-respuesta; echo
      return 0
    fi
    echo "    intento $intento: HTTP $codigo $(head -c 120 /tmp/deploy-respuesta 2>/dev/null)"
    # 4xx no se reintenta: es token malo, uuid malo o metodo malo, y no mejora solo.
    case "$codigo" in
      4*) echo "    error del cliente, no reintento" >&2; return 1 ;;
    esac
    sleep $((intento * 5))
  done
  echo "    el panel no acepto el deploy de $nombre despues de 5 intentos" >&2
  return 1
}

esperar() {
  local nombre="$1" url="$2"
  [ -z "$url" ] && { echo "    (sin URL publica de $nombre; no espero)"; return 0; }
  echo "==> esperando $nombre en $url"
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      echo "    arriba"
      return 0
    fi
    sleep 5
  done
  echo "    NO respondio en 5 minutos: revisa el log en $COOLIFY_URL" >&2
  return 1
}

disparar "mcp" "$COOLIFY_APP_MCP_UUID"
disparar "web" "$COOLIFY_APP_WEB_UUID"

# El build tarda; darle margen antes de empezar a preguntar.
sleep 30
esperar "mcp" "${URL_MCP:+$URL_MCP/health}"
esperar "web" "${URL_WEB:+$URL_WEB/api/health}"

echo ""
echo "deploy ok"
