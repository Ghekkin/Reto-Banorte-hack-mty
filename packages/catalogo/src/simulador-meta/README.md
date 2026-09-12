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

## El número grande es la fecha

Es lo que la persona viene a ver y lo que cambia al arrastrar el slider. El objetivo y lo
que ya lleva quedan como contexto arriba, en una línea. El slider lleva `py-3` para tener
los 48 px de alto tocable sin engordar la barra.

## Estados

- **Cargando**: skeleton hasta que llegan meta, aportación y tope.

Ejemplo: `ejemplos/simulador-meta.jsonl`. Primitivas: `card`, `slider`, `button`.

## Como tarjeta héroe (`heroe: true`)

Para quien no tiene deuda, el simulador **es** la tarjeta principal de la pantalla: no hay
saldo que resumir, hay una meta. Por eso acepta `heroe` desde el 2026-09-12 (issue #14).

En la variante héroe va el degradado de marca y **todos los controles pasan a blanco**,
porque el slider y el botón rojos de siempre serían rojo sobre rojo:

| Pieza | Normal | Héroe |
|---|---|---|
| Barra "Ya llevas" | indicador rojo | indicador blanco sobre pista `white/30` |
| Slider | rango rojo | rango blanco, pista `white/30`, pulgar con borde blanco |
| Botón "Crear apartado" | píldora roja | píldora clara `bg-white/90 text-primary` (la del sistema de diseño) |
| Texto secundario | `text-muted-foreground` | `text-primary-foreground/80` |

Verificado midiendo los colores computados en el navegador, a 1280 px y a 390 px. Una
sola tarjeta héroe por pantalla, como siempre.

