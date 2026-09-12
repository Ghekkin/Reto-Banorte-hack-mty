# `MetaActiva`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 3 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: Ya existe un apartado: cuanto lleva, cuanto falta y cuando cae el primer cargo.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `nombre` | 'Fondo de emergencia' |
| `metaCentavos` | El objetivo |
| `acumuladoCentavos` | Lo que lleva |
| `proximoCargoFecha` | Cuando se aparta lo siguiente |
| `proximoCargoCentavos` | Cuanto |

## Acciones

`ver_detalle_meta` opcional.

## Primitivas de shadcn

progress para el avance; card normal (el heroe ya lo tomo otro).

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/meta-activa.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
