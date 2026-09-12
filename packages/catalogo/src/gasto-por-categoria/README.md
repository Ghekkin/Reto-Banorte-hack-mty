# `GastoPorCategoria`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 2 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: '¿En que se me va el dinero?'. El agente ya comparo periodos y sabe cual categoria se salio de lo normal.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `periodo` | 'Agosto 2026' |
| `totalCentavos` | El total del periodo |
| `categorias` | Arreglo de { categoria, montoCentavos, variacion } |
| `categoriaAtipica` | La que se salio de su patron; se pinta en rojo, el resto en plata |
| `ancho` | Siempre 'amplio': la grafica pide dos columnas |

## Acciones

`ver_categoria` con la categoria tocada (solo vista).

## Primitivas de shadcn

chart (Recharts) con el par --chart-1 / --chart-2. Nunca arcoiris.

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/gasto-por-categoria.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
