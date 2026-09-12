# `GastoPorCategoria`

**Cuándo lo elige el agente**: "¿en qué se me va el dinero?". Ya llamó
`comparar_periodos` y sabe cuál categoría se salió de su patrón. Fase 2 del ADR 0004.

## Props

| Prop | Para qué |
|---|---|
| `periodo` | `2026-08` (se formatea) o ya en palabras |
| `totalCentavos`, `variacionPct` | El total del periodo y su variación contra el anterior |
| `categorias[]` | `{ categoriaId?, nombre, montoCentavos, variacionPct? }`, de mayor a menor |
| `categoriaAtipica` | El **nombre** de la que se salió de su patrón: se pinta en rojo, el resto en plata |
| `ancho` | Default `amplio`: la gráfica pide dos columnas |
| `heroe`, `razon` | Comunes |

## Acciones

`ver_categoria`: tocar una barra manda `{ categoriaId, categoria }` más lo que el agente
haya puesto en el `context` (el periodo, típicamente). Solo vista: el agente llama
`consultar_movimientos` y repinta con `DetalleCategoria` al lado.

## Diseño

Gráfica de barras horizontales con `chart` (Recharts): dos tonos, **nunca arcoíris**. La
atípica en `--chart-2` (rojo), el resto en `--chart-4` (plata). Debajo, una frase con la
atípica y su brinco.

## Estados

- **Cargando**: skeleton con el hueco de la gráfica. **Vacío**: "No hay gasto registrado".

Ejemplo: `ejemplos/gasto-por-categoria.jsonl`. Primitivas: `card`, `chart`, `skeleton`.
