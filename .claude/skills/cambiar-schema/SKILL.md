---
name: cambiar-schema
description: Cambio completo del contrato tool → UI - modificar un schema en packages/schemas y, en el mismo commit, la tool, sus datos mock, sus tests y el componente que lo pinta. Invocar antes de tocar cualquier archivo de packages/schemas.
---

# Cambiar un schema

`packages/schemas` es el contrato entre `apps/mcp` y `apps/web`. Cambiarlo a medias
deja a un lado hablando un idioma que el otro no entiende. Por eso la regla del
`CLAUDE.md`: **un cambio de schema no está terminado hasta que ambos lados cambiaron**,
y eso va en un solo commit.

## Antes

1. `scripts/sync.sh` para estar al día: los schemas son el archivo con más
   probabilidad de conflicto.
2. Si no eres `contrato`, avisa al dueño en una línea. Puedes seguir sin esperar.

## Pasos

1. **Schema** (`packages/schemas/src/<tipo>.ts`): cambia campos. Si agregas uno y no
   vas a poder terminar los dos lados ahora, hazlo **opcional** (`.optional()`) para
   que nada se rompa mientras tanto. Un campo nuevo obligatorio solo si terminas todo.
2. **Tool + datos** (`apps/mcp`): el mock produce el campo nuevo con datos plausibles
   (skill `datos-mock`); el test de la tool valida contra el schema.
3. **Componente** (`apps/web/src/components/generated/<tipo>.tsx`): usa el campo. Si
   es opcional, tiene fallback visual.
4. **`pnpm typecheck`** desde la raíz: es la red que atrapa lo que se te olvidó. No se
   commitea con typecheck en rojo.
5. **Doc**: `docs/como-funciona/<tipo>.md`, sección "Entradas y salidas".
6. **Commit único** con `scripts/sync.sh "contrato: <tipo> agrega <campo>"`. Si
   tocaste los tres lados, dilo en el mensaje.
7. Línea en `docs/bitacora/equipo.md`: los demás necesitan saber que el contrato cambió.

## Nunca

- Renombrar un `tipo` existente. Se crea uno nuevo y se deprecia el viejo en el doc.
- Definir tipos "temporales" en `apps/web` o `apps/mcp` para saltarse el paquete.
- Cambiar el schema y "luego" el componente.
