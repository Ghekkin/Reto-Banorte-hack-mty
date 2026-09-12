#!/usr/bin/env bash
# Sincroniza con GitHub: commit de todo lo pendiente, pull --rebase, push.
#
#   scripts/sync.sh "mensaje"    commit con ese mensaje (lo usan las skills guardar y cerrar)
#   scripts/sync.sh --auto       lo corre el hook Stop al final de cada turno:
#                                commit automatico si hay cambios; silencioso si no.
#
# Nunca hace force. Si el rebase choca, aborta, deja el commit local y avisa.
set -u
export TZ=America/Monterrey   # todas las horas del repo en hora de Monterrey (UTC-6)
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

# `catalogo.json` se genera desde los schemas de `packages/catalogo/src`, y el CI truena si
# no coincide ("catalogo.json al dia"). Paso cuatro veces el 2026-09-12: alguien cambia un
# schema o `comunes.ts`, el commit automatico se lleva el cambio sin regenerar y `main`
# queda en rojo hasta que otra persona lo nota. Regenerarlo aqui cuesta ~5 s y solo corre
# cuando hay algo del catalogo pendiente. Si falla (dependencias sin instalar), no bloquea
# el commit: el CI lo sigue cuidando.
if git status --porcelain -- packages/catalogo/src | grep -q .; then
  pnpm catalogo >/dev/null 2>&1 || true
fi

git add -A

# Un conflicto a medio resolver NO se commitea. `CLAUDE.md` llego a `main` con los
# marcadores dentro (issue #4) porque el commit automatico del final del turno se los
# llevo sin mirar, y `CLAUDE.md` es lo primero que lee cada agente al abrir sesion: paso
# horas contando dos estados contradictorios del proyecto.
#
# Se buscan solo `<<<<<<< ` y `>>>>>>> ` (con el espacio y la etiqueta que pone git). El
# `=======` solo no cuenta: en Markdown es el subrayado de un titulo.
marcados=$(
  git diff --cached --name-only --diff-filter=ACM -z     | xargs -0 -r grep -lIE '^(<<<<<<< |>>>>>>> )' 2>/dev/null
)
if [ -n "$marcados" ]; then
  salida "NO COMMITEO: hay marcadores de conflicto sin resolver en:
$marcados
Resuelvelos (skill resolver-conflicto) y vuelve a correr scripts/sync.sh. Tu trabajo
sigue en el arbol; no se pierde nada."
  exit 0
fi

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
