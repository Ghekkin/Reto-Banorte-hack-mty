---
name: cerrar
description: Ritual de cierre de sesión - deja escrito dónde te quedaste para que cualquiera pueda retomar desde el repo, actualiza tablero y bitácora, y sincroniza con GitHub. Invocar cuando el usuario dice que se va, que para, o que cambia de rol.
---

# Cierre de sesión

El objetivo: que alguien que **no habló contigo** pueda seguir tu trabajo leyendo
solo el repo. Tarda tres minutos y ahorra una hora al siguiente.

## Pasos

1. **Estado honesto de lo que tocaste.** Para cada cosa en curso, una de tres:
   `hecho`, `a-medias` (con qué falta exactamente y qué archivo), o `descartado`
   (por qué). Nada de "casi".
2. **Si dejaste algo a medias que rompe `main`**, no cierres así: ponlo detrás de un
   mock, un flag o un campo opcional para que arranque. Regla 4 del `CLAUDE.md`.
3. **Docs**: pasa la skill `documentar`. Lo que quedó `a-medias` se marca
   `estado: en-progreso` en su doc, no `construido`.
4. **Issues**: todo lo roto que viste y no arreglaste, registrado (skill
   `registrar-issue`), aunque sea tuyo.
5. **Tablero** (`docs/tablero.md`, solo tus líneas): tu fila vuelve a "—" o dice
   "a medias: X (ver bitácora)"; tu línea de "Siguiente" dice el siguiente paso
   concreto; tus bloqueos, si hay.
6. **Bitácora personal**: entrada `cierre` con qué quedó hecho, qué a medias (ruta y
   qué falta), qué tocaste de dominio ajeno. Si hubo decisión, también en
   `docs/bitacora/equipo.md`.
7. **Sincroniza** con mensaje real:
   ```bash
   scripts/sync.sh "cierre: <resumen en una línea>"
   ```
   Verifica que diga "Subido a GitHub". Si hay conflicto, resuélvelo antes de irte:
   un cierre sin push no es cierre.
8. Confirma al usuario en dos líneas: qué quedó subido y qué es lo primero que hay que
   hacer al volver.
