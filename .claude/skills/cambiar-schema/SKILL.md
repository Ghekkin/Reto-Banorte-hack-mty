---
name: cambiar-schema
description: Cambio completo de un contrato compartido - un schema de tool en packages/schemas o el schema de props de un componente en packages/catalogo - y, en el mismo commit, todo lo que depende de él (tool, mock, tests, componente, prompt del agente). Invocar antes de tocar packages/schemas o packages/catalogo/*/schema.ts.
---

# Cambiar un contrato

Hay dos contratos compartidos y los dos tienen consumidores en ambos lados:

| Contrato | Vive en | Lo consumen |
|---|---|---|
| Schema de una **tool** (input/output) | `packages/schemas` | La tool en `apps/mcp`, el agente en `apps/web` |
| Schema de props de un **componente** A2UI | `packages/catalogo/src/<nombre>/schema.ts` | El componente React, el JSON del catálogo que ve el agente, el prompt |

Cambiarlos a medias deja a un lado hablando un idioma que el otro no entiende. Por eso:
**un cambio de contrato no está terminado hasta que todos sus consumidores cambiaron**,
en un solo commit.

## Antes

1. `scripts/sync.sh` para estar al día: son los archivos con más probabilidad de conflicto.
2. Si no eres `contrato`, avisa al dueño en una línea. Puedes seguir sin esperar.

## Pasos

1. **Schema**: cambia campos. Si agregas uno y no vas a terminar los consumidores
   ahora, hazlo **opcional** para que nada se rompa mientras tanto.
2. **Consumidores**, según el contrato:
   - Tool: la tool y su mock producen el campo (skill `datos-mock`); su test valida.
   - Componente: el componente lo usa (con fallback si es opcional); el `.jsonl` de
     ejemplo lo incluye; el JSON del catálogo se regenera (es derivado del schema, no
     se edita a mano); si cambia cuándo usarlo, el README del componente y una línea
     del prompt.
3. **`pnpm typecheck`** desde la raíz. No se commitea con typecheck en rojo.
4. **Doc**: `docs/como-funciona/<nombre>.md`, sección "Entradas y salidas" o "Props".
5. **Commit único** con `scripts/sync.sh "contrato: <nombre> agrega <campo>"`.
6. Línea en `docs/bitacora/equipo.md`: los demás necesitan saber que el contrato cambió.

## Nunca

- Renombrar un componente o una tool existente. Se crea el nuevo y se deprecia el
  viejo en el doc.
- Definir tipos "temporales" en `apps/web` o `apps/mcp` para saltarse el paquete.
- Editar a mano el JSON del catálogo: se genera del schema.
- Cambiar el schema y "luego" el otro lado.
