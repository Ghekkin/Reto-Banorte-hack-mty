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
| `orden` | Variante de vista: `monto` (default) · `variacion` · `nombre` |
| `limite` | Variante de vista: cuántas filas se listan tras ordenar; el resto se agrupa |
| `ancho` | Default `amplio`: la gráfica pide dos columnas |
| `heroe`, `razon` | Comunes |

## Variantes: `orden` y `limite`

Las dos son props de **vista**, no de datos, y existen para el ciclo live
(`docs/como-funciona/ciclo-live.md`): "ordenénalo por variación" o "solo las 3 más grandes" no es otra
pantalla ni otra consulta, es la misma tarjeta vista de otra forma. El agente las cambia con
`ajustar_pantalla` y la tarjeta se reordena sin volver a pedir nada al MCP.

`orden: "variacion"` manda al final las categorías **sin** `variacionPct`: una categoría sin dato no
es una que no cambió, y ponerlas en medio mezclaría "no se sabe" con "se quedó igual".

`limite` **no desaparece** lo que deja fuera: lo agrupa en un renglón neutro del pie ("otras 2:
$4,702.00"). Es la única forma de recortar sin romper la invariante de esta tarjeta —que el total del
encabezado cuadre con lo que lista— y sin encender el aviso ámbar "Faltan X sin desglosar", que sigue
reservado para cuando el modelo recortó `categorias` de verdad (ver
`docs/como-funciona/bug-gasto-total-no-cuadra.md`). Por eso el schema insiste en que se manden
**todas** las categorías y se use `limite` para acotar la vista.

## Acciones

`ver_categoria`: tocar una barra manda `{ categoriaId, categoria }` más lo que el agente
haya puesto en el `context` (el periodo, típicamente). Solo vista: el agente llama
`consultar_movimientos` y repinta con `DetalleCategoria` al lado.

## Diseño: una lista con barras, no una gráfica de Recharts

Empezó siendo una gráfica de barras con `chart` (Recharts) y se cambió. La razón no es
estética:

- **Los montos vivían en el tooltip**, y un tooltip **no existe en móvil**. Una tarjeta
  financiera donde no se puede leer una sola cifra sin pasar el mouse rompe la regla
  central del sistema —"el número manda"— justo en el dispositivo donde se va a ver.
- **El área tocable era la barra**, unos pocos píxeles de alto, y de ahí sale la acción
  `ver_categoria`. Ahora la fila completa es el botón, con los 48 px que pide Material.
- A 360 px, el eje de categorías se comía el ancho y truncaba "Intereses y comisiones".

Ahora cada fila trae **el monto siempre visible** (`tabular-nums`), su variación cuando es
significativa (≥ 5 %), y una barra (`progress` de shadcn) que da la proporción de un
vistazo. La barra se mide **contra la categoría más grande**, no contra el total: con seis
categorías, medir contra el total deja todas las barras cortas y no se compara nada.

La atípica va en rojo de marca (`bg-primary`) y en negritas; el resto en plata
(`bg-chart-4`). Dos tonos, nunca arcoíris. Sigue siendo shadcn: `card`, `progress`,
`skeleton`.

`recharts` sigue declarado en el `package.json` del paquete y ya no lo usa nadie: quitarlo
mueve `pnpm-lock.yaml`, y el lockfile está ahora mismo mezclado con la migración del MCP a
Postgres que otra sesión tiene a medias. Se quita cuando eso aterrice.

Es la desviación de un renglón de la skill (`Gráfica → chart`) a favor de sus reglas
duras (el monto visible, 360 px sin scroll, 48 px tocables, legible proyectado), que son
las que dicen "no se negocia". Queda escrito aquí para que sea una decisión y no una
deriva.

## Estados

- **Cargando**: skeleton del alto final. **Vacío**: "No hay gasto registrado en este periodo".

Ejemplo: `ejemplos/gasto-por-categoria.jsonl`. Primitivas: `card`, `progress`, `skeleton`.
