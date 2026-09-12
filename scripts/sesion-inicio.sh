#!/usr/bin/env bash
# Hook SessionStart. Pone el repo al dia con GitHub y le dice al agente
# quien esta trabajando, que hay en el tablero y que quedo pendiente.
# Todo lo que imprime entra al contexto del agente.
set -u
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}" || exit 0

echo "== Reto Banorte: inicio de sesion $(date '+%Y-%m-%d %H:%M') =="

if git rev-parse --verify -q HEAD >/dev/null; then
  if git remote get-url origin >/dev/null 2>&1; then
    if git fetch -q origin 2>/dev/null; then
      behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
      if [ "${behind:-0}" -gt 0 ]; then
        if git pull -q --rebase --autostash origin main 2>/dev/null; then
          echo "GitHub: traidos $behind commits nuevos:"
          git log --oneline -"$behind" | sed 's/^/  /'
        else
          git rebase --abort 2>/dev/null
          echo "AVISO: hay $behind commits en GitHub que no se pudieron integrar (conflicto)."
          echo "  Resolver antes de trabajar: git pull --rebase --autostash origin main"
        fi
      else
        echo "GitHub: al dia."
      fi
    else
      err=$(git fetch origin 2>&1 >/dev/null || true)
      case "$err" in
        *"could not read Username"*|*"Authentication failed"*|*"Permission denied"*)
          echo "GitHub: git no tiene credenciales. Corre una vez: gh auth login && gh auth setup-git" ;;
        *) echo "GitHub: sin red o sin acceso. Se trabaja con lo local; se sube cuando vuelva." ;;
      esac
    fi
  fi
else
  echo "Repo sin commits todavia."
fi

if [ -f .sesion ]; then
  # shellcheck disable=SC1091
  . ./.sesion
  echo "Identidad guardada: ${NOMBRE:-?} como ${ROL:-?}."
  echo "  Confirma con el usuario en una linea que sigue siendo asi. Si cambia, invoca la skill inicio."
else
  echo "SIN IDENTIDAD DE SESION. Antes de cualquier tarea invoca la skill inicio (pregunta nombre y rol)."
fi

echo "-- Tablero: ahora mismo --"
sed -n '/## Ahora mismo/,/## Bloqueos/p' docs/tablero.md 2>/dev/null | grep '^|' | tail -n +3 | sed 's/^/  /'
echo "-- Tablero: bloqueos --"
sed -n '/## Bloqueos/,/## Siguiente/p' docs/tablero.md 2>/dev/null | grep '^- ' | sed 's/^/  /'
echo "-- Ultimas entradas de docs/bitacora/equipo.md --"
grep -m 4 -E '^- \*\*[0-9]{2}:[0-9]{2}' docs/bitacora/equipo.md 2>/dev/null | sed 's/^/  /'

n=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
[ "${n:-0}" -gt 0 ] && echo "Hay $n archivos con cambios locales sin subir; se suben solos al terminar cada turno."
exit 0
