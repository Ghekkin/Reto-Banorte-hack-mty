---
verificado: 2026-09-13 04:12
estado: construido
---

# La animación de los widgets

## Para cualquiera

Cada tarjeta que Maya construye aparece con una secuencia corta, siempre la misma: la tarjeta
sube y aparece, primero se lee su número principal, después su contenido; las listas se llenan
renglón por renglón, las barras crecen desde cero, la curva de una gráfica se dibuja de
izquierda a derecha (con el valor de cada hito apareciendo cuando la línea llega a él), la dona
gira un poco al asentarse y el medidor de salud financiera se llena. Todo termina en menos de un
segundo. No es adorno: le dice a la persona que esa pantalla se acaba de armar para ella y en qué
orden leerla, y en una gráfica el trazo cuenta la historia (el saldo que baja, el dinero que
crece).

Se diseñó para no costar. Todo lo que se mueve lo mueve la tarjeta gráfica del dispositivo, sin
esperar al código de la aplicación, así que no se traba aunque la página esté ocupada cargando.
En el celular, donde casi todas las tarjetas quedan abajo, cada una espera a que la persona haga
scroll hasta ella para animarse, en vez de hacerlo donde nadie la ve. Quien pidió en su sistema
"reducir movimiento" ve las tarjetas aparecer, sin animación.

En Inicio había además un salto: la pantalla llegaba pintada desde el servidor y, un momento
después, las tarjetas cambiaban de lugar de golpe al acomodarse. Ahora se deslizan a su lugar.

## Técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| La coreografía completa (keyframes, retrasos, pausas, reducir movimiento) | `apps/web/src/app/globals.css`, bloque "Los WIDGETS del catalogo" y tokens `--widget-*`, `--motion-enfatizada`, `--motion-trazo` |
| `animar-tarjeta` en toda tarjeta | `packages/catalogo/src/comunes.ts` → `CLASES_TARJETA`, `CLASES_TARJETA_HEROE` |
| Esperar a verse | `packages/catalogo/src/animacion.ts` → `usarEntradaAlVerse`, llamado en `Tarjeta` (`tarjeta.tsx`) |
| La ventana de las curvas | `packages/catalogo/src/graficas.tsx` → `Grafica`, prop `entrada` (`"trazo"` por omisión) |
| El medidor en dos capas | `packages/catalogo/src/termometro-salud-financiera/componente.tsx` → `GEOMETRIA_MEDIDOR` |
| El deslizamiento de Inicio | `apps/web/src/components/inicio/masonry.tsx` → `deslizarAlMedir` ([algoritmo](../algoritmos/masonry-del-inicio.md)) |
| Pruebas | `packages/catalogo/src/__tests__/animacion.spec.tsx`, `apps/web/src/lib/__tests__/animacion-widgets.spec.ts` |

### Los ganchos

La mayor parte se engancha sola a lo que ya existe (`data-slot` de shadcn); lo demás se marca
con una clase.

| Gancho | Qué anima | Quién lo pone |
|---|---|---|
| `animar-tarjeta` | La superficie, y adentro `card-header`, `card-content`, `card-footer` | `Tarjeta`, siempre |
| `[data-slot=progress-indicator]` | La barra de `Progress` crece desde su inicio (`scaleX`) | Nadie: toda `Progress` dentro de una tarjeta |
| `cifra` | EL número de la tarjeta sube y aparece. **Una por tarjeta** (lo cuida una prueba) | El componente, en su monto principal |
| `animar-filas` | Cada hijo entra 30 ms detrás del anterior; `--fila` baja a lo que va adentro | El componente, en el contenedor de la lista |
| `animar-barra` | Una barra hecha con `div`s crece desde su inicio, con el retraso de su fila | El componente |
| `animar-trazo` | La ventana que abre una curva de izquierda a derecha | `Grafica` con `entrada="trazo"` |
| `animar-dona` | La dona gira 30° y aparece | `DistribucionPortafolio`, con `entrada="ninguna"` en su `Grafica` |
| `animar-arco` + `--barrido` | La capa del arco del medidor gira desde su ángulo en negativo | `TermometroSaludFinanciera` |
| `animar-icono` | Un icono de confirmación hace un pequeño *pop* | `Confirmacion` |

### La coreografía

En ms desde que monta la tarjeta; a todo se le suma `--orden` × 50 ms (`.animar-lista > :nth-child(n)`
lo pone en el lienzo y en Inicio; `usarEntradaAlVerse` lo reescribe al liberar).

| ms | Qué | Duración, curva |
|---|---|---|
| 0 | Superficie: `translateY(10px) scale(.99)` → nada, y aparece | 350, enfatizada |
| 30 | Encabezado | 350, enfatizada |
| 50 | Cifra: `translateY(35%)` → nada | 450, enfatizada |
| 60 | Cuerpo | 350, enfatizada |
| 90 + 30·fila | Filas | 350, enfatizada |
| 100 | Dona | 650, enfatizada |
| 120 (+30·fila en barras) | Trazo, arco, barras | 650, trazo |
| 140 | Pie | 350, enfatizada |

`--motion-enfatizada` es el *emphasized decelerate* de Material 3 (`0.05, 0.7, 0.1, 1`);
`--motion-trazo` (`0.3, 0, 0.1, 1`) queda entre el *standard* de Material 3 y el *fast out, slow
in*. Las bandas siguen la skill `financial-animations`: tarjetas 200–350 ms, datos 400–800 ms,
nada sobre 1,200 ms.

**La ventana de las curvas.** `animar-trazo` tiene `overflow: hidden` y se desliza desde
`translateX(-100% + 60px)`; su único hijo se desliza, con la misma curva y el mismo reloj, desde
`translateX(100% - 60px)`. Las dos se cancelan: la gráfica no se mueve y lo único que avanza es
el borde. Arranca con 60 px abiertos (el `width` del eje Y en las tres gráficas) para que la
escala ya esté cuando empieza la línea. Los puntos y las etiquetas de los hitos no tienen
animación propia: aparecen cuando la ventana llega a ellos.

**El medidor.** Son dos `RadialBarChart` encimados con la misma geometría: abajo el riel
(`fill="transparent"` y `background`), arriba el arco en un `div` `absolute size-48 aria-hidden`.
Ese `div` gira desde `--barrido = -(puntaje/100·180)deg`; la caja del medidor recorta la mitad de
abajo, así que lo que todavía va bajo el horizonte no se ve y se lee como un relleno que avanza.

### Rendimiento: qué se decidió y cómo se midió

- **Solo `transform` y `opacity` sobre elementos HTML.** Medido con la traza de Chromium
  (categoría `blink.animations`, campo `compositeFailed`) en una pantalla de 4 widgets: las 56
  animaciones de la entrada corren en el compositor. La primera versión animaba `clip-path` (la
  cifra y la curva) y elementos del SVG; las 6 de `clip-path` caían al hilo principal
  (`compositeFailed: 8192`, `unsupportedProperties: clip-path`). La prueba
  `animacion-widgets.spec.ts` truena si un `@keyframes widget-*` anima otra propiedad.
- **Recharts sigue con `isAnimationActive={false}`.** Su animación re-renderiza el SVG en React en
  cada fotograma y se volvería a disparar con cada paso de un slider.
- **Las gráficas esperan a su SVG** (`:has(.recharts-surface)`). Recharts dibuja después de medir,
  en el navegador. En Inicio, que llega pintado desde el servidor, la animación arrancaba al
  pintar y terminaba sobre un contenedor vacío: la gráfica aparecía de golpe ("a veces no se ve").
- **`backwards`, nunca `both`**: al terminar, la animación deja de existir y no quedan
  transformaciones vivas.
- **Sin lecturas forzadas al hidratar.** `usarEntradaAlVerse` decide con el primer aviso de un
  `IntersectionObserver` (no con `getBoundingClientRect`) y reinicia con dos
  `requestAnimationFrame`; la hidratación de Inicio ya trae cuadros de 130–240 ms en producción
  (medido con `PerformanceObserver` `long-animation-frame` el 2026-09-13).
- **Una advertencia honesta sobre los números**: se midió en un Chromium sin GPU y en una máquina
  con carga 23 en 12 núcleos. Los milisegundos absolutos no son confiables; lo que sí lo es, y
  es lo que se reporta aquí, es qué animación corre en el compositor y cuántas caen al hilo
  principal.

### Tarjetas fuera de la pantalla (`usarEntradaAlVerse`)

1. Al montar, la tarjeta se registra en `vigia`, un `IntersectionObserver` **sin margen**.
2. Primer aviso: si se ve algo de ella, no se toca. Si no: `data-reinicio` (quita las
   animaciones) y `data-en-espera` (las pausa en su primer fotograma, invisible), y pasa a
   `entrada`, el observador con `rootMargin: 0px 0px -10% 0px`. `data-reinicio` se quita dos
   `requestAnimationFrame` después, para que el navegador alcance a recalcular sin animaciones.
3. Cuando `entrada` avisa que asoma, se quitan los atributos y se pone `--orden` según el orden
   de lectura entre las que asomaron juntas.

El primer aviso es sin margen a propósito: con el −10 %, una tarjeta que el servidor ya había
pintado en la franja de abajo se escondía al hidratar (visto en video, Inicio de Alberto).

### Casos límite conocidos

- **Un ajuste en vivo** (`ajustar_pantalla`) no repite la entrada: la tarjeta no se vuelve a
  montar. La transición de los valores que cambian (números que cuentan, curvas que se mueven)
  va aparte, con los [ajustes en vivo](ajustes-en-vivo.md), y no toca estos ganchos.
- **`GastoPorCategoria` al cambiar `orden` o `limite`**: la lista lleva `key` de vista y se vuelve a
  montar, así que sus filas entran otra vez en cascada. Es a propósito: sin la `key`, React mueve
  nodos y la animación se reinicia solo en los que movió.
- **Arrastrar un slider** (`SimuladorMeta`, `ProyeccionCrecimiento`) no anima nada: el trazo no
  persigue al dedo.
- **Reducir movimiento**: `animation: none !important` dentro de la capa (le gana al
  `!important` sin capa del bloque global) y `usarEntradaAlVerse` no observa. Es `none` y no
  0.01 ms porque aquí hay retrasos: con `backwards`, el primer fotograma invisible se
  sostendría durante el retraso.
- **Sin JavaScript**: las animaciones CSS corren igual; solo no hay espera al scroll.

### Cómo agregar un componente que anime bien

1. Usa `Tarjeta` (ya trae `animar-tarjeta` y la espera) y `PieTarjeta`.
2. Marca con `cifra` el número principal, uno solo, y que sea caja (hijo de `flex`/`grid` o `block`):
   un `span` en línea ignora `transform`.
3. `animar-filas` en el contenedor de una lista; `animar-barra` en una barra hecha a mano.
4. Gráficas por `Grafica`: una curva no necesita nada; una gráfica polar pasa
   `entrada="ninguna"` y trae su propio gancho.
5. Nada de `@keyframes` nuevos que animen algo distinto de `transform`/`opacity`.

### Cómo probarlo

- `pnpm --filter @maya/catalogo test` y `pnpm --filter @maya/web test`.
- En `/catalogo`, panel *Animations* de DevTools, o congelar un instante desde la consola:
  `for (const a of document.getAnimations()) { a.pause(); a.currentTime = 300 }`.
- DevTools → *Rendering* → *Emulate CSS prefers-reduced-motion: reduce*: las tarjetas aparecen
  sin animación.
- Celular (390 px) en `/catalogo`: al cargar, solo la primera tarjeta no espera; al hacer scroll
  cada una se anima al asomar.
