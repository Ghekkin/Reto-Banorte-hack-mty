# `SimuladorMeta`

**Cuándo lo elige el agente**: la persona no tiene deuda (o ya la resolvió) y quiere
ahorrar. Es **la respuesta adaptativa de Ana** y el componente de la **segunda acción
real** de la demo: el botón dispara `crear_apartado`. Los números iniciales salen de
`proyectar_ahorro`.

## Props

| Prop | Para qué |
|---|---|
| `nombre` | "Fondo de emergencia" |
| `metaCentavos`, `saldoInicialCentavos` | Objetivo y lo que ya lleva (`montoObjetivoCentavos`, `saldoInicialCentavos` de la tool) |
| `aportacionCentavos` | Posición inicial del slider (la sugerida por la tool) |
| `aportacionMinimaCentavos`, `aportacionMaximaCentavos` | Piso y tope del slider; el tope es `capacidadMensualCentavos` |
| `frecuencia` | `mensual` \| `quincenal` |
| `fechaInicio` | Desde dónde se cuenta; default hoy |
| `etiquetaBoton` | Default "Crear apartado" |
| `ancho`, `razon` | Comunes |

## Acciones

`crear_apartado` con `{ nombre, montoObjetivoCentavos, aportacionCentavos, frecuencia }`
más el `context` declarado y la `idempotencyKey`. El agente llama la tool y repinta con
`Confirmacion` + `MetaActiva`.

## Por qué la fecha se calcula en el componente

El slider mueve la aportación y la fecha se recalcula **aquí**: es una división
(faltante entre aportación por mes, sin rendimiento), la misma regla de
`docs/algoritmos/proyeccion-de-ahorro.md`. Ir al agente por cada tick sería un turno por
píxel. El número autoritativo vuelve de la tool después de la acción.

## Estados

- **Cargando**: skeleton hasta que llegan meta, aportación y tope.

Ejemplo: `ejemplos/simulador-meta.jsonl`. Primitivas: `card`, `slider`, `button`.
