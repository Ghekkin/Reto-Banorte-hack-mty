# `SimuladorMeta`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 3 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: El usuario no tiene deuda y quiere empezar a ahorrar: el agente le deja mover cuanto aporta y ver cuando llega.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `metaCentavos` | A cuanto quiere llegar |
| `aportacionCentavos` | Lo que aportaria cada periodo; es lo que el slider mueve |
| `aportacionMaximaCentavos` | Tope del slider, calculado con su capacidad de ahorro |
| `fechaEstimada` | Cuando llegaria con la aportacion actual |
| `frecuencia` | 'quincenal' | 'mensual' |

## Acciones

`elegir_aportacion` al mover el slider (solo data model) y `crear_apartado` al confirmar (accion 2 de la demo).

## Primitivas de shadcn

slider + input, button primario para crear el apartado.

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/simulador-meta.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
