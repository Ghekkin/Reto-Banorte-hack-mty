---
verificado: 2026-09-12 13:10
implementado-en: packages/catalogo/src/graficas.tsx (y los componentes que se citan abajo)
lenguaje: typescript
---

# Gráficas del catálogo: qué forma, qué color y qué números se calculan en pantalla

## Para cualquiera

Seis tarjetas del catálogo llevan una gráfica: el precio de un instrumento, el
crecimiento de una inversión, el saldo de un crédito bajando, la dona del portafolio, el
medidor de salud financiera y la comparación de dos caminos. Este documento dice cómo se
decide la forma de cada una, cómo se reparten los colores, y qué números se calculan en el
navegador en vez de venir de una tool. La regla que gobierna todo: **el número nunca
depende de la gráfica**. Cada monto está escrito en texto en la misma tarjeta; la gráfica
da la forma, no el dato. En un celular no hay hover, y en un proyector nadie lee un
tooltip.

## La idea

Cada dato tiene un trabajo, y el trabajo elige la forma (skill `dataviz`):

| Trabajo del dato | Forma | Componente |
|---|---|---|
| Cambio en el tiempo | Curva (área) | `RendimientoHistorico`, `ProyeccionPagoCredito` |
| Cambio en el tiempo, dos partes que suman | Área apilada | `ProyeccionCrecimiento` |
| Partes de un todo | Dona con el total al centro | `DistribucionPortafolio` |
| Una calificación sobre 100 | Medio arco con el número adentro | `TermometroSaludFinanciera` |
| Comparar dos magnitudes | Dos barras horizontales, misma escala | `ComparadorAntesDespues` |
| Cuánto de cada categoría | Lista con barra por fila | `GastoPorCategoria` (ya existía) |

Lo que se corrigió el 2026-09-12: `RendimientoHistorico` pintaba **barras cuya base era
el precio mínimo** de la serie, así que entre $1,000 y $1,114 (+11 %) la última barra salía
cinco veces más alta que la primera. Una barra dice "cuánto" desde cero; el cambio lo dice
una línea. `ProyeccionCrecimiento` y `ProyeccionPagoCredito` no tenían gráfica de tiempo:
tenían una barra de dos segmentos y una lista.

## Paso a paso

### Colores por serie

1. La paleta es la del sistema de diseño (`--chart-1..5`): oscuro, rojo, rojo claro,
   plata, tinte. Se corrió el validador de la skill `dataviz` sobre ella:
   `#EC0029` y `#FF3355` (rojo y rojo claro) dan **ΔE 6.5 con visión normal**, o sea que
   no se distinguen ni sin daltonismo.
2. Por eso las series se asignan en el orden **oscuro → rojo → gris (`--muted-foreground`)
   → plata**, y nunca rojo junto a rojo claro. Con esa secuencia el validador pasa la
   separación por daltonismo (ΔE 8.9) y la de visión normal (ΔE 25).
3. La plata tiene contraste 1.6:1 contra la tarjeta: se usa solo para la última clase y
   siempre con su valor escrito al lado.
4. Semántica fija: **oscuro = lo que es de la persona o lo bueno** (aportado, capital,
   la estrategia); **rojo = lo que duele o lo que se resalta** (intereses, rendimiento
   sobre lo aportado, el camino caro, el pilar fuera de referencia).
5. Todo color entra al SVG como `var(--token)`. Recharts pone `#3182bd`, `#ccc` y
   `#666` por omisión, así que cada trazo, relleno, punto y texto de eje se declara
   explícito. La prueba `render.spec.tsx` ("cero hex en el HTML") truena si se olvida uno.

### Ejes y tamaño

6. Sin línea de eje, sin marcas, sin cuadrícula. Texto de eje en `text-xs` gris.
7. El eje Y va oculto: el dato grande del encabezado ya da la escala, y las etiquetas
   directas (el punto final, las fichas) dan los intermedios.
8. Altura fija: 160 px en una tarjeta angosta y 192 px cuando la TARJETA mide 28rem o más
   (`CLASES_GRAFICA`, `@md/tarjeta:h-48`; antes era `md:h-48`, que miraba la pantalla). El
   `aspect-video` de shadcn hacía que la tarjeta amplia midiera 400 px de alto a 720 px de
   ancho, el doble que sus vecinas.
9. Dona y medidor traen su propio cuadrado. Recharts limita el radio a la mitad del lado
   menor: el medio arco es un cuadrado de 192 px del que la caja recorta la mitad de abajo.

### Formato compacto (`formatearMontoCorto`)

10. Para marcas de eje y fichas: `$24.8 k`, `$1.1 M`, `$950`. Se calcula a mano porque
    `Intl.NumberFormat` con `notation: "compact"` escribe `$86.0 k` en Node y `$86 k` en
    Chrome, y esa diferencia era un error de hidratación en cada ficha.

### La serie simulada de `ProyeccionCrecimiento`

11. Se genera mes a mes: `saldo = (saldo + aportación) × (1 + tasa/12)`, aportación al
    inicio del mes. `aportado = capital inicial + aportación × mes`;
    `rendimiento = saldo − aportado`.
12. **Calibración.** La tool ya mandó `rendimientoEstimadoCentavos`; la simulación con la
    misma aportación puede diferir un poco por convención (fin de mes, redondeos). Se
    calcula `factor = rendimiento de la tool / rendimiento simulado` y se multiplica el
    rendimiento de cada mes por él. Así, en la aportación original, el cierre de la curva,
    el encabezado y las fichas son **exactamente el número de la tool**, y al mover el
    slider todo se mueve junto. Si el factor sale fuera de `(0.5, 2)` la tool usa otra
    convención y se deja en 1.
13. Antes de esto el encabezado se recalculaba con el slider pero las filas de hitos no,
    y la tarjeta decía $195,827 arriba y $189,456 en "Año 3".

### Los pilares del termómetro

14. Cada pilar se mide contra **su** referencia y no contra 100 %, porque "18 % de ahorro"
    con una barra al 18 % parecía casi nada cuando está a dos puntos de la meta.

| Pilar | Referencia | Fuera si |
|---|---|---|
| Endeudamiento (deuda / ingreso) | máx. 35 % | > 35 % |
| Ahorro mensual (ahorro / ingreso) | meta 20 % (regla 50/30/20) | < 20 % |
| Fondo de emergencia | meta 3 meses de gasto | < 3 meses |

15. Barra = `min(1, valor / referencia)`. Fuera de referencia → rojo; dentro → oscuro.
    La referencia se escribe debajo del valor para que la barra no sea un acertijo.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| Serie de puntos (`puntos`, `amortizacionResumen`, `hitos`) | arrays de la tool | ver `packages/catalogo/ejemplos/*.jsonl` |
| Aportación del slider | centavos | `300000` |
| `rendimientoEstimadoCentavos` (para calibrar) | centavos | `3145600` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| Serie mensual `{ mes, aportado, rendimiento, total }` | array | 37 puntos para 36 meses |
| Factor de calibración | número | `0.83` en el ejemplo (195,827 simulados → 189,456 de la tool) |
| Avance de cada pilar | fracción 0–1 | deuda `0.63`, ahorro `0.9`, fondo `0.8` |

## Parámetros y umbrales

| Número | Dónde | Por qué |
|---|---|---|
| ΔE mínimo 8 (daltonismo), 15 (visión normal) | validador de `dataviz` | debajo de eso dos series vecinas se confunden |
| 160 / 192 px | `CLASES_GRAFICA` | legible proyectado sin que la tarjeta domine la rejilla |
| `(0.5, 2)` | calibración | fuera de ese rango, imitar a la tool sería inventar |
| 35 %, 20 %, 3 meses | pilares | reglas de bolsillo de educación financiera; se mueven en `REFERENCIAS` |
| 5 % | `DistribucionPortafolio` | debajo, la desviación del modelo no se anuncia en el badge |
| 3 puntos | `DistribucionPortafolio` | una clase con más de 3 pts de diferencia contra su objetivo se marca en negro |

## Límites y supuestos

- La simulación de crecimiento es una aproximación calibrada, no la tabla de la tool. El
  botón "Invertir con este plan" manda la aportación elegida y el cierre simulado; la tool
  vuelve a calcular con su propia convención.
- Con más de 5 clases de activo la dona repite la plata; el catálogo no espera más de 5.
- El tooltip de hover existe en escritorio como extra; nada depende de él.
- Modo oscuro: los tokens `--chart-*` cambian y las gráficas los siguen; no se verificó
  proyectado porque la demo va en claro.

## Cómo se probó

- `packages/catalogo/src/__tests__/render.spec.tsx`: cada componente pinta con su
  ejemplo en el servidor, cero hex en `fill`/`stroke`/`style`, todo botón de 48 px.
- Capturas con Playwright de las 18 tarjetas a 1280 px y a 390 px, el 2026-09-12 entre
  las 12:40 y las 13:05 (script en el scratchpad de la sesión; no se versiona).
- Sin errores de consola ni de hidratación en `/catalogo` después del cambio.
