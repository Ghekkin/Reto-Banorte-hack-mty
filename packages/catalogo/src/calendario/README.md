# `Calendario`

**Cuándo lo elige el agente**: después de aplicar un plan (los pagos, de
`consultar_plan.calendario`) o de crear un apartado (las aportaciones). Genérico a
propósito: el mismo componente sirve a la fase 1 y a la fase 3.

## Props

| Prop | Para qué |
|---|---|
| `titulo` | "Tus próximos pagos" / "Tus aportaciones" |
| `eventos[]` | `{ fecha, montoCentavos, etiqueta?, estado? }` en orden cronológico; `estado`: `proximo` (resaltado), `pendiente`, `pagado`, `aportado` |
| `maximo` | Cuántas filas mostrar (default 6); el resto se resume en una línea |
| `totalCentavos` | La suma, si se quiere al pie |
| `ancho`, `razon` | Comunes |

Sin `estado: proximo` explícito, el próximo es el primer evento que no ha ocurrido.

## Acciones

Ninguna.

## Estados

- **Cargando**: skeleton. **Vacío**: "Todavía no hay fechas programadas". **Normal**: tabla
  corta con el próximo resaltado en tinte.

Ejemplo: `ejemplos/calendario.jsonl`. Primitivas: `card`, `table`, `scroll-area`, `badge`.
