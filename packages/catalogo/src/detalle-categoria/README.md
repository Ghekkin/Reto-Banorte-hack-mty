# `DetalleCategoria`

**Cuándo lo elige el agente**: la persona tocó una categoría (`ver_categoria`) o pregunta
por un gasto concreto: los movimientos que la componen. Sale de `consultar_movimientos`
con `categoriaId`. Va **junto a** `GastoPorCategoria`, no en su lugar.

## Props

| Prop | Para qué |
|---|---|
| `categoria`, `periodo` | Encabezado |
| `totalCentavos` | La suma de la categoría en el periodo (`sumaCargosCentavos` de la tool) |
| `movimientos[]` | `{ fecha, comercio, descripcion?, montoCentavos, recurrente? }` del más reciente al más viejo |
| `totalMovimientos` | Cuántos hay en total si solo se mandan los primeros (`total` de la tool) |
| `ancho` | Default `amplio` |
| `razon` | Común |

## Acciones

Ninguna. `crear_tope_gasto` quedó fuera de alcance (ADR 0004, "qué NO entra").

## Estados

- **Cargando**: skeleton. **Vacío**: "No hay movimientos de X en este periodo".

**Dos columnas**, por la misma razón que `Calendario`: el comercio y su fecha apilados a la
izquierda, el monto y el sello de recurrente a la derecha. A 360 px no hay scroll
horizontal y el monto —que es lo que se viene a leer— nunca se sale de la pantalla.

Ejemplo: `ejemplos/detalle-categoria.jsonl`. Primitivas: `card`, `table`, `scroll-area`, `badge`.
