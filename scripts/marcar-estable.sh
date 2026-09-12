#!/usr/bin/env bash
# Mueve la etiqueta `estable` al commit actual y la sube a GitHub.
# Solo se corre despues de un ensayo de demo que paso completo (skill checklist-demo).
# Si main se rompe, la demo se presenta desde aqui:  git checkout estable
set -eu
export TZ=America/Monterrey
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
scripts/sync.sh "demo verificada, marcada estable" >/dev/null || true
git tag -f estable >/dev/null
git push -q -f origin estable
echo "estable -> $(git rev-parse --short HEAD) ($(date '+%H:%M')). Para volver a este punto: git checkout estable"
