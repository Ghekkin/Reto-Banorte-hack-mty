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

# El commit que se esta publicando. Esperar "que /health responda" no sirve: el
# contenedor VIEJO responde igual, y el deploy se daba por bueno cuando todavia
# estaba construyendo. Lo que prueba que termino es que /health devuelva ESTE sha.
SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo "")}"

esperar() {
  local nombre="$1" url="$2"
  [ -z "$url" ] && { echo "    (sin URL publica de $nombre; no espero)"; return 0; }
  echo "==> esperando $nombre en $url"
  [ -n "$SHA" ] && echo "    hasta que sirva el commit ${SHA:0:8}"

  local cuerpo commit
  for _ in $(seq 1 90); do
    cuerpo=$(curl -fsS --max-time 5 "$url" 2>/dev/null || true)
    if [ -n "$cuerpo" ]; then
      if [ -z "$SHA" ]; then
        echo "    arriba (sin sha con que comparar)"
        return 0
      fi
      commit=$(echo "$cuerpo" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')
      if [ "$commit" = "$SHA" ]; then
        echo "    arriba y sirviendo ${SHA:0:8}"
        return 0
      fi
      if [ -z "$commit" ] || [ "$commit" = "null" ]; then
        # El servicio no reporta commit (build local, o SOURCE_COMMIT ausente).
        echo "    arriba, pero no reporta commit: no puedo confirmar que sea el nuevo"
        return 0
      fi
    fi
    sleep 10
  done
  echo "    $nombre no llego a servir $SHA en 15 minutos: revisa el log en $COOLIFY_URL" >&2
  return 1
}

disparar "mcp" "$COOLIFY_APP_MCP_UUID"
disparar "web" "$COOLIFY_APP_WEB_UUID"

# El build tarda; darle margen antes de empezar a preguntar.
sleep 20
esperar "mcp" "${URL_MCP:+$URL_MCP/health}"
esperar "web" "${URL_WEB:+$URL_WEB/api/health}"

echo ""
echo "deploy ok"
