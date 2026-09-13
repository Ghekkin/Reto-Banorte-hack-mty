---
name: guardar
description: Sincroniza ahora con GitHub con un mensaje de commit real - commit de lo pendiente, pull --rebase, push. Invocar cuando terminas algo con nombre (una tool, un componente, un doc) y no quieres esperar al commit automático del final del turno.
---

# Guardar (sincronizar con GitHub)

El hook `Stop` ya sube todo al final de cada turno con un mensaje `wip:`. Esta skill
es para cuando lo que acabas de terminar **merece un nombre**, o para asegurarte de
que otro pueda jalar tu cambio ya.

## Pasos

1. Pasa la skill `documentar` mentalmente: ¿qué doc quedó mintiendo? Si hay uno,
   corrígelo antes de guardar.
2. Corre:
   ```bash
   scripts/sync.sh "<mensaje>"
   ```
   El script antepone `[nombre/rol]` solo. El mensaje: qué cambió y dónde, en
   imperativo o sustantivo, sin punto final. Si resuelve un issue, incluye `Fixes #N`.
   Si tocaste dominio ajeno, dilo: `mcp: agrego campo categoria a consultar_movimientos`.
3. Lee la salida. Tres resultados posibles:
   - **Subido**: listo.
   - **Conflicto**: el commit quedó local. Resuélvelo (`git pull --rebase origin
     main`, arregla, `git rebase --continue`) y vuelve a correr `scripts/sync.sh`.
     Si el conflicto es en dominio ajeno, la versión del dueño gana; pregúntale.
   - **Sin red**: queda local; se sube en el siguiente turno con red.
4. Si el cambio importa a otros (un schema nuevo, un comando nuevo), una línea en
   `docs/bitacora/equipo.md`.

## Nunca

- `git push --force` sobre `main`.
- Commitear `.env`, credenciales o datos reales de personas.
- `git commit` sin rutas explícitas si haces commit manual fuera de `scripts/sync.sh`:
  el índice `.git/index` es compartido entre sesiones y se lleva trabajo ajeno preparado.
  Usa siempre `git commit -- <rutas>`.
