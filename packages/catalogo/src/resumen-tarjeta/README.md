# `ResumenTarjeta`

> **Encargo del scaffold, todavia sin construir.** Dueno: rol `web`.
> Fase 1 y 2 del ADR 0004. Orden obligatorio y checklist: skill `ui-generativa`.
> Cuando exista, este README describe lo real y se borra este aviso.

**Cuando lo elige el agente**: El usuario pregunta por su tarjeta, su deuda o sus intereses, y el agente necesita poner la situacion en una sola cifra.

## Props previstas

Ademas de las comunes (`ancho`, `razon`, y `heroe` donde aplique):

| Prop | Para que |
|---|---|
| `mascara` | Los cuatro digitos: '•••• 4821' |
| `saldoCentavos` | Lo que debe hoy |
| `limiteCentavos` | Su limite; con el saldo sale el % de uso |
| `pagoMinimoCentavos` | Pago minimo del periodo |
| `diasMora` | Dias de atraso; > 0 cambia el tono a urgencia |
| `planActivo` | true tras `aplicar_plan_pago`: pinta el badge 'Plan activo' |
| `heroe` | Esta es LA tarjeta heroe de la fase 1: degradado de marca, texto blanco |

## Acciones

Ninguna. Es lectura; las acciones viven en PlanDePago.

## Primitivas de shadcn

progress para el % de uso, badge para el estado, card con el degradado de marca.

## Archivos que faltan

- `schema.ts` — Zod con `.describe()` en cada prop (es lo que el modelo lee).
- `componente.tsx` — React sobre shadcn, tres estados, cero hex.
- `../../ejemplos/resumen-tarjeta.jsonl` — el mensaje a mano que lo pinta.
- Registro en `src/index.ts` y linea en `docs/como-funciona/`.
