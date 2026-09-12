# `PlanDePago`

**Cuándo lo elige el agente**: la persona quiere pagar menos intereses y el agente ya
llamó `simular_reestructura`. Es **el componente del flujo accionable** de la fase 1: lo
que se elige aquí es lo que `aplicar_plan_pago` cambia de verdad.

## Props

| Prop | Para qué |
|---|---|
| `opciones[]` | `{ plazoMeses, mensualidadCentavos, cat, ahorroCentavos, recomendado? }`, de `simular_reestructura.opciones` |
| `plazoElegido` | Preselección; default el recomendado |
| `tarjetaId` | Viaja en el `context` de la acción |
| `etiquetaBoton` | Default "Aplicar plan" |
| `ancho`, `razon` | Comunes |

## Acciones

`aplicar_plan_pago`. El componente declara `action.event.name = "aplicar_plan_pago"`;
al confirmar, el renderer manda el `context` declarado más `{ plazoMeses }` elegido y la
`idempotencyKey`. El agente llama la tool y repinta con `Confirmacion` + `Calendario`.

**La selección del plazo vive en el componente** (estado de interfaz, no de negocio): ir
al agente por cada clic en un radio sería un turno completo por toque. Solo la
confirmación viaja.

## El número grande es el ahorro

No la mensualidad: el dato que decide la conversación es "te ahorras $132,065 frente a
pagar el mínimo", y cambia al mover la selección, así que la tarjeta responde al toque sin
ir al agente. La mensualidad de cada plazo va en su fila, alineada a la derecha con
`shrink-0`, para que a 360 px el nombre se recorte antes que el monto.

## Estados

- **Cargando**: skeleton de tres filas hasta que llega `opciones`.
- **Vacío** (`opciones: []`): "No hay planes que cotizar para esta tarjeta".
- **Normal**: radio por plazo, el recomendado con badge, un solo botón primario.

Ejemplo: `ejemplos/plan-de-pago.jsonl`. Primitivas: `card`, `radio-group`, `badge`, `button`.
