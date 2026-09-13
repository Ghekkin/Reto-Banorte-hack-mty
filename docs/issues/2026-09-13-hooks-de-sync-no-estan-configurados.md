---
estado: descartado
severidad: alta
area: infra
encontrado: 2026-09-13 02:38
github: 22
---

# El commit y push automáticos de `CLAUDE.md` no corren: `.claude/settings.json` no trae hooks

**Dónde:** `.claude/settings.json` (solo `permissions`; entró así al repo en `deeff9c`,
2026-09-12 19:19). Lo contradicen `CLAUDE.md:31` ("El hook `SessionStart` hace `git pull`") y
`CLAUDE.md:60` (regla 5: "El hook `Stop` corre `scripts/sync.sh --auto`").

**Qué esperaba:** que al terminar cada turno corriera `scripts/sync.sh --auto` (commit,
`pull --rebase`, push) y que al abrir sesión corriera el `git pull` con el tablero.

**Qué pasa:** ningún hook del repo corre. Los únicos hooks activos en esta máquina son los de
Orca en `~/.claude/settings.json` (`~/.orca/agent-hooks/claude-hook.sh`), que no llaman a
`sync.sh`. El trabajo se queda en el árbol hasta que alguien hace commit y push a mano, y
cada quien cree que ya se subió.

**Cómo lo reproduje / por qué estoy seguro:** el 2026-09-13 a las 02:32 el commit del
selector de persona (`86e3c6c`) quedó solo en local al terminar el turno, y los cambios
"para la persona" que estaban sin commitear desde antes de las 01:48 siguieron sin commitear.
Un `sync.sh --auto` los habría subido con `git add -A`. A las 02:34 otra sesión corrió
`git pull --rebase --autostash`, que rebaseó el commit (`0f27018`), y a las 02:37 lo subió
debajo del suyo (`7779049`). Ese autostash chocó en `inicio-de-maya.tsx` y dejó
`stash@{0}: autostash` en el repo.

**Impacto en la demo:** lo que no se sube no llega al deploy de Coolify ni a `estable`, y
con cuatro personas y varias sesiones en la misma copia los `pull --autostash` a mano
chocan con trabajo ajeno. Hay que decidir si se restauran los hooks `SessionStart`/`Stop` en
`.claude/settings.json` o si se corrige `CLAUDE.md` para decir que el sync es manual
(skill `guardar`).

## Cierre (2026-09-13 06:45)

Descartado por decisión del equipo: ya no se va a desarrollar más, así que el commit y push
automáticos no hacen falta. El sync manual (`scripts/sync.sh`) sigue disponible. Cerrado en GitHub
sin arreglo.
