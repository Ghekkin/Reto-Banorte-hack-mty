# `ResumenTarjeta`

**Cuándo lo elige el agente**: la persona pregunta por su tarjeta, su deuda o sus
intereses, y hay que poner su situación en una sola cifra. Es **la tarjeta héroe** de la
pantalla de deuda (degradado de marca). Después de `aplicar_plan_pago`, la misma tarjeta
sale con el badge "Plan activo" y el saldo en cero: el cambio real, visible.

Las props salen tal cual de `consultar_tarjeta` (fase 1 y 2 del ADR 0004).

## Props

| Prop | Para qué |
|---|---|
| `mascara` | `•••• 4821` |
| `saldoCentavos` / `limiteCentavos` | Saldo revolvente hoy y límite; con ellos sale el % de uso (`progress`) |
| `pagoMinimoCentavos`, `fechaLimitePago` | Pago mínimo y su fecha; se omiten con plan activo |
| `diasMora` | > 0 pinta el badge "N días de atraso" (oscuro: el rojo es de la marca, no del error) |
| `planActivo`, `mensualidadCentavos` | Tras la acción: badge "Plan activo" y la mensualidad fija |
| `heroe` | Degradado de marca y texto blanco. Solo una por pantalla |
| `ancho`, `razon` | Comunes |

## Acciones

Ninguna: es lectura. Las acciones viven en `PlanDePago`.

## Estados

- **Cargando**: skeleton hasta que llegan `saldoCentavos` y `limiteCentavos`.
- **Con deuda**: uso del límite, pago mínimo, mora.
- **Plan activo**: saldo en cero y la mensualidad; sin barra de uso (ya no hay revolvente).

Ejemplo: `ejemplos/resumen-tarjeta.jsonl`. Primitivas: `card`, `badge`, `progress`, `skeleton`.
