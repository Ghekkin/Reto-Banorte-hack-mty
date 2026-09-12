---
name: resolver-conflicto
description: Qué hacer cuando sync.sh reporta CONFLICTO al integrar GitHub - quién gana en cada tipo de archivo, cómo se resuelve un rebase sin perder nada, y qué nunca se hace. Invocar en cuanto aparezca el aviso de conflicto.
---

# Resolver un conflicto

`scripts/sync.sh` ya abortó el rebase: tu commit está a salvo en local y el árbol
está limpio. Nada se perdió. Ahora se integra a mano.

## Pasos

1. `git pull --rebase origin main`. Va a parar en el conflicto. `git status` dice qué
   archivos.
2. **Ojo con la nomenclatura de git durante un rebase, está invertida**: `ours` es lo
   que ya está en GitHub (lo del otro); `theirs` es **tu** commit.
3. Resuelve archivo por archivo con esta tabla:

   | Archivo | Regla |
   |---|---|
   | `docs/tablero.md` | Se conservan **las dos** versiones: cada quien su fila. Nunca se borra la fila de otro. |
   | `docs/bitacora/equipo.md` | Se conservan **las dos** entradas, ordenadas por hora. |
   | `docs/issues/index.md` | Las dos filas. |
   | `packages/schemas/*` | Avisa a `contrato`. Si no está: la versión que ya está en GitHub gana y tu cambio se reaplica encima como opcional. |
   | Tu dominio | Decides tú. |
   | Dominio ajeno | La versión del dueño (la que está en GitHub, `ours`) gana. Reaplicas lo mínimo tuyo encima. Si no sabes, pregunta. |
   | Archivos generados (`movimientos.json`, lockfile) | Toma la de GitHub y regenera: `pnpm install` / `pnpm --filter mcp generar-datos`. |

4. `git add <archivos>` y `git rebase --continue`. Repite si hay más commits.
5. `pnpm typecheck`. Un conflicto mal resuelto casi siempre rompe tipos.
6. `scripts/sync.sh "resuelve conflicto en <archivo> con <quién>"`.
7. Una línea en tu bitácora. Si el conflicto fue en schemas, también en la de equipo.

## Si te pierdes

`git rebase --abort` te regresa exactamente a donde estabas antes del paso 1. Sin
miedo: es reversible. Pide ayuda al dueño del archivo y vuelve a empezar.

## Nunca

- `git push --force` ni `-f`. Está bloqueado por permisos y aun así: nunca.
- `git reset --hard`. Borra trabajo de otros o tuyo sin aviso.
- Resolver un conflicto en `docs/tablero.md` quedándote solo con tu fila.
- "Ya luego lo arreglo": un conflicto sin resolver bloquea el push automático de todos
  tus turnos siguientes.
