---
estado: resuelto
severidad: alta
area: docs
encontrado: 2026-09-13 10:20
github: 4
---

# `CLAUDE.md` tiene marcadores de conflicto de git commiteados en `main`

**Dónde:** `CLAUDE.md`, líneas 126-138 del commit `4d9af89` (y anteriores).

**Qué esperaba:** que el mapa del repositorio se leyera como una tabla.

**Qué pasa:** el archivo tiene **marcadores de conflicto de git commiteados**:
`<<<<<<< Updated upstream`, `=======` y `>>>>>>> Stashed changes` alrededor de las
filas de `apps/web`, `apps/mcp`, `packages/a2ui`, `packages/catalogo` y
`packages/schemas`. Salió de un `git stash pop` resuelto a medias que se subió con el
commit automático del final del turno.

Importa más de lo que parece: `CLAUDE.md` es lo primero que lee **cada agente al abrir
sesión**. Con el conflicto dentro, cualquiera que arranque lee dos estados
contradictorios del proyecto (una versión dice "1 de 8 componentes", la otra "8 de 8")
y no tiene forma de saber cuál es cierta.

**Cómo lo reproduje:** `grep -n "<<<<<<<" CLAUDE.md` y
`git grep -l "<<<<<<<" HEAD -- CLAUDE.md`, que confirma que está en HEAD, no en el
árbol de trabajo de alguien.

**Impacto en la demo:** ninguno en el código. En el equipo, sí: desinforma a quien
llegue a las 3 am.

**Arreglado** midiendo el repo en vez de elegir un lado del conflicto: 15 tools
(11 lectura + 4 acción), 15 schemas, 8 de 8 componentes del catálogo, y las pruebas
contadas de `pnpm test` (112 a2ui, 92 mcp, 42 catálogo, 26 web). Ninguna de las dos
versiones del conflicto era correcta.

**Para que no se repita:** si `sync.sh` o un `stash pop` dejan marcadores, la skill
`resolver-conflicto` dice cómo resolverlos; lo que no se puede es commitear encima.
Vale la pena un chequeo en el hook `Stop` que rechace el commit si algún archivo tiene
`<<<<<<<`.
