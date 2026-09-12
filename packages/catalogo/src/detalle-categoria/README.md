# `DetalleCategoria`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 2 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: El usuario toco una categoria y quiere ver los movimientos que la componen.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `categoria` | El nombre de la categoria |
| `totalCentavos` | Suma del periodo |
| `movimientos` | Arreglo de { fecha, comercio, montoCentavos, recurrente } |
| `ancho` | 'amplio' |

## Acciones

`crear_tope_gasto` (opcional, ultima en la lista del ADR 0004).

## Primitivas de shadcn

table + scroll-area; badge 'recurrente' donde aplique.

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/detalle-categoria.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
