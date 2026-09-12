# `Calendario`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 1 y 3 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: Despues de aplicar un plan o crear una meta: cuando y cuanto toca pagar o aportar. Generico a proposito.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `titulo` | 'Tus proximos pagos' / 'Tus aportaciones' |
| `eventos` | Arreglo de { fecha, montoCentavos, etiqueta, estado } |
| `resaltarPrimero` | Marca el proximo evento |

## Acciones

`ver_detalle_plan` opcional.

## Primitivas de shadcn

table dentro de scroll-area; badge para el estado de cada fila.

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/calendario.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
