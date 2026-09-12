---
verificado: 2026-09-12 09:40
implementado-en: scripts/generar-datos.mjs
lenguaje: typescript
---

# Generación de los datos mock

## Para cualquiera

El problema: necesitamos un año de historia financiera para tres personas que no
existen, y tiene que parecer real. Si inventamos los movimientos al azar, el resultado
es ruido: montos redondos, gastos sin patrón, meses idénticos entre sí. Un juez lo nota
en cinco segundos.

La idea es que la vida financiera de alguien no es aleatoria, es **rutina con excepciones**.
La renta cae el día 1, la nómina el 15 y el último día del mes, Netflix el 4, y encima de
esa rutina hay un montón de compras chicas que sí varían. Diciembre siempre es más caro
que enero. Y una o dos veces al año pasa algo grande: se rompe la transmisión del coche,
hay una urgencia médica. Entonces el generador no sortea movimientos: construye la rutina
y le agrega la variación encima.

Lo segundo importante es que el resultado sea **siempre el mismo**. Usa un dado cargado
—un generador de números aleatorios con semilla fija— así que correrlo hoy o mañana da
exactamente los mismos archivos. Nadie va a ver en el pitch cifras distintas a las del
ensayo.

## La idea

Tres decisiones cargan con casi todo:

**1. La rutina va en tablas, no en código.** `scripts/lib/perfiles.mjs` declara, por
perfil, sus ingresos (fijos o por proyecto), sus cargos recurrentes con día del mes, sus
suscripciones y sus rangos de gasto discrecional por categoría. El generador solo
materializa eso. Cambiar el comportamiento de un perfil es editar una tabla, no lógica.

**2. Los saldos se deducen hacia atrás.** Los saldos que la UI muestra son los de *hoy*,
y están escritos a mano porque son los que se leen en voz alta en la demo. Si el
generador los acumulara hacia adelante desde un saldo inicial inventado, el saldo final
nunca coincidiría con el declarado. Así que hace lo contrario: suma el efecto neto de
todos los movimientos de la cuenta y **resta** eso del saldo de hoy para obtener el saldo
inicial. De ahí encadena hacia adelante. El último movimiento cae exactamente en el saldo
declarado, por construcción.

**3. Un flujo de aleatoriedad por perfil, no uno global.** Con una sola secuencia
compartida, agregar un movimiento a Beto corre todos los sorteos posteriores y los datos
de Carmen cambian sin que nadie la haya tocado. Eso hace imposible calibrar: ajustas un
perfil y descalibras los otros. Cada flujo se siembra con `SEMILLA XOR hash(clave)`, así
que `usr_beto`, `usr_carmen` y la serie de precios de cada instrumento son independientes
y reproducibles por separado.

## Paso a paso

Por cada perfil y cada uno de los 12 meses:

1. **Ingresos.** Nómina quincenal (día 15 y último del mes) para Ana y Beto; para Carmen,
   2 o 3 cobros de honorarios en días sorteados, de montos muy dispares. El piso de dos
   cobros no es cosmético: con uno solo, su ingreso del mes cae por debajo de sus costos
   fijos.
2. **Cargos recurrentes de día fijo**: renta o hipoteca, colegiatura, servicios,
   mensualidades de crédito. Los que varían de verdad (CFE, agua, gas) llevan un campo
   `variacion` y se mueven en ese rango.
3. **Traspasos con asiento espejo.** Un pago de tarjeta o una aportación al portafolio
   generan **dos** movimientos: el cargo en la cuenta corriente y el abono en la cuenta
   destino. Sin el segundo, el saldo de la cuenta destino no cuadraría con nada.
4. **Suscripciones**: el mismo día cada mes, respetando `fecha_inicio` y
   `fecha_cancelacion` (Beto canceló el gimnasio en marzo de 2026 y el generador deja de
   cobrarlo desde ahí).
5. **Gasto discrecional**: por cada categoría se sortea cuántas compras hubo y de cuánto,
   dentro de los rangos del perfil, multiplicado por la estacionalidad del mes y por el
   factor de calibración del perfil. El comercio sale de la lista de esa categoría, y el
   canal de pago se deduce de su giro.
6. **Traspaso a ahorro**, si el perfil lo tiene y con la probabilidad que declare (Ana
   ahorra 6 de cada 10 meses; Beto, 2.5 de cada 10 y luego lo saca).

Después, fuera del ciclo mensual: aguinaldos y los 8 gastos atípicos, ambos en fechas
fijas porque el guion de la demo los menciona. Se ordena todo cronológicamente, se
asignan los ids `mov_NNNNNN`, y al final se calculan los saldos hacia atrás.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `patrones[usuarioId]` | objeto declarativo | `{ nomina: { dias: [15, 0], monto_centavos: 1600000 }, ... }` |
| `estacionalidad` | mapa periodo → factor | `{ '2025-12': 1.42, '2026-01': 0.82 }` |
| `atipicos` | lista con fecha y monto fijos | `{ fecha: '2026-02-14', monto_centavos: 1420000 }` |
| `cuentas[].saldo_centavos` | entero, saldo de HOY | `1842350` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| `db/datos/movimientos.csv` | 2 265 filas | `mov_001869,cta_ana_nomina,usr_ana,2026-08-01,...` |
| `db/datos/diagnostico_habitos.csv` | 33 filas | `usr_beto,2026-08,...,39,Traes tu tarjeta al 97 % de su límite` |
| Los otros 20 CSV | — | ver `docs/como-funciona/datos-mock.md` |

## Parámetros y umbrales

| Número | Valor | De dónde salió / qué pasa si se mueve |
|---|---|---|
| `SEMILLA` | `20260911` | La hora de arranque del reto. Cambiarla regenera **todo**: hay que volver a calibrar y a verificar el guion de la demo |
| `HOY` | `2026-09-12` | Fija a propósito. Si dependiera del reloj, saldos, moras y puntajes cambiarían entre ensayos |
| `MESES_HISTORIAL` | 12 | Habilita comparativa año contra año y estacionalidad completa |
| `factor_discrecional` | Ana 0.414, Beto 0.382, Carmen 0.298 | **Calibración**, ver abajo |
| `estacionalidad` | 0.82 a 1.42 | Buen Fin 1.28, diciembre 1.42, cuesta de enero 0.82, regreso a clases 1.22 |
| Redondeo de montos | múltiplos de 50 centavos | Un ticket real dice $187.50, no $187.4372 |
| `TECHO_ENDEUDAMIENTO` | 0.35 | Se considera sano comprometer hasta el 35 % del ingreso en pagos de deuda. Decide la capacidad de pago y, con ella, la precalificación |
| Ventana del hábito | 3 meses | Un mes malo no es un hábito, sobre todo con ingreso variable |
| Volatilidad → precios | semanal, `σ/√52` | Riesgo 1 sale casi recto, riesgo 5 con dientes visibles |

### La calibración del gasto, y por qué existe

Cada rango de gasto por categoría es plausible por separado, pero la **suma** de todos no
lo es: los primeros números que probamos daban a Beto un gasto de $42,000 mensuales con
un ingreso de $24,500. Como los saldos se deducen hacia atrás, eso no producía un error
visible sino algo peor: un saldo inicial de **$200,000** en la cuenta de alguien que vive
al día. Nadie lo nota leyendo el CSV; un juez que revise el historial sí.

Por eso cada perfil tiene un `factor_discrecional` único que escala todo su gasto
discrecional, ajustado para que su flujo mensual dé lo que su historia pide:

| Perfil | Neto mensual | Saldo inicial deducido → final | Historia |
|---|---|---|---|
| Ana | −$332 | $22,409 → $18,424 | Se le va casi todo, drenaje lento |
| Beto | −$650 | $9,982 → $2,187 | Se está quedando sin colchón |
| Carmen | −$20 | $187,584 → $187,342 | Cierra el mes, y además aporta a inversión y a ahorro |

`validar-datos.mjs` falla si el saldo inicial deducido sale negativo, y avisa si pasa de
tres meses de ingreso. Es la red que evita volver a la situación anterior.

### El puntaje de salud financiera (0–100)

Cuatro componentes de 25 puntos, cada uno lineal y saturado en su meta:

| Componente | Meta para los 25 puntos |
|---|---|
| Tasa de ahorro (tendencia a 3 meses) | 20 % del ingreso |
| No estar sobreendeudado | pagos de deuda en 0 % del ingreso; 0 puntos al llegar al 35 % |
| Fondo de emergencia | 3 meses de gasto promedio en cuentas líquidas |
| Gasto esencial | 70 % del gasto (castiga vivir de lo discrecional) |

El **hábito detectado** es una cascada de reglas, y el orden es deliberado: primero lo más
accionable. La tarjeta al límite va antes que "gastas más de lo que ingresas" porque es un
problema concreto con una salida concreta —reestructurar— y de hecho suele ser la causa
del segundo, no su consecuencia.

## Límites y supuestos

- **No modela intereses compuestos sobre el saldo vivo de la tarjeta.** El cargo mensual
  de intereses de Beto es un monto aproximado con variación, no el recálculo mes a mes
  sobre su saldo. Suficiente para las pantallas; insuficiente para un simulador
  revolvente.
- **La serie de precios no tiene correlación entre instrumentos.** Cada uno se mueve por
  su cuenta, así que no hay días de "todo el mercado baja". Para una gráfica individual da
  igual; para una medida de riesgo de portafolio, no.
- **El gasto no reacciona a los eventos.** Un mes con una urgencia médica de $23,800 no
  reduce el gasto discrecional del mes siguiente, aunque en la vida real sí lo haría.
- **La estacionalidad multiplica la cantidad de compras, no su monto.** Diciembre tiene
  42 % más compras, no compras 42 % más caras.
- **Un solo país, una sola moneda, un solo huso.** Todo es MXN y `America/Monterrey`.

## Cómo se probó

`node scripts/validar-datos.mjs` — 9 bloques de comprobaciones sobre los 22 CSV:
integridad referencial de 32 relaciones, ids únicos, montos enteros, encadenamiento del
saldo por cuenta, cierre de las tablas de amortización, fórmula del pago mínimo, pesos de
portafolio, coherencia del canal con el giro del comercio, prefijos `_base_`, CLABE falsa
y flujo de caja por perfil. Sale con código 1 si algo falla.

Determinismo: dos corridas seguidas de `generar-datos.mjs` producen el mismo SHA-256 en
`movimientos.csv`. Verificado el 2026-09-12.
