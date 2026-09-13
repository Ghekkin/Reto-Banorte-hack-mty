# Proyección de una inversión

Lo que contesta `proyectar_inversion`: cuánto vale un ahorro invertido dentro de N meses, y qué pasa
si el mercado se porta mal.

Dueño de la matemática: `apps/mcp/src/dominio/inversiones.ts`. La tool que la expone:
`apps/mcp/src/tools/proyectar-inversion.ts`.

## Por qué existe este documento

Porque hasta el 2026-09-12 esta matemática **no existía en el servidor** y las dos tarjetas que la
necesitan —`ProyeccionCrecimiento` y `EscenariosInversion`— se pintaban con cifras que el modelo
escribía de memoria. El detalle que lo hacía invisible está en
`docs/issues/2026-09-12-cifras-sin-tool-que-las-calcule.md`: el componente simulaba la curva en el
navegador y después la **calibraba** contra el cierre recibido, así que la gráfica se doblaba para no
contradecir un número inventado.

## La fórmula

Interés compuesto mensual, con la aportación al **inicio** de cada mes:

```
i = tasaAnual / 12

saldo₀ = capitalInicial
saldoₙ = (saldoₙ₋₁ + aportación) · (1 + i)

aportado  = capitalInicial + aportación · n
rendimiento = round(saldoₙ) − aportado
```

Es una anualidad **anticipada** (la aportación gana interés desde el mes en que entra), no vencida.
La diferencia con la vencida es un mes de interés por aportación, y en horizontes de años se nota.

### La aportación entra ANTES de capitalizar, y no es negociable

No es una preferencia de estilo: es la misma iteración que hace
`packages/catalogo/src/proyeccion-crecimiento/componente.tsx`, y **tiene que seguir siéndolo**. Ese
componente re-simula la curva completa en el navegador cuando la persona mueve el slider —para que el
número grande cambie sin ir al agente— y la calibra contra el cierre que manda esta tool:

```
factor = rendimientoEsperado / rendimientoSimulado
```

Si las dos fórmulas coinciden, `factor` vale exactamente **1** y el componente solo interpola. Si
alguien cambia una de las dos, el factor deja de valer 1 y la curva se dobla para tapar la diferencia:
se ve bien y miente.

Es la misma convivencia deliberada que ya existe entre `comunes.ts:sumarMeses` y `dominio/tiempo.ts`:
la fórmula se replica a propósito porque viven en paquetes distintos, y lo que amarra el contrato son
**dos pruebas con los mismos números**, una a cada lado:

- `apps/mcp/src/__tests__/proyectar-inversion.spec.ts`
- `packages/catalogo/src/__tests__/proyeccion-crecimiento.spec.ts`

Si alguien toca una fórmula, una de las dos truena.

## Los tres escenarios: es una CONVENCIÓN, no un pronóstico

`pesimista`, `esperado` y `optimista` salen de mover la tasa una desviación estándar anual:

```
esperado   = rendimientoAnualEsperado           (del catálogo de instrumentos)
pesimista  = max(−0.5,  tasa − volatilidadAnual)
optimista  =             tasa + volatilidadAnual
```

`rendimientoAnualEsperado` y `volatilidadAnual` son **datos** de la tabla `instrumentos`, no
invenciones nuestras. Lo que sí es una decisión nuestra es aplicar ±1σ **durante todo el plazo**, y
hay que decirlo claro: eso no es un intervalo de confianza ni una simulación de Montecarlo. Es una
banda legible para que alguien entienda que el resultado tiene rango, y está elegida así porque:

- es explicable en una frase ("si el mercado rinde un poco menos de su promedio, todo el tiempo"),
- no requiere series históricas que la demo no tiene,
- y es **conservadora en la dirección que importa**: exagera la pérdida más de lo que un modelo
  estadístico la exageraría, no menos.

El piso de −50 % anual existe para que un instrumento muy volátil no produzca un absurdo.

### El escenario adverso puede perder, y se dice

Con un instrumento de riesgo 4 la volatilidad supera la tasa, así que `pesimista` sale **negativo**.
Eso se reporta con signo negativo y con una `advertencia` explícita en la salida:

```
proyectar_inversion(usr_carmen, 60 meses, $5,000/mes)
  esperado    +$3,199,676.44
  pesimista   −$116,267.40   ← y la advertencia dice que hay que decirlo
```

Dos cosas se arreglaron para que esto no se pudiera esconder:

1. El componente hacía `rendimiento = Math.max(0, …)`, que aplastaba la pérdida a cero y dejaba el
   escenario perdedor **plano**. Una proyección que nunca puede perder es propaganda, no una
   proyección.
2. El encabezado tenía el `+` escrito en la plantilla, así que un número negativo se leía `+-$95,351`.

## Los hitos

Los puntos que se marcan en el eje y se pintan como fichas. A lo más **cinco**, porque más marcas se
encinan y dejan de leerse en un proyector:

- horizonte ≤ 12 meses: tercios (a un año, un hito por año dejaría una sola marca);
- más de 12: aniversarios espaciados (`paso = ceil(años / 5)`), y **siempre el cierre**.

El último hito **es** el cierre por construcción: si no coincidiera, la ficha contradiría al
encabezado de la misma tarjeta, que es la peor forma de perder credibilidad.

## Lo que esta tool NO hace

- **No** modela impuestos, comisiones ni inflación.
- **No** es `proyectar_ahorro`. Esa es para una **meta de ahorro** y es lineal a propósito: un
  apartado no invierte, y prometer rendimiento donde no lo hay es lo único que no se puede hacer en
  una demo financiera (la decisión está escrita en `proyectar-ahorro.ts`).
- **No** decide en qué invertir. Para eso están `consultar_sugerencias_inversion` y
  `consultar_catalogo_inversiones`.
