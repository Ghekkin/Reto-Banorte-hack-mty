# `PlanDePago`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 1 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: El usuario quiere pagar menos intereses. El agente ya llamo `simular_reestructura` y tiene tres opciones que comparar.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `opciones` | Arreglo de { plazo, mensualidadCentavos, cat, ahorroCentavos } |
| `plazoElegido` | El plazo preseleccionado: el que mas le ahorra |
| `recomendado` | Que plazo marcar como recomendado y por que |

## Acciones

`elegir_plazo` al mover la seleccion (solo data model) y `aplicar_plan_pago` al confirmar (muta estado, lleva idempotencyKey).

## Primitivas de shadcn

radio-group para los plazos, button primario (uno solo) para aplicar.

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/plan-de-pago.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
