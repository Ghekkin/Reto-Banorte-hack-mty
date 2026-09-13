---
estado: abierto
severidad: alta
area: web
encontrado: 2026-09-13 03:12
github: 26
---

# La dona de `DistribucionPortafolio` como héroe pinta invisibles las clases de la sexta en adelante

**Dónde:** `packages/catalogo/src/distribucion-portafolio/componente.tsx:53`, el color de cada
clase en la tarjeta héroe: `` `rgb(255 255 255 / ${1 - i * 0.2})` ``.

**Qué esperaba:** que cada clase de activo tuviera un segmento visible en la dona y su
cuadrito en la lista, cuantas clases lleguen.

**Qué pasa:** la opacidad baja 0.2 por clase. La quinta (`i = 4`) ya va al 20 %, la sexta
(`i = 5`) queda en `0` y de la séptima en adelante el alfa es negativo. Con el portafolio de
Carmen (8 clases) los segmentos de *BONDDIA*, *Fondo de Deuda Mediano Plazo* y *Deuda
Corporativa AAA* no se ven en la dona, y sus cuadritos de la lista desaparecen: la dona
muestra huecos donde hay $607,077.29 invertidos.

**Cómo lo reproduje / por qué estoy seguro:** se ve en la portada de Inicio de Carmen
(captura del usuario, 2026-09-13): tres de ocho filas sin cuadrito y tres huecos en la dona.
La cuenta sale directo de la línea 53. En la tarjeta blanca no pasa lo mismo, pero
`COLORES[i % COLORES.length]` repite el oscuro y el rojo desde la sexta clase, así que dos
clases distintas comparten color.

**Impacto en la demo:** alto. Es la tarjeta héroe de la portada de Carmen, la más grande de
la pantalla, y los huecos se leen como dinero que no aparece.

**Arreglo sugerido:** repartir la opacidad según cuántas clases hay (de 1 a 0.3 en pasos
iguales) en vez de restar 0.2 fijo, y agrupar en "Otras" desde la sexta clase para que la
tarjeta blanca tampoco repita colores.
