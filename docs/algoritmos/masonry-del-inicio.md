---
verificado: 2026-09-13 02:15
implementado-en: apps/web/src/components/inicio/masonry.tsx, apps/web/src/components/maya/lienzo.tsx (MasonryDeLienzo), apps/web/src/lib/rejilla.ts (tamanoDePieza)
lenguaje: typescript
---

# Masonry del Inicio: cómo se acomodan las tarjetas sin dejar huecos

## Para cualquiera

Las tarjetas de Inicio no miden lo mismo: una conclusión ocupa 290 px de alto, una gráfica
de gasto por categoría 450, el detalle de una categoría 480. Cuando se acomodan **en filas**
—como estaban hasta ahora— la siguiente fila no empieza debajo de cada tarjeta, sino debajo
de la **más alta** de la fila anterior. Junto a una tarjeta de 480 px, una de 290 deja
190 px de lienzo gris muertos, y con tres columnas eso pasa dos veces por fila.

Un **masonry** es lo que hace Pinterest: cada tarjeta empieza justo donde terminó la de
arriba en su misma columna, así que no quedan escalones. La pantalla se ve compacta y caben
más cosas sin scroll.

La forma de conseguirlo en un navegador es un truco: en vez de una rejilla de filas
grandes, se hace una rejilla de **franjas de 4 px** y cada tarjeta ocupa las franjas que
necesita según su alto. CSS coloca cada tarjeta en el primer hueco libre recorriendo de
arriba a abajo, y ese hueco resulta ser siempre el fondo de la columna que se quedó corta:
o sea, un masonry, sin cambiar el orden en que se leen las tarjetas.

Hay una regla más, y es la que evita que la pantalla se vea rota: **todas las tarjetas de
una pantalla miden lo mismo de ancho.** Si una midiera media pantalla y otra un tercio, la
suma no cerraría y quedaría una franja gris vertical atravesando todo el lienzo.

## La idea

Tres decisiones, y las tres se pagan con una línea de CSS o con una medición:

1. **Filas de 4 px** (`grid-auto-rows: 4px`, `row-gap: 0`). El hueco entre tarjetas ya no lo
   pone el `gap`: lo pone el sobrante del redondeo. Si una tarjeta mide 387.67 px y el
   `gap` del sistema es 16, ocupa `ceil((387.67 + 16) / 4) = 101` franjas = 404 px, y el
   hueco visible queda en 16.33 px. Nunca menos que el `gap`, nunca más de `gap + 4`.
2. **Rejilla base de 6 columnas.** No de 3. Con 3 columnas, una tarjeta ancha tenía que
   ocupar 2, y la portada típica de Maya —tres tarjetas anchas— dejaba la tercera columna
   entera vacía. Con 6, una tarjeta ancha son 3 (media rejilla) y dos caben lado a lado.
3. **Un solo ancho por pantalla**, el de la tarjeta que más necesita. Es lo único que
   garantiza que la fila cierre (3+3 o 2+2+2). Una rejilla de spans fijos no puede crecer
   para llenar el sobrante; un `flex` sí, y por eso el lienzo de la conversación sigue
   usando filas flexibles (`docs/algoritmos/acomodo-del-lienzo.md`).

El JS es inevitable: cuántas franjas ocupa una tarjeta depende de su alto, y el alto solo lo
sabe el navegador. `grid-template-rows: masonry` no está en ningún navegador estable, y la
alternativa sin JS (`columns`) obliga a que todas las tarjetas midan lo mismo de ancho
—hasta ahí bien— pero ordena de arriba a abajo **por columna**, así que la segunda tarjeta
en importancia aparece al fondo de la primera columna.

## Paso a paso

1. `Masonry` recibe las tarjetas ya pintadas como hijos. Cada hijo declara cuánto ocupa a lo
   ancho con `data-hueco`: `normal`, `amplio` o `completa`. Lo que no declara nada es
   `normal`.
2. `anchoComun` mira todos los huecos: si alguno es `amplio`, **todos** se pintan `amplio`.
   `completa` se respeta siempre (una fila entera para sí).
3. Cada hijo se envuelve en dos divs: la **celda** (el elemento de la rejilla, es quien
   recibe el `col-span` y el `grid-row-end`) y dentro el div `[data-medida]`, que es lo que
   se mide. Son dos y no uno porque la celda tiene el alto que le acabamos de imponer: si se
   midiera ella, el `ResizeObserver` leería su propia escritura y entraría en bucle.
4. Al montar, y antes del primer pintado (`useLayoutEffect`), se mide cada `[data-medida]`:
   `filas = ceil((alto + gap) / 4)`, y se escribe `grid-row-end: span <filas>` en la celda.
   El `gap` no está escrito en el código: se lee del `column-gap` computado, así que cambia
   solo cuando cambia el breakpoint.
5. Una celda vacía (alto 0 y sin texto: `ListaTarjetas` devuelve `null` para quien no tiene
   crédito) se pone `display: none`. Sin esto ocuparía una franja de 4 px en su columna y
   empujaría a la siguiente tarjeta.
6. Cuando ya se midió al menos una tarjeta, la rejilla pasa a modo masonry: `gridAutoRows:
   4px` y `rowGap: 0` como estilos en línea. Antes de eso —y si el JS nunca corre— es la
   rejilla de filas de siempre con su `gap`: **degrada a lo anterior, no a algo roto**.
7. Un `ResizeObserver` vigila el contenedor (cambio de ancho, cambio de columnas) y el
   contenido de cada celda (una gráfica de Recharts que llega tarde, una fuente que termina
   de cargar). Vuelve a medir, pero **en el siguiente fotograma**, no dentro del callback.
8. Las columnas se deciden contra el ancho de la **rejilla** (`@container/rejilla`), no de la
   pantalla: con la sidebar de 16rem puesta, la pantalla en `md` (768 px) deja un área de
   contenido de ~490 px, y dos columnas ahí medirían 235 px cada una.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| Tarjetas | `React.ReactNode[]` (hijos de `Masonry`) | las 4 de la portada programada |
| Ancho declarado | `data-hueco` en el hijo directo | `"amplio"` en el héroe |
| Alto real | `[data-medida].getBoundingClientRect().height` | 387.67 px |
| Ancho de la rejilla | `@container/rejilla` | 1,139 px a 1,440 de pantalla |

| Salida | Tipo | Ejemplo |
|---|---|---|
| Columnas por celda | clase de Tailwind | `@2xl/rejilla:col-span-6 @5xl/rejilla:col-span-3` |
| Franjas por celda | `grid-row-end` en línea | `span 101` |
| Modo | `data-masonry` | `"medido"` / `"sin-medir"` |

En el lienzo de Maya el `data-hueco` no lo escribe nadie a mano: `MasonryDeLienzo` lo
traduce del **tamaño natural del catálogo** (`tamanoDePieza`), no del `ancho` que mandó el
agente. Por eso la marca es `data-hueco` y no `data-ancho`: el motor A2UI ya pinta
`data-ancho` con el valor del agente, que puede contradecir al natural.

| `tamanoDePieza` | `data-hueco` |
|---|---|
| `compacta` | `normal` |
| `amplia` | `amplio` |
| `completa` | `completa` |

## Parámetros y umbrales

| Número | Dónde | De dónde sale y qué pasa si se mueve |
|---|---|---|
| 4 px de franja | `UNIDAD_FILA` | El hueco visible queda entre `gap` y `gap + 4`: medido 16.33 / 17 / 18.4 / 19 px. Con 8 px se iba a 20–23, que ya se nota junto a un `gap-4`. Con 1 px la rejilla tendría miles de franjas y el layout se siente en un portátil |
| 6 columnas | `grid-cols-6` | Es el mínimo común de 2 y 3: permite tercios (2 de 6) y mitades (3 de 6). Con 3 columnas, tres tarjetas anchas dejaban 385 px vacíos a 1,440 px |
| `@2xl` (42rem = 672 px) | segunda columna | A 672 px, dos tarjetas de un tercio miden 328 px: por encima del mínimo de 18rem del acomodo del lienzo. Con `md:` (768 px de **pantalla**) medían 235 px |
| `@5xl` (64rem = 1,024 px) | tercera columna | A 1,024 px, tres tarjetas de un tercio miden 330 px; una ancha, 503 px, por encima del mínimo de 26rem |
| Ancho común | `anchoComun` | Anchos mixtos suman 5 de 6 y dejan una franja gris vertical de 193 px (medido a 1,440 px con héroe amplio + "Tus cuentas" normal: 946 de 1,139 px ocupados) |
| `requestAnimationFrame` en el observador | `masonry.tsx` | Medir y escribir dentro del callback produce `ResizeObserver loop completed with undelivered notifications` en consola (se vio tras cada rebuild de Fast Refresh el 2026-09-13) |

## Límites y supuestos

- **El borde inferior queda irregular**, y eso es correcto: es el aspecto de cualquier
  masonry. Lo que se eliminó son los huecos *entre* tarjetas y la franja vertical, no el
  escalón del final.
- **No se reordena para llenar huecos.** El orden es el que decidió el agente: la persona lee
  en el orden en que le contaron la historia. CSS coloca cada tarjeta en el primer hueco
  libre a partir de su posición, no en el hueco "óptimo".
- **Una tarjeta compacta en una pantalla con gráfica se pinta a 561 px** en vez de 369. Es el
  precio del ancho común. No es un problema porque cada tarjeta se acomoda contra su propio
  ancho (`@container/tarjeta`), así que usa el espacio en vez de estirarse vacía.
- **Sin JS es la rejilla de filas de antes.** No hay masonry en el HTML del servidor: el
  primer pintado sale con `gap` normal y las franjas se aplican en el mismo fotograma
  (`useLayoutEffect`), así que no se ve el salto.
- **Una tarjeta cuyo contenido cambia de alto sin cambiar de tamaño observable** (por
  ejemplo, un `position: absolute` que crece) no dispara al observador. No pasa con ningún
  componente del catálogo.
- **La conversación (`/maya`) NO usa esto**: sigue con filas flexibles, donde las tarjetas
  crecen para llenar la fila. El masonry se pidió para Inicio, que es donde hay varias
  tarjetas de altos muy distintos.

## Cómo se probó

- `apps/web/src/lib/__tests__/masonry.spec.ts` (17 pruebas): que cada tarjeta tenga su celda
  con el div que se mide, que las columnas se decidan por contenedor y no por pantalla, que
  ningún `col-span` quede suelto (en una rejilla de 1 columna, un `span 3` crea columnas
  implícitas y la tarjeta se sale de la pantalla), que todas las celdas compartan ancho, que
  el hueco del lienzo salga del tamaño natural y no del `ancho` del agente —con el turno real
  `fixtures/turno-beto-deudas.jsonl`, donde el agente mandó `ancho: "amplio"` a una tarjeta
  compacta—, y que el acomodo por omisión del lienzo siga siendo el de filas.
- En el navegador, a 1,439 px y 390 px, con los datos reales de Ana y Beto y turnos reales
  del modelo (2026-09-13 01:45–02:15):

| Medición | Antes | Después |
|---|---|---|
| Hueco vertical entre tarjetas | 20.4–22.9 px | **16.3 / 17.0 / 18.4 / 19.0 px** |
| Ancho ocupado (3 tarjetas anchas, rejilla de 1,139 px) | 754 px | **1,138 px** |
| Ancho ocupado (héroe ancho + tarjeta normal) | 946 px | **1,138 px** |
| Ancho ocupado durante la carga (esqueleto) | 946 px | **1,138 px** |
| `scrollWidth` vs `clientWidth` | igual | **igual** (sin scroll horizontal) |
| Columnas a 390 px | 1 | **1** |
| `ResizeObserver loop…` en consola | 1 por rebuild | **no aparece** |
