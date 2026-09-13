---
verificado: 2026-09-13 02:15
implementado-en: apps/web/src/lib/rejilla.ts, apps/web/src/components/maya/lienzo.tsx (prop `acomodo`), packages/a2ui/src/Superficie.tsx (prop `disponer`), packages/catalogo/src/tarjeta.tsx
lenguaje: typescript
---

# Acomodo del lienzo: cómo se reparten las tarjetas que construye el agente

## Para cualquiera

El agente decide **qué** tarjetas van en la pantalla y en qué orden, pero no sabe en qué
pantalla se van a ver: puede ser un celular, la columna del chat en una laptop o, más
adelante, un tablero ancho. Antes, una pantalla de dos tarjetas salía siempre una encima de
otra, en una franja angosta, con el resto vacío. Medido el 2026-09-12 con la pregunta real
"¿Cuánto debo entre mi tarjeta y mi crédito de nómina?": a 1,440 px las dos tarjetas medían
245 px de ancho.

Ahora el lienzo las acomoda **como se acomodan libros en un librero**: cada tarjeta necesita
un ancho mínimo según lo que trae (una gráfica necesita más que un saldo), y se van poniendo
en la misma fila mientras quepan. Cuando ya no cabe una, baja a la siguiente fila. Si hay
espacio de sobra, las tarjetas crecen para llenarlo, y la que trae gráfica crece el doble.
En un celular no cabe más de una por fila, así que quedan una debajo de otra a todo lo ancho;
en la laptop quedan lado a lado.

Y cada tarjeta, por dentro, **se adapta a su propio ancho**, no al de la pantalla: una
tarjeta angosta pone sus datos en una columna; la misma tarjeta a lo ancho pone la gráfica a
un lado y los números al otro. Por eso el mismo widget sirve en el chat, en un tablero o en
el celular sin cambiar una línea.

## La idea

Dos piezas, y las dos miden **contenedores**, no la ventana:

1. **La rejilla** (`rejilla.ts`) es una fila flexible que salta de línea. Cada pieza tiene una
   base (su ancho mínimo cómodo) y un factor de crecimiento. CSS resuelve solo cuántas caben
   por fila: no hay que calcular columnas ni medir nada con JavaScript, así que funciona igual
   renderizado en el servidor.
2. **La tarjeta** (`Tarjeta` en `packages/catalogo/src/tarjeta.tsx`) declara
   `@container/tarjeta`, y todo lo de adentro usa variantes de contenedor (`@md/tarjeta:`,
   `@3xl/tarjeta:`). Los breakpoints normales de Tailwind (`sm:`, `md:`) miran la pantalla: en
   un escritorio, una tarjeta de 245 px se pintaba con el acomodo de escritorio y las fichas
   se recortaban a "$27,…".

El tamaño de cada pieza sale del **ancho natural del componente** (el valor por omisión de su
prop `ancho` en el schema), no del `ancho` que mande el agente: el agente no sabe en qué
pantalla se ve la tarjeta y, en la práctica, copiaba `ancho: "amplio"` de los ejemplos a todo.

**Hay dos acomodos, y este es el de la conversación.** `<Lienzo acomodo="filas">` (por
omisión) es lo que se describe aquí. `<Lienzo acomodo="masonry">` lo usa Inicio y reparte las
mismas piezas, con los mismos tamaños naturales, en una rejilla sin huecos verticales
(`docs/algoritmos/masonry-del-inicio.md`). El acomodo no cambia qué pinta el renderer ni qué
tamaño natural tiene cada componente: solo el hueco donde cae cada pieza.

## Paso a paso

1. El agente manda su pantalla, casi siempre un `Column` raíz con las tarjetas.
2. `<Superficie disponer>` (renderer A2UI) detecta que la raíz es un `Column` o un `Row` y, en
   vez de pintarlo (un `Column` apila), entrega sus hijos ya pintados como piezas sueltas, con
   su nombre de componente y su `ancho` resuelto. Una raíz que no es contenedor llega como
   única pieza.
3. `tamanoDePieza` le da a cada pieza un tamaño:
   - `Text`, `Divider`, `Row` → **completa** (su propia fila).
   - `Column` anidado → **amplia**.
   - Componente del catálogo → su ancho natural: `amplio` → **amplia**, `normal` → **compacta**.
   - Componente que el catálogo no conoce → lo que diga el agente, o compacta.
4. `clasesDePieza` cuenta las tarjetas de la pantalla (sin contar las de fila completa) y da
   las clases:
   - **1 tarjeta**: toda la fila.
   - **2 o 3**: compacta parte de 18rem y crece ×1; amplia parte de 26rem y crece ×2. Ninguna
     baja de su mínimo salvo que el lienzo entero sea más angosto (un celular): entonces todo
     el ancho.
   - **4 o más**: todas parten de la mitad de la fila, así quedan de dos en dos (con tres por
     fila, la cuarta quedaba sola abajo).
5. La fila flexible (`flex flex-wrap items-start`) acomoda: mete piezas en la fila mientras la
   suma de bases quepa y reparte el espacio sobrante según el factor de crecimiento.
6. Cada tarjeta mide lo que su contenido (`items-start`). La héroe, además, lleva `self-start`
   para que ningún contenedor que sí estire la vuelva un bloque rojo vacío.
7. Dentro de la tarjeta, las variantes de contenedor cambian el acomodo: p-4 → p-5 desde
   28rem; gráfica y fichas en dos paneles desde 48rem; opciones en dos columnas desde 42rem…
   (el detalle por componente está en `docs/como-funciona/componentes-inversion-y-credito.md`
   y en el código de cada uno).

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| Piezas de primer nivel | `PiezaDeRaiz[]` (`id`, `clave`, `componente`, `ancho?`, `nodo`) | `[ResumenTarjeta, ProyeccionPagoCredito]` |
| Ancho natural | `anchoNatural(nombre)` de `@maya/catalogo` | `"amplio"` para `ProyeccionPagoCredito` |
| Ancho del lienzo | el que tenga su contenedor (`@container/lienzo`) | 768 px en el chat a 1,440 px |

| Salida | Tipo | Ejemplo |
|---|---|---|
| Tamaño por pieza | `"compacta" \| "amplia" \| "completa"` | `["compacta", "amplia"]` |
| Clases por pieza | string de Tailwind | `grid min-w-[min(100%,26rem)] flex-[2_1_26rem]` |

Resultados medidos en el navegador (Playwright, 2026-09-12), chat con la columna de 768 px:

| Pantalla | Resultado |
|---|---|
| `ResumenTarjeta` (héroe) + `ProyeccionPagoCredito` | lado a lado: 304 px + 448 px |
| `ResumenTarjeta` (héroe) + `PlanDePago` | lado a lado: 376 px + 376 px |
| `Confirmacion` + `ResumenTarjeta` + `Calendario` | dos arriba (376 px c/u), el calendario abajo a 768 px |
| `ProyeccionPagoCredito` + `SimuladorMeta` | lado a lado: 448 px + 304 px |
| `DistribucionPortafolio` + `RendimientoHistorico` | una por fila a 768 px: dos amplias no caben en 768 |
| `GastoPorCategoria` sola | 768 px, con las categorías en dos columnas |
| Cualquiera a 390 px | una por fila, a todo lo ancho |

Sin el tope de 768 px (como en un tablero, a 1,440 px): héroe + crédito quedan en 432 px +
704 px con las cuatro fichas en fila; cuatro amplias quedan 2 × 2 a 568 px cada una.

## Parámetros y umbrales

| Número | Dónde | De dónde sale y qué pasa si se mueve |
|---|---|---|
| 18rem (288 px) base de compacta | `rejilla.ts` | El ancho en que un saldo, una confirmación o un plan se leen completos. Más chico: dos compactas se meten a 560 px y se recortan |
| 26rem (416 px) base de amplia | `rejilla.ts` | Por debajo, una gráfica con fichas se ve como en celular y es mejor que baje a su fila a lo ancho. Con 22rem se probó: el crédito quedaba a 376 px junto a otra tarjeta y las fichas se apretaban |
| Crecimiento ×1 / ×2 | `rejilla.ts` | La amplia se lleva el doble del sobrante: su contenido lo aprovecha, el de una compacta no |
| 4 tarjetas o más → de dos en dos | `rejilla.ts` | Con tres por fila la cuarta quedaba sola a todo lo ancho |
| `items-start` | `CLASES_REJILLA` | Estirar al alto de la fila dejaba 280 px de blanco dentro de "Tu plan quedó activo" junto al calendario |
| 28rem (`@md/tarjeta`) | densidad | p-4 → p-5, igual que antes con `md:` pero medido contra la tarjeta |
| 48rem (`@3xl/tarjeta`) | crédito, crecimiento | Gráfica y fichas en dos paneles: con menos, la gráfica queda de 280 px |

## Límites y supuestos

- **No hay masonry en este acomodo**: una tarjeta corta junto a una larga deja lienzo gris
  debajo (ver `items-start`). Es el precio de que las tarjetas **crezcan para llenar la
  fila**, que es lo que una rejilla de columnas fijas no puede hacer. En Inicio, donde los
  altos son muy distintos y ese hueco se acumula, se usa el otro acomodo:
  `<Lienzo acomodo="masonry">`, documentado en `docs/algoritmos/masonry-del-inicio.md`. La
  conversación sigue con filas: ahí casi nunca hay más de dos tarjetas a la vez.
- **El orden es el del agente.** No se reordena para llenar huecos: la persona lee en el orden
  en que el agente contó la historia.
- Solo se reparte la **raíz**. Un `Column` o `Row` anidado se pinta tal cual dentro de su pieza.
- Se ignora el `ancho` del agente para componentes del catálogo. Si algún día hace falta que el
  agente fuerce un ancho, es un cambio de una línea en `tamanoDePieza`.
- `Row` como raíz se reparte igual que `Column`: el lienzo decide lado a lado o apilado.
- Los umbrales dentro de cada tarjeta están pensados para la paleta de tamaños de Tailwind
  (`@sm` 24rem, `@md` 28rem, `@lg` 32rem, `@xl` 36rem, `@2xl` 42rem, `@3xl` 48rem).

## Cómo se probó

- `apps/web/src/lib/__tests__/rejilla.spec.ts`: tamaño por componente, clases por número de
  tarjetas, que el ancho natural sea exactamente el default del schema en los 18, y el
  **turno real** que se veía apilado (`fixtures/turno-beto-deudas.jsonl`) llegando a la
  rejilla como dos piezas sueltas, sin el `Column`.
- `apps/web/src/lib/__tests__/masonry.spec.ts`: que el acomodo por omisión siga siendo el de
  filas (la conversación no cambió) y que el de masonry traduzca los mismos tamaños.
- `packages/a2ui/src/__tests__/disponer.test.tsx`: la raíz contenedor se entrega como piezas
  en orden, `ancho` se resuelve contra el data model, una raíz suelta es una pieza, un
  `Column` anidado no se reparte, y sin `disponer` todo sigue como antes.
- `packages/catalogo/src/__tests__/render.spec.tsx`: ningún componente del catálogo usa
  breakpoints de pantalla, todos van dentro de `@container/tarjeta`, y la razón viene plegada.
- En el navegador: el turno real se grabó una vez con el modelo y se repitió interceptando
  `/api/agente` (sin gastar cuota) a 1,440, 1,024, 768 y 390 px; siete composiciones más
  armadas con los ejemplos del catálogo, en el chat y sin el tope de 768 px. En `/catalogo`
  cada ejemplo se revisó a 360 px, 480 px y ancho completo con el selector de ancho.
