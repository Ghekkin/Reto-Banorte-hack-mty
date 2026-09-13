---
verificado: 2026-09-12 23:58
implementado-en: apps/web/src/lib/periodos.ts
lenguaje: typescript
---

# Agrupación de movimientos por periodo

## Para cualquiera

Nadie busca "12 de agosto" en su estado de cuenta. Se busca **"lo de esta semana"**, "lo
del mes pasado", "lo de ayer". Una lista de 300 renglones con la fecha en cada uno obliga
a hacer esa cuenta mentalmente, renglón por renglón.

Este algoritmo parte la lista en bloques con el nombre que la gente ya usa: *Hoy*, *Ayer*,
*Esta semana*, *Semana pasada*, *Este mes*, *Mes pasado*, y de ahí para atrás el nombre
del mes (*Julio*, *Noviembre 2025*). Cada bloque lleva su propio neto a la derecha, así
que "cuánto se me fue esta semana" se contesta sin sumar nada.

La parte que no es obvia: esos periodos **se traslapan** entre sí. El 31 de agosto puede
ser a la vez "del mes pasado" y "de la semana pasada". Lo que decide es el orden en el que
se preguntan, y ese orden es el algoritmo.

## La idea

Se prueba de lo **más específico a lo más general**, y el primer periodo que acepta la
fecha se queda con ella. Por eso ningún movimiento aparece dos veces y ninguno se queda
sin bloque.

El orden importa por una razón concreta: la unidad más cercana a lo que la persona recuerda
gana. "Ayer" es más útil que "semana pasada" para el mismo movimiento, y "semana pasada" es
más útil que "mes pasado".

La semana **empieza en lunes**, como en México, no en domingo.

El "hoy" contra el que se mide **entra como parámetro**, nunca se lee el reloj dentro de la
función. Son dos razones: se puede probar (un `new Date()` dentro haría la prueba caducar
al día siguiente) y el servidor de producción corre en UTC+2, donde a las 6 de la tarde de
Monterrey ya es el día siguiente; si el servidor y el navegador calcularan cada uno su
propio "hoy", el HTML no coincidiría y React marcaría un error de hidratación. Lo calcula
la página con `hoyEnZona()`, en `America/Monterrey`, y lo pasa como prop.

## Paso a paso

Para una fecha `f` y un `hoy`:

1. `f > hoy` → **Próximos días**. No hay movimientos futuros en los datos, pero una fecha
   futura disfrazada de "Hoy" sería una mentira silenciosa.
2. `f === hoy` → **Hoy**.
3. `f === hoy − 1 día` → **Ayer**.
4. `f >= lunes de la semana de hoy` → **Esta semana**.
5. `f >= ese lunes − 7 días` → **Semana pasada**.
6. `f` es del mismo mes calendario que `hoy` → **Este mes**.
7. `f` es del mes calendario anterior → **Mes pasado**.
8. En cualquier otro caso → el nombre del mes: **Julio** si es del mismo año que hoy,
   **Noviembre 2025** si no.

Y para armar los grupos:

1. Ordena una copia de los movimientos de más reciente a más antiguo. La consulta ya los
   entrega así, pero la función no depende de eso para ser correcta.
2. Recorre la lista y le pide a cada movimiento su periodo. La primera vez que aparece una
   clave se crea el grupo; el orden de creación es el orden en el que se pintan.
3. Acumula el neto del grupo: `+ monto` si es abono, `− monto` si es cargo.

El recorrido descendente más el orden de las comparaciones garantizan que los grupos salgan
del más reciente al más antiguo sin ordenarlos después.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `movimientos` | lista con `fecha`, `tipo`, `montoCentavos` | los 300 de `movimientosDe()` |
| `hoy` | `AAAA-MM-DD` | `2026-09-12` |

| Salida (por grupo) | Tipo | Ejemplo |
|---|---|---|
| `clave` | texto estable | `hoy`, `semana-pasada`, `mes-2026-07` |
| `etiqueta` | texto visible | `Hoy`, `Semana pasada`, `Julio` |
| `movimientos` | lista | los del periodo, en el orden de entrada |
| `netoCentavos` | entero con signo | `−497000` (se gastó más de lo que entró) |

`totalizar()` es la otra mitad: devuelve `gastadoCentavos` y `recibidoCentavos` por
separado, que es lo que pinta la tarjeta de arriba. Van separados a propósito: un solo neto
esconde que entraron $104,850 y salieron $121,603.

## Parámetros y umbrales

Este algoritmo no tiene umbrales que calibrar. Lo que sí tiene son dos convenciones:

| Decisión | Valor | Qué pasa si se mueve |
|---|---|---|
| Primer día de la semana | lunes | Con domingo, "esta semana" incluiría el domingo anterior y no coincidiría con lo que la persona llama semana |
| Zona horaria del "hoy" | `America/Monterrey` | Con la del servidor (UTC+2), de las 6 de la tarde en adelante todo se corre un día: lo de hoy aparecería en "Ayer" |

## Límites y supuestos

- **"Este mes" puede quedar vacío, y está bien.** Cuando el lunes de esta semana cae cerca
  del día 1 (o antes), las dos semanas cubren todo el mes y no queda ningún día suelto: el
  grupo simplemente no se pinta. No es un bug, es la consecuencia de que la semana gana
  sobre el mes.
- **"Esta semana" puede contener días del mes anterior.** Si hoy es miércoles 2, el lunes
  fue el 31. Ese movimiento sale bajo "Esta semana", que es donde la persona lo busca.
- **El neto mezcla cargos y abonos.** Un periodo con la nómina dentro sale en positivo
  aunque se haya gastado mucho. Es correcto —es un neto— pero no es "lo que gasté": eso
  está en la tarjeta de arriba, con las dos cifras por separado.
- **Los grupos se calculan sobre lo que se filtró**, no sobre el total. Con dos categorías
  marcadas, el neto de "Mes pasado" es el de esas dos categorías. Es lo que hace que el
  filtro sirva para contestar "cuánto llevo en restaurantes".
- **La lista que llega al cliente está topada en 300** (`TOPE_MOVIMIENTOS`), así que los
  meses más viejos salen incompletos. El renglón de arriba lo dice literal: "los 300 más
  recientes de 821". Si algún día hace falta el historial completo, el filtro se mueve al
  servidor.
- **No hay zona horaria por movimiento.** Las fechas del dominio son `AAAA-MM-DD` sin hora;
  las comparaciones son de texto, que para ese formato es igual a comparar fechas.

## Cómo se probó

`apps/web/src/lib/__tests__/periodos.spec.ts`, 19 pruebas. Las que importan:

- **Ninguna fecha se queda sin periodo y ninguna clave se repite**: recorre 365 días hacia
  atrás y comprueba que la secuencia de claves no tenga repeticiones (si un rango se
  traslapara mal, una clave reaparecería después de otra).
- "Ayer" gana sobre "Semana pasada" cuando hoy es lunes y ayer fue domingo.
- El 31 de agosto, con hoy = sábado 12 de septiembre, sale como **Semana pasada** y no como
  Mes pasado.
- Con hoy = sábado 12, **"Este mes" no aparece** para ningún día de septiembre; con hoy =
  domingo 20, el día 6 sí cae en "Este mes".
- Una fecha futura no se disfraza de "Hoy".
- `hoyEnZona()` con `2026-09-13T03:00:00Z` devuelve `2026-09-12` en Monterrey y
  `2026-09-13` en UTC: es la prueba de que el desfase existe y está manejado.
- El agrupador no pierde ni duplica movimientos, y el neto es abonos menos cargos.

Y en el navegador, sobre `/movimientos` con los datos de Beto: ocho grupos (`Hoy`, `Ayer`,
`Esta semana`, `Semana pasada`, `Mes pasado`, `Julio`, `Junio`, `Mayo`) con sus netos, sin
"Este mes" —que es exactamente el caso de borde de arriba, con hoy = sábado.
