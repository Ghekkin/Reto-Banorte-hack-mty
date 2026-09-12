#!/usr/bin/env bash
# Sincroniza con GitHub: commit de todo lo pendiente, pull --rebase, push.
#
#   scripts/sync.sh "mensaje"    commit con ese mensaje (lo usan las skills guardar y cerrar)
#   scripts/sync.sh --auto       lo corre el hook Stop al final de cada turno:
#                                commit automatico si hay cambios; silencioso si no.
#
# Nunca hace force. Si el rebase choca, aborta, deja el commit local y avisa.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}" || exit 0

modo="manual"; msg="${1:-}"
[ "$msg" = "--auto" ] && { modo="auto"; msg=""; }

NOMBRE=""; ROL=""
# shellcheck disable=SC1091
[ -f .sesion ] && . ./.sesion
quien="${NOMBRE:-$(git config user.name 2>/dev/null || echo alguien)}"
[ -n "${ROL:-}" ] && quien="$quien/$ROL"

salida() {
  if [ "$modo" = "auto" ]; then
    printf '{"systemMessage": %s}\n' "$(printf '%s' "$1" | jq -Rs .)"
  else
    echo "$1"
  fi
}

git add -A
hubo_commit=0
if ! git diff --cached --quiet; then
  if [ -z "$msg" ]; then
    dirs=$(git diff --cached --name-only | awk -F/ '{print ($2=="" ? $1 : $1"/"$2)}' | sort -u | head -4 | paste -sd, -)
    msg="wip: $dirs"
  fi
  if git commit -q -m "[$quien] $msg"; then hubo_commit=1; else salida "No se pudo hacer commit."; exit 0; fi
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  [ "$hubo_commit" = 1 ] && salida "Commit local hecho; no hay remoto configurado."
  exit 0
fi
err=$(git fetch -q origin 2>&1 >/dev/null) || {
  case "$err" in
    *"could not read Username"*|*"Authentication failed"*|*"Permission denied"*)
      salida "Commit local hecho, pero git no tiene credenciales de GitHub. Corre una vez: gh auth login && gh auth setup-git" ;;
    *)
      [ "$hubo_commit" = 1 ] && salida "Commit local hecho; sin red. Se sube en el siguiente turno." ;;
  esac
  exit 0
}

if git rev-parse --verify -q origin/main >/dev/null; then
  if ! git pull -q --rebase origin main >/dev/null 2>&1; then
    git rebase --abort >/dev/null 2>&1
    salida "CONFLICTO al integrar lo de GitHub. Tu commit sigue local. Resolver: git pull --rebase origin main, arreglar, git rebase --continue, y luego scripts/sync.sh"
    exit 0
  fi
  ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 1)
else
  ahead=$(git rev-list --count HEAD 2>/dev/null || echo 1)
fi

if [ "${ahead:-0}" -gt 0 ]; then
  if git push -q -u origin main 2>/dev/null; then
    salida "Subido a GitHub: $ahead commit(s) de $quien."
  else
    salida "Commit hecho pero el push fallo. Reintentar: scripts/sync.sh"
  fi
elif [ "$modo" != "auto" ]; then
  echo "Nada que subir."
fi
exit 0
