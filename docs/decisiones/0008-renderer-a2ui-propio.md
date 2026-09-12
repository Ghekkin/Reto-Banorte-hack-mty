---
estado: aceptada
fecha: 2026-09-11 23:10
---

# 0008 — Renderer A2UI propio, fiel a la especificación v0.9.1

Reemplaza los puntos 1 y 4 del ADR 0003 (usar `@a2ui/react` con plan B). El resto del
0003 sigue vigente: A2UI real, catálogo propio, el agente emite los mensajes y recibe
los `action`.

## Contexto

`@a2ui/web_core` está construido sobre Lit. Si el renderer React envuelve web
components con shadow DOM, los estilos de Tailwind y shadcn —el sistema de diseño que
acabamos de fijar con la paleta de Banorte— no entran en el catálogo básico (Column,
Row, Text). Además el paquete está en "public preview", y ponerlo en la ruta crítica
de la demo viola la regla 4 del `CLAUDE.md`. Lo que el jurado evalúa es que el agente
**hable A2UI** y que el ciclo se cierre; la especificación misma documenta cómo
escribir un renderer propio.

## Decisión

1. **Escribimos nuestro renderer A2UI** en `packages/a2ui`: ~200 líneas de TypeScript
   que procesan mensajes **v0.9.1 exactos** (`createSurface`, `updateComponents`,
   `updateDataModel`, `deleteSurface`), resuelven bindings por JSON Pointer, arman el
   árbol desde la lista plana y pintan con un registro `nombre → componente React`.
   Los `action` se emiten con el `context` resuelto desde el data model.
2. **Los JSON Schema oficiales** de la especificación (`specification/v0_9_1/`,
   Apache 2.0) se vendorean en `packages/a2ui/spec/` y **todo mensaje se valida contra
   ellos** antes de llegar al renderer y antes de salir del agente. Es lo que hace
   "A2UI" defendible sin el paquete oficial.
3. **Los componentes de layout** (Column, Row, Text, Divider) los implementamos
   nosotros con Tailwind: son pocas líneas y salen con nuestra tipografía y tokens.
   Nuestro catálogo financiero (`packages/catalogo`) se registra en el mismo registro.
4. **`catalogId` es una URL real** servida por `apps/web` (`/catalogo/v1.json`), con
   el schema de cada componente. Un juez puede abrirla.
5. **No se hace el spike de `@a2ui/react`.** Si alguien tiene curiosidad, después de
   la congelación. El corte H6 del roadmap pasa a ser: "el renderer propio pinta el
   primer componente del catálogo desde un `.jsonl` a mano".

## Alternativas descartadas

- **`@a2ui/react` oficial.** Menos código, pero estilos en riesgo por shadow DOM,
  SSR incierto en App Router y dependencia en preview. Ver la tabla en
  `docs/arquitectura/renderer-a2ui.md`.
- **Protocolo propio "equivalente".** Perdería el nombre que el jurado escribió cinco
  veces. El renderer es nuestro; el protocolo, no.

## Consecuencias

- `contrato` arranca a las 00:00 con `packages/a2ui` según
  `docs/arquitectura/renderer-a2ui.md`, no con un spike.
- Las skills `ui-generativa`, `scaffold` y `agente-host`, el roadmap y
  `vision-general.md` dejan de mencionar `@a2ui/react`.
- Cuando el jurado pregunte: "implementamos un renderer conforme a A2UI v0.9.1,
  validado con los JSON Schema oficiales; así nuestro sistema de componentes es 100 %
  nuestro, como pide la regla 1 del reto".
