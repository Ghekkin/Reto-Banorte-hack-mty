---
estado: resuelto
severidad: critica
area: web
encontrado: 2026-09-12 11:05
github: 11
resuelto-en: 4bfe1c7
---

# `main` roto: marcadores de conflicto commiteados en el prompt del agente

**Dónde:** `apps/web/src/lib/agente/prompt.ts:53-69`, en el commit `8acd117` ("update")

**Qué esperaba:** que `main` arranque siempre (regla 4 del `CLAUDE.md`).

**Qué pasa:** el archivo entró a `main` con `<<<<<<< Updated upstream`, `=======` y
`>>>>>>> Stashed changes` dentro. `pnpm typecheck` falla con tres `TS1185` y **el CI
corta antes del paso de deploy**: lo publicado se queda en la versión anterior sin que
nadie se entere, porque la app sigue viva.

Es la segunda vez que pasa (la primera fue el issue #4, en `CLAUDE.md`). La guarda que
puse en `scripts/sync.sh` revisa el índice antes de commitear y no lo atrapó: este commit
no salió por `sync.sh`.

**Lo que había dentro del conflicto:** el lado `Stashed changes` venía de un stash viejo y
mandaba llamar la tool **`ejecutar_decision`**, que no existe en el MCP (18 tools,
ninguna se llama así). De haber ganado ese lado, el ciclo de acción —el flujo accionable
que el reto exige— habría quedado apuntando al vacío.

**Lo mismo, fuera del conflicto:** el prompt nombraba **`analizar_gasto`** y
**`analizar_ahorro`** como las tools por las que empezar. Tampoco existen.

**Impacto en la demo: la rompe.** Sin deploy, cualquier arreglo posterior no llega a la
URL pública; y con `ejecutar_decision` en el prompt, la acción de Beto no se ejecuta.

## Cómo quedó

Resuelto a favor del lado que funciona hoy (el que además obliga a repintar
`ResumenTarjeta` tras la acción). Las dos tools compuestas inexistentes quedaron
apuntando a las reales: `comparar_periodos`, `detectar_fugas`, `proyectar_ahorro` y
`consultar_inversiones`. **El prefetch de `panorama_inicial`, que sí está implementado en
`agente.ts`, se respetó tal cual**: es trabajo bueno de la otra sesión y no se tocó.

Se arregló desde un `git worktree` aparte, sin tocar el árbol compartido, que es el
procedimiento del issue #8.

**Para quien está haciendo el refactor de tools compuestas** (`analizar_gasto`,
`analizar_ahorro`, `ejecutar_decision`): cuando esas tools existan en `apps/mcp`, la
lista del paso 1 del prompt y el bloque de acciones son los dos lugares que hay que
volver a tocar. No se borró nada de tu diseño, solo se apuntó a lo que hoy existe.
