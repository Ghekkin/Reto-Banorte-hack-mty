---
name: documentar
description: Checklist para documentar un cambio en este repo - qué doc quedó mintiendo, los dos niveles (para cualquiera + técnico), algoritmos, bitácora, índice. Invocar al terminar cualquier cambio, antes de commitear.
---

# Documentar un cambio

Regla del CLAUDE.md: un cambio que deja un doc mintiendo es un cambio incompleto. Esta
skill es la pregunta que hay que hacerse antes de cada commit: **¿qué documento quedó
mintiendo por lo que acabo de hacer?** Casi siempre hay uno.

## Pasos

1. **Busca el doc que describe lo que tocaste.** `grep -ril "<nombre de tool,
   componente o función>" docs/`. Si no existe, lo creas. Si existe, lo corriges.
2. **Dos niveles, sin excepción**, en `docs/como-funciona/<slug>.md`:
   - `## Para cualquiera`: sin código, sin rutas, sin jerga. Prueba: ¿lo entendería
     alguien que no programa? Si dudas, reescribe.
   - `## Técnico`: rutas exactas, nombres de función, schema, cómo probar.
   Plantilla completa en `docs/como-funciona/README.md`.
3. **¿Hay lógica no trivial?** Scoring, ranking, reglas con varias condiciones,
   heurística de qué componente mostrar, parsing, cualquier modelo. Entonces
   `docs/algoritmos/<slug>.md` con la plantilla de `docs/algoritmos/README.md`. La
   sección "La idea" es obligatoria: si no puedes explicar por qué funciona, no lo
   entiendes lo suficiente para defenderlo en el pitch.
4. **Fecha y hora de verificación** en el frontmatter (`verificado:`). Si describes
   estado ("funciona", "está conectado"), el momento en que lo comprobaste.
5. **Estado honesto**: `plan | en-progreso | construido`. Nunca describir como
   construido lo que está a medias.
6. **`docs/README.md`**: si creaste un doc, va al índice. Un doc fuera del índice no
   existe.
7. **Bitácoras**: en la tuya (`docs/bitacora/<nombre>.md`) una entrada con hora de
   qué quedó hecho o a medias. Si fue una decisión o algo que afecta a todos, también
   en `docs/bitacora/equipo.md` (`decisión`, `hecho` o `idea`).
8. **`CLAUDE.md`**: si creaste una carpeta de primer nivel o un comando nuevo, se
   actualiza el mapa o "Comandos habituales".
9. **Decisión grande** (stack, contrato, algo que cambia cómo trabaja el equipo): ADR
   en `docs/decisiones/NNNN-slug.md`.

## Cómo escribir

- Para quien llega sin contexto: rutas, nombres, ejemplos reales de entrada/salida.
- Frases cortas. Un párrafo, una idea.
- Nada de "se podría", "eventualmente", "en el futuro" fuera de una sección de plan.
- Nada de capturas de pantalla.
- Español, kebab-case sin acentos en nombres de archivo.
