# `GastoPorCategoria`

**Cuándo lo elige el agente**: "¿en qué se me va el dinero?". Ya llamó
`comparar_periodos` y sabe cuál categoría se salió de su patrón. Fase 2 del ADR 0004.

## Props

| Prop | Para qué |
|---|---|
| `periodo` | `2026-08` (se formatea) o ya en palabras |
| `totalCentavos`, `variacionPct` | El total del periodo y su variación contra el anterior |
| `categorias[]` | `{ categoriaId?, nombre, montoCentavos, variacionPct?, fueraDelBanco?, guardado?, frecuencia? }`, de mayor a menor, las de fuera del banco incluidas |
| `categoriaAtipica` | El **nombre** de la que se salió de su patrón: se pinta en rojo, el resto en plata |
| `orden` | Variante de vista: `monto` (default) · `variacion` · `nombre` |
| `limite` | Variante de vista: cuántas filas se listan tras ordenar; el resto se agrupa |
| `antes` | `{ totalCentavos }`: el total antes de sumar gastos de fuera. Acepta el `antes` de la tool entero |
| `aviso` | El `aviso` de `simular_gasto_externo`, tal cual; en ámbar |
| `etiquetaBoton` | Default «Guardar gasto» |
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

## Gastos de fuera del banco (ajuste en vivo, 2026-09-13)

Con la tarjeta en pantalla, «también le doy $2,000 al mes a mi mamá en efectivo» no pinta otra
tarjeta. El agente llama `simular_gasto_externo` y ajusta ESTA: `totalCentavos` y `categorias` con
los de `despues` (la suma sigue dando el total), `antes` con `antes`, y `aviso` si no es null.

| Momento | Qué se ve |
|---|---|
| Simulado (`guardado: false`) | Fila «Apoyo a mi mamá $2,000.00» con badges «Fuera del banco» y «sin guardar» y «cada mes»; el total y la fila se resaltan 1.5 s (`usarCambio`); «$33,349.50 → $35,349.50 · +$2,000.00 fuera del banco»; aviso ámbar si lo hay; botón «Guardar gasto» |
| Guardado (`guardado: true`) | La misma fila solo con «Fuera del banco»; sin botón |

Reglas:

- **La fila de fuera no es botón**: `ver_categoria` abre movimientos, y lo que dijo la persona no
  tiene.
- Mientras la línea antes → después está, **se oculta la variación contra el mes anterior**: medía
  solo lo del banco y ya no es la del total que se ve.
- **Una fila sin guardar va arriba de la lista y nunca se agrupa en «otras N»** por `limite`: al
  final de doce categorías quedaba debajo del scroll. Ya guardada vuelve a su lugar y se agrupa como
  cualquier otra.
- «Guardar gasto» es el único botón primario de la tarjeta.

Ejemplos: `ejemplos/variantes/gasto-por-categoria-simulado.jsonl` y `…-guardado.jsonl` (fuera del
few-shot del prompt; la galería `/catalogo` sí los pinta). Con el ejemplo enlazado al data model,
`totalCentavos` y `categorias` se parchean con `parchesDatos` (`/gasto/totalCentavos`,
`/gasto/categorias`) y `antes`/`aviso` con `parchesComponentes`.

## Acciones

Dos, y el orden importa (`acciones: ["ver_categoria", "registrar_gasto_externo"]`):

- `ver_categoria` es la `action` de la tarjeta (la default que pone el host): tocar una fila del
  banco manda `{ categoriaId, categoria }` más lo que el agente haya puesto en el `context` (el
  periodo, típicamente). Solo vista: el agente llama `consultar_movimientos` y repinta con
  `DetalleCategoria` al lado.
- `registrar_gasto_externo` la dispara «Guardar gasto» como segunda acción declarada
  (`alAccionar(contexto, "registrar_gasto_externo")`; el motor la deja pasar porque
  `registrarCatalogo()` la registra con `definirAcciones`). Su `context` es
  `{ gastos: [{ nombre, montoCentavos, frecuencia }], periodo }` con las filas sin guardar, sin los
  enlaces del `context` de `ver_categoria`. Una fila sin `frecuencia` va como `"mensual"`; `periodo`
  solo si la prop es `AAAA-MM`.

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
