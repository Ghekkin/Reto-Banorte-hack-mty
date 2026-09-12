#!/usr/bin/env bash
# Mueve la etiqueta `estable` a un commit verificado y la sube a GitHub.
# Solo se corre despues de un ensayo de demo que paso completo (skill checklist-demo).
# Si main se rompe, la demo se presenta desde aqui:  git checkout estable
#
#   scripts/marcar-estable.sh            # etiqueta HEAD
#   scripts/marcar-estable.sh <commit>   # etiqueta ese commit (el que corre en produccion)
#
# **Ya no commitea nada** (issue #8). Antes llamaba a `sync.sh`, que hace `git add -A`:
# con cuatro sesiones sobre el mismo arbol de trabajo eso se lleva el trabajo a medio
# hacer de los demas y lo publica. Etiquetar es etiquetar; si tienes cosas que subir,
# usa la skill `guardar` primero.
set -eu
export TZ=America/Monterrey
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

OBJETIVO="${1:-HEAD}"
COMMIT="$(git rev-parse --verify "${OBJETIVO}^{commit}")"

if [ -n "$(git status --porcelain)" ]; then
  echo "Aviso: hay cambios sin commitear en el arbol. No se suben: se etiqueta un commit, no tu carpeta."
  echo "       Si esos cambios son parte de la demo verificada, subelos primero (skill 'guardar')."
fi

# Etiquetar algo que no esta publicado deja la etiqueta apuntando al vacio para los demas.
if ! git merge-base --is-ancestor "$COMMIT" origin/main 2>/dev/null; then
  git fetch -q origin main || true
  if ! git merge-base --is-ancestor "$COMMIT" origin/main 2>/dev/null; then
    echo "Error: $(git rev-parse --short "$COMMIT") no esta en origin/main. Subelo antes de marcarlo estable." >&2
    exit 1
  fi
fi

git tag -f estable "$COMMIT" >/dev/null
git push -q -f origin estable
echo "estable -> $(git rev-parse --short "$COMMIT") ($(date '+%H:%M')). Para volver a este punto: git checkout estable"
