---
verificado: 2026-09-12 09:35
implementado-en: apps/mcp/src/dominio/salud.ts
lenguaje: typescript
---

# Puntaje de salud financiera: calificación, tendencia y vigencia del hábito

## Para cualquiera

El sistema le pone a cada persona una calificación de 0 a 100 sobre cómo va su dinero.
Ese número ya viene calculado desde que se generaron los datos: sale de cuánto ahorra,
cuánta deuda carga, cuánto de su gasto es indispensable y cuántos meses aguantaría si
se quedara sin ingresos.

Lo que este algoritmo hace con ese número son tres cosas:

1. **Traducirlo a una palabra** —crítica, frágil, estable o sana—, porque "39" no le
   dice nada a nadie y "crítica" sí.
2. **Decir hacia dónde va**, comparándolo con el mes pasado. Dos personas pueden estar
   en 74; una viene subiendo y la otra cayendo, y no merecen la misma pantalla.
3. **Avisar cuándo la frase del diagnóstico ya no es cierta.** El diagnóstico es una
   foto de fin de mes. Si la persona acaba de reestructurar su tarjeta, la frase "traes
   tu tarjeta al 97 % de su límite" describe un pasado que ella misma acaba de cambiar.
   Ponerla en pantalla sería contradecir la confirmación que el agente pintó hace diez
   segundos.

## La idea

El puntaje no se recalcula aquí, y eso es deliberado. `diagnostico_habitos` trae once
meses por persona resueltos en la generación de datos, con una fórmula que ya está
documentada en [Generación de los datos mock](generacion-de-datos.md). Recalcularlo en
el MCP daría un número parecido pero distinto, y tendríamos dos versiones de la verdad
sobre lo mismo. La regla del repo es que un dato tiene un solo dueño.

Lo que sí nos toca es **no mentir con él**. De ahí la vigencia del hábito: el puntaje se
devuelve tal cual, pero la frase que lo acompaña se marca como no vigente cuando una
acción de la demo invalidó el dato en que se apoya.

La tendencia usa una banda muerta de tres puntos. Sin ella, una persona que pasa de 74
a 73 aparecería "empeorando", y el agente construiría una pantalla de alarma por ruido
de un mes.

## Paso a paso

1. Lee todas las filas de `diagnostico_habitos` de la persona y las ordena por periodo,
   del más antiguo al más reciente.
2. Elige el mes: el que se pidió en `periodo`, o el más reciente si no se pidió.
   Un periodo que no existe falla diciendo cuáles hay.
3. Toma el mes inmediatamente anterior en la serie. Si el mes elegido es el primero,
   no hay anterior.
4. `cambio = puntaje(mes) − puntaje(anterior)`, o 0 si no hay anterior.
5. Traduce el puntaje a `calificacion` y el cambio a `tendencia` con los cortes de
   abajo.
6. Evalúa la vigencia del hábito: si la frase habla de la tarjeta **y** la persona ya
   tiene un plan de pago aplicado en el estado mutable, se devuelve
   `vigente: false` con la razón.
7. Corta la serie para graficar: los últimos `mesesHistoria` meses **terminando en el
   mes diagnosticado**, no en el de hoy. Pedir abril devuelve el contexto de abril.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | `usr_*` | `usr_beto` |
| `periodo` | `AAAA-MM`, opcional | `2026-04` |
| `mesesHistoria` | entero 1-12, opcional | `6` (default) |

| Salida | Tipo | Ejemplo (Beto, 2026-08) |
|---|---|---|
| `puntajeSalud` | entero 0-100 | `39` |
| `calificacion` | enum | `critica` |
| `tendencia` | enum | `estable` |
| `cambioVsMesAnterior` | entero con signo | `0` |
| `habito.texto` | string | `Traes tu tarjeta al 97 % de su límite` |
| `habito.vigente` | booleano | `true` (sin plan) / `false` (con plan) |
| `serie` | array | 6 puntos, de `2026-03` a `2026-08` |

## Parámetros y umbrales

| Constante | Valor | De dónde sale y qué pasa si se mueve |
|---|---|---|
| `CORTE_FRAGIL` | 40 | Debajo es `critica`. Beto vive en 39: bajarlo a 35 lo sacaría de crítica y el caso principal de la demo perdería su justificación |
| `CORTE_ESTABLE` | 60 | Debajo es `fragil`. Ana toca 59 en su peor mes (abril), que es justo el ejemplo de un mes malo sin ser catástrofe |
| `CORTE_SANA` | 80 | Arriba es `sana`. Carmen está en 85; Ana en 74 se queda en `estable` |
| `PUNTOS_PARA_TENDENCIA` | 3 | Banda muerta. Con 0 sería ruido puro; con 10, Ana cayendo 9 puntos aparecería "estable" y es justo el movimiento que su pantalla tiene que contar |

Los tres cortes se eligieron para que **los tres perfiles demo caigan en cajas
distintas**: crítica, estable y sana. Si los datos cambian, los cortes se revisan; la
prueba los fija explícitamente para que el cambio no pase inadvertido.

## Límites y supuestos

- **No recalcula el puntaje.** Si la fórmula de generación cambia, aquí no se entera:
  solo lee. Es a propósito (ver "La idea").
- **La vigencia solo cubre el hábito de la tarjeta.** Es el único de los seis hábitos
  que una acción de la demo invalida. `crear_apartado` no invalida "tu fondo de
  emergencia cubre menos de 3 meses", porque un apartado nace en cero y el fondo no
  cambia el día uno.
- **La detección es por asunto de la frase** (`/tarjeta/i`), no por recálculo. Los seis
  hábitos posibles son datos que nosotros generamos, no texto libre, así que la
  coincidencia es fiable. Si alguien agrega un hábito nuevo sobre la tarjeta con otra
  palabra, esta regla no lo alcanza.
- **Los datos llegan hasta `2026-08`.** No hay diagnóstico del mes en curso, porque es
  un cierre mensual y septiembre todavía no cierra.
- **El ahorro puede ser negativo** y viaja tal cual: los meses malos de Beto (junio,
  −$18,884) y Ana (abril, −$12,219) son parte de lo que hace la gráfica interesante.

## Cómo se probó

`apps/mcp/src/__tests__/salud.spec.ts`, 11 pruebas:

| Caso | Esperado |
|---|---|
| Beto 2026-08 | 39 · `critica` · `estable` · cambio 0 |
| Ana 2026-08 | 74 · `estable` · `empeora` · cambio −9 |
| Carmen 2026-08 | 85 · `sana` · `mejora` · cambio +10 |
| Ana 2026-04 | 59 · `fragil` · cambio −25 contra marzo (84) |
| Beto 2025-10 (el más antiguo) | cambio 0, `estable`, serie de 1 |
| Periodo `2019-01` | error que nombra el rango `2025-10 a 2026-08` |
| Beto sin plan | `habito.vigente: true` |
| Beto tras `aplicar_plan_pago` | `habito.vigente: false`, y el puntaje **sigue en 39** |

El último caso es el que justifica todo el mecanismo: el puntaje no se toca y la frase
sí se marca, que es exactamente la separación entre "dato de origen" y "afirmación que
podemos estar haciendo mal".
