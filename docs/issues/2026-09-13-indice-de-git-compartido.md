---
estado: abierto
severidad: alta
area: infra
encontrado: 2026-09-13 14:10
github: 8
---

# El índice de git es compartido: un `git commit` se lleva el trabajo a medio hacer de otra sesión

**Dónde:** el repo entero, cada vez que dos sesiones trabajan a la vez. Pasó en `bd84ba2`
y se arregló en `ee11afc`.

**Qué esperaba:** que `git add packages/catalogo/src && git commit` commiteara **mis**
archivos.

**Qué pasa:** commiteó 35 archivos más que no eran míos —los 22 CSV de `db/datos/`, los
generadores de `scripts/`, `apps/mcp/src/datos/{csv,memoria}.ts` y
`apps/web/src/lib/datos/leer-csv.ts`— porque otra sesión los tenía **borrados y ya en el
índice** (con `git add` hecho) como parte de su migración a PostgreSQL.

Las cuatro sesiones comparten el mismo árbol de trabajo, y por lo tanto **el mismo
`.git/index`**. `git commit` no commitea "lo que acabo de agregar": commitea **todo lo que
está en el índice**. `git add <mi ruta>` no aísla nada si el índice ya traía lo de alguien
más.

**Impacto: `main` se quedó sin arrancar**, que es la única regla que el repo llama no
negociable. El commit dejó el árbol incoherente: `apps/mcp/src/datos/index.ts` seguía
importando `./memoria.js` y `./csv.js`, `apps/web/src/lib/datos/consultas.ts` seguía
importando `./leer-csv`, y el `postgres.ts` que los reemplaza **no estaba en el índice**
(esa parte era código nuevo sin `git add`). Typecheck, `next build` y el arranque del MCP
fallaban. Con un `git push` de por medio, en `main`.

**Cómo se arregló:** `ee11afc` restaura los 35 archivos exactamente como estaban en el
commit anterior (`git checkout 8cdaabc -- <rutas>`), conservando los cambios del catálogo.
La migración a PostgreSQL vuelve a ser de quien la está haciendo, íntegra y sin publicar.
No se usó `--force` sobre `main` en ningún momento.

**Cómo evitarlo, hoy mismo, sin cambiar nada del repo:**

```bash
# Commit por rutas explícitas: ignora el resto del índice.
git commit -- packages/catalogo/src

# O, si hay que revisar antes lo que se va:
git stash push --keep-index          # guarda lo ajeno
git commit -m "…" && git stash pop
```

`git commit -- <rutas>` es la forma corta y la que hay que usar por defecto en este repo.

**Lo que sí conviene cambiar:**

1. Una línea en `CLAUDE.md`, junto a la regla 5 (commit y push automáticos), que diga que
   **un commit manual va por rutas** (`git commit -- <rutas>`) porque el índice es
   compartido. Es donde lo va a leer cualquiera al abrir sesión.
2. Lo mismo en la skill `guardar`, que es la que se invoca para commitear con nombre.
3. Ojo con el hook `Stop`: `scripts/sync.sh --auto` hace `git add -A` **a propósito** (es
   el diseño del repo, para que nada se quede sin subir). Eso significa que el trabajo a
   medias de cualquiera sale publicado al final del turno de cualquier otro. El guardia de
   marcadores de conflicto que se agregó en `255c3ff` tapa un caso; este es otro y no lo
   cubre. Si el equipo quiere cerrarlo de verdad, la vía es que cada sesión trabaje en su
   propio `git worktree`, no en el árbol compartido.

**Cómo publicar sin tocar el árbol compartido** (lo que se usó aquí, y funciona bien):

```bash
git worktree add --detach /tmp/publicar origin/main
git -C /tmp/publicar cherry-pick <mi-commit>
git -C /tmp/publicar push origin HEAD:main
git worktree remove --force /tmp/publicar
```
