---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-13 03:12
github: 26
resuelto-en:
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

## Resolución (2026-09-13)

Se siguió el arreglo sugerido, con un tope de 4 colores en vez de 5 (el quinto de la tarjeta blanca
era el tinte, invisible sobre blanco):

- `packages/catalogo/src/distribucion-portafolio/segmentos.ts` (nuevo, `repartirSegmentos`): con 4
  clases o menos, cada una con su color por monto; con más, las 3 de mayor monto con color y el
  resto en un segmento «Otras (N clases)» con el cuarto. Blanca: oscuro, rojo, gris, plata. Héroe:
  `var(--primary-foreground)` y el blanco al 70, 48 y 28 % (misma sintaxis `rgb(255 255 255 / x)`
  que ya usan las otras tarjetas héroe). El cuadrito de cada fila lleva el color de su segmento.
- `componente.tsx` usa esa función; la animación de la dona (`animar-dona`, `entrada="ninguna"`) no
  se tocó.
- Prueba nueva `packages/catalogo/src/__tests__/distribucion-portafolio.spec.tsx` (7): con las 8
  clases de Carmen, en héroe y en blanca, todo cuadrito es visible (alfa ≥ 0.25, sin tinte), hay
  exactamente 4 colores y de la cuarta clase en adelante comparten el de «Otras»; con 4 clases cada
  una tiene el suyo; el agrupado es por monto aunque lleguen desordenadas. **Antes del arreglo
  fallaban 5 de las 7** (alfa 0.2 y luego negativo en héroe, 8 colores; tinte y 5 colores en blanca).
- Docs: `docs/algoritmos/graficas-del-catalogo.md` (puntos 5b–5e, límites y parámetros) y
  `docs/como-funciona/componentes-inversion-y-credito.md` (sección de `DistribucionPortafolio`, que
  además decía `rebalancear_portafolio` como acción; la real es `ver_orden_rebalanceo`).

**No verificado en navegador**: las pruebas son de render en servidor; la dona (Recharts) no pinta
en jsdom. Falta mirar `/catalogo` y la portada de Carmen a 360 px después del deploy.
