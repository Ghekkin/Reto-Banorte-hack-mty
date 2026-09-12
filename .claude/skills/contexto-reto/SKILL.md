---
name: contexto-reto
description: Carga el contexto del Reto Banorte (Hack Monterrey 2026) al inicio de una sesión - qué es el reto, qué se decidió, dónde está todo y qué está pendiente. Invocar al empezar cualquier sesión de trabajo en este repo.
---

# Contexto del reto

Orden de lectura, sin saltarse ninguno:

1. `CLAUDE.md` — reglas y mapa del repo.
2. `docs/reto/contexto-del-reto.md` — el reto oficial: tres piezas (LLM, MCP, A2UI), el
   ciclo cerrado, las cuatro reglas. Y `docs/reto/rubrica-y-entregables.md`: qué pesa.
3. `docs/reto/preguntas-para-manana.md` — si la sección "Respuestas" sigue vacía, el
   reto no ha dado detalles todavía: **no inventes requisitos**.
4. `docs/tablero.md` y `docs/bitacora/equipo.md` — solo las entradas del día actual y
   el anterior. Ahí está quién está en qué, lo último que se decidió y lo último que
   se rompió. Tu bitácora personal (`docs/bitacora/<nombre>.md`) ya la leíste en `inicio`.
5. `docs/issues/index.md` — la tabla. Cualquier issue con severidad `critica` abierto
   va antes que cualquier tarea nueva.
6. `docs/decisiones/` — solo los títulos, salvo que tu tarea toque esa decisión.

Al terminar, di en dos líneas qué entendiste que es el estado actual y qué vas a hacer.
Si algo de lo que leíste contradice lo que te pidieron, dilo antes de empezar.

## Reglas que más se olvidan

- Cada cambio actualiza el doc que lo describe (skill `documentar`).
- Cada bug ajeno se registra en `docs/issues/` **y** en GitHub con `gh issue create`, en el momento (skill `registrar-issue`).
- Cada algoritmo se explica en `docs/algoritmos/`.
- `main` siempre arranca: lo que está a medias va detrás de un mock o un flag, porque
  al final de cada turno se sube solo.
- Solo editas tu fila de `docs/tablero.md`.
- Al irte, skill `cerrar`: bitácora personal, tablero y push con mensaje real.
