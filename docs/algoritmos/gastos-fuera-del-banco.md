---
verificado: 2026-09-13 03:35
implementado-en: apps/mcp/src/dominio/gastos-externos.ts (vigentes, reemplazo, periodos, categorías), apps/mcp/src/tools/simular-gasto-externo.ts (gastoDelPeriodo, capacidadesCon, avisoDe), apps/mcp/src/tools/registrar-gasto-externo.ts, apps/mcp/src/tools/comparar-periodos.ts (overlay), apps/mcp/src/dominio/consultas.ts (capacidadPagoMensual), apps/mcp/src/tools/proyectar-ahorro.ts (capacidadDeAhorro)
lenguaje: typescript
---

# Gastos fuera del banco: «también pago $3,500 de renta en efectivo»

## Para cualquiera

Maya solo ve lo que pasa por las cuentas del banco. Si Ana paga la renta en efectivo, o Beto
le da $2,000 al mes a su mamá, ningún movimiento lo muestra, y Maya cree que les sobra más
dinero del que de verdad les sobra.

Por eso la persona puede decírselo en el chat. La tarjeta de gasto que ya está en pantalla
se recalcula ahí mismo: aparece una categoría nueva, marcada como **fuera del banco**, el
total del mes sube, y Maya dice cuánto le queda libre al mes para pagar deudas y para
ahorrar si ese gasto contara. Si le parece bien, toca **«Guardar gasto»** y queda guardado.
Desde ahí:

- aparece como categoría en su gasto del mes (y en los meses siguientes, si es mensual);
- le **resta capacidad de pago** (lo que buró estima que le queda libre para deuda) y
  **capacidad de ahorro** (lo que Maya le propone apartar al mes).

Si con ese gasto ya no le queda nada libre, Maya lo avisa. No lo bloquea: es la vida real de
la persona y ella sabe lo que paga.

Beto con «$2,000 al mes a mi mamá»: su gasto de agosto pasa de $33,349.50 a $35,349.50, su
capacidad de pago libre de $6,613.71 a $4,613.71, y su capacidad de ahorro de $1,525.50 a
**cero**; la tarjeta lo avisa. Ana con «$3,500 de renta»: de $31,410.50 a $34,910.50, capacidad
de pago de $6,629.05 a $3,129.05, de ahorro de $4,986.17 a $1,486.17; sin aviso.

## La idea

Un gasto de fuera del banco es **una fila más del estado mutable**, no un movimiento
inventado. Los movimientos son datos del banco y no se tocan; lo que la persona dijo se
guarda aparte (`acciones_aplicadas`, tipo `registrar_gasto_externo`) y las lecturas lo
superponen, igual que un plan de pago aplicado. Así se puede quitar, reemplazar y reiniciar
sin ensuciar la historia.

Solo lo **mensual** compite con la deuda y con el ahorro: la renta vuelve cada mes, la boda de
una prima no. Un gasto único cuenta en el gasto de su mes y nada más.

La simulación y la acción usan **la misma cuenta**: se arma la lista de gastos "como quedaría"
aplicando lo nuevo encima de lo guardado, sin guardar. La acción guarda exactamente eso.

## Paso a paso

### Los gastos vigentes (`gastosExternosVigentes`, `fusionar`)

1. Se leen, en orden, las filas `registrar_gasto_externo` de la persona. Cada una trae
   `periodo` (AAAA-MM) y `gastos` (`nombre`, `montoCentavos`, `frecuencia`).
2. Cada gasto se identifica por su **nombre normalizado**: minúsculas, sin acentos, sin
   espacios de sobra. «Apoyo a mi mamá» y «apoyo a mi MAMA » son el mismo.
3. **Gana el último**: un gasto con un nombre ya visto reemplaza al anterior (monto,
   frecuencia y periodo). Con monto 0 se quita.
4. La categoría de cada uno es `ext_<slug>` (`ext_apoyo_a_mi_mama`): el prefijo nunca choca
   con los `cat_…` del banco.

### ¿Cuenta en un periodo? (`aplicaEn`)

- `mensual`: en su periodo de registro y en todos los siguientes.
- `unico`: solo en su periodo.

El periodo de registro es el que la persona estaba viendo; por defecto, el último mes cerrado
(el mismo de `analizar_gasto`).

### El gasto del mes (`comparar_periodos`, `gastoDelPeriodo`)

1. Se calculan las categorías del banco como siempre, y **se elige la atípica solo entre
   ellas**: lo de fuera no tiene historia contra la cual medir un brinco.
2. Se agregan las de fuera del banco que cuentan en el periodo o en el anterior:
   `grupo: "fuera_del_banco"`, `esEsencial: false`, color gris, `fueraDelBanco: true`,
   `frecuencia`. `montoAnterior` es el monto si también contaba el mes anterior (un mensual
   registrado antes) y 0 si no. Uno que solo contaba el mes anterior sale con monto 0, como
   una categoría del banco que dejó de tener cargos.
3. `gastoCentavos`, `gastoAnteriorCentavos` y `participacionPct` se recalculan con todo; el
   orden es de mayor a menor.
4. Para la tarjeta (`CategoriaConExterno`) las del banco llevan `categoriaId`, `nombre`,
   `montoCentavos` y `variacionPct`; las de fuera, además, `fueraDelBanco`, `frecuencia` y
   `guardado` (false si es lo que se está simulando). `totalCentavos` es la suma de lo
   listado, al centavo.

### Capacidades (`capacidadPagoMensual`, `capacidadDeAhorro`, `capacidadesCon`)

- `capacidadPagoMensual = buró.capacidad_pago_mensual − Σ mensuales de fuera`. Puede quedar
  negativa, como la columna de buró en alguien sobreendeudado.
- `capacidadDeAhorro = max(0, min(flujo − Σ mensuales, capacidadPagoMensual) − comprometido)`,
  donde `flujo` es el promedio de lo que le sobró los últimos 3 meses y `comprometido` el plan
  de la tarjeta más los abonos a capital. Lo mensual sale de los dos lados porque ni el flujo ni
  buró lo ven.
- `techoDeDeudaMensual` (el aviso de los abonos a capital) baja con ella: es lo comprometido
  más lo libre.
- Para simular: `extra = Σ mensuales como quedaría − Σ mensuales guardados` (negativo si baja o
  quita uno) y ambas capacidades se calculan con ese `extra` encima.

### El aviso (`avisoDe`)

Solo si lo simulado **agrega** carga mensual (`extra > 0`):

1. Si `capacidadPago.despues ≤ 0`: «Con $X más al mes fuera del banco ya no te queda capacidad
   libre para pagar deudas: quedarías en $Y al mes.»
2. Si no, y `capacidadAhorro.despues` es 0: «Con $X más al mes fuera del banco ya no te queda
   nada para ahorrar: hoy puedes apartar $Z al mes.» (o una variante si ya estaba en cero).

### Guardar (`registrar_gasto_externo`)

1. Si la `idempotencyKey` ya se usó, devuelve lo que se guardó esa vez.
2. Calcula `antes`, `despues` (todo `guardado: true`) y las capacidades con la lista como
   quedaría, y lo guarda junto con `periodo` y `gastos` con `aplicarAccion`
   (`objeto_tipo: categoria`, `objeto_id: ext_<slug>` del gasto, o `gastos_externos` si son
   varios).
3. Por `ejecutar_decision`, `estadoPosterior` es `null`: `resultadoAccion.despues` ya es el
   gasto del periodo.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `usuarioId` | id | `usr_beto` |
| `periodo` | AAAA-MM, opcional | `2026-08` (default: último mes cerrado) |
| `gastos` | 1 a 5 `{ nombre, montoCentavos, frecuencia }` | `[{ "Apoyo a mi mamá", 200000, "mensual" }]` |
| `idempotencyKey` | solo en la acción | `c_123:2026-09-13T03:30` |

| Salida | Beto, $2,000 a su mamá | Ana, $3,500 de renta |
|---|---|---|
| `antes.totalCentavos` | 3,334,950 | 3,141,050 |
| `despues.totalCentavos` | 3,534,950 | 3,491,050 |
| `capacidadPago` antes → después | 661,371 → 461,371 | 662,905 → 312,905 |
| `capacidadAhorro` antes → después | 152,550 → 0 | 498,617 → 148,617 |
| `aviso` | «…ya no te queda nada para ahorrar: hoy puedes apartar $1,525.50 al mes.» | `null` |

## Parámetros y umbrales

| Número | Valor | Por qué |
|---|---|---|
| Gastos por llamada | 1 a 5 | Lo que alguien dice en una frase; más es una captura, no una conversación |
| Nombre | 1 a 60 caracteres | Cabe como renglón de la tarjeta |
| Frecuencias | `mensual`, `unico` | Lo que cambia la capacidad es si se repite; quincenal o anual se piden en su equivalente mensual |
| Color | `#6B7280` | El gris neutro que `comparar_periodos` ya usa para lo que no tiene categoría |

## Límites y supuestos

- **El efectivo que salió del cajero se puede contar dos veces.** Si Ana paga la renta con
  efectivo que sacó del cajero, ese retiro **ya está** en su categoría «Retiros de efectivo»
  del banco (Beto tiene $4,601.50 de retiros en agosto; Ana, $908.00). Sumar la renta encima
  cuenta ese dinero dos veces: una al sacarlo y otra al gastarlo. **Decisión: se suma igual,
  por prudencia**: sobreestimar el gasto deja a la persona con menos capacidad de la real, que
  es el error seguro; subestimarlo le ofrecería una deuda o un ahorro que no puede pagar. Maya
  puede preguntar «¿esa renta la pagas con lo que sacas del cajero?» y, si es así, no hace
  falta guardarla. El MCP no intenta adivinarlo: no hay forma de saber a qué se fue un retiro.
- **Gana el último por nombre, en todos los periodos.** Volver a guardar «Renta» con otro monto
  la reemplaza también en la historia: el mensual nuevo cuenta desde el periodo en que se
  guardó, así que los meses anteriores dejan de mostrarla. Y dos gastos únicos con el mismo
  nombre en meses distintos se pisan. Para la demo alcanza; un historial real guardaría
  vigencias.
- **Solo lo mensual resta capacidad.** Un gasto único grande (una boda) no le quita capacidad a
  los meses que vienen, aunque ese mes haya apretado.
- **No valida plausibilidad.** Un gasto mayor que el ingreso se guarda; el aviso lo señala.
- **La capacidad de pago de buró no suele contar la renta** (el 35 % es de deuda sobre ingreso).
  Restarla es una decisión de producto: lo que importa es cuánto dinero le queda de verdad.
- **No hay categoría atípica de fuera del banco**, aunque sea el gasto nuevo más grande.

## Cómo se probó

`apps/mcp/src/__tests__/gastos-externos.spec.ts` (18 pruebas, contra el volcado, sin base):

- Simular no guarda; `antes` es el `gastoCentavos` de `comparar_periodos`; la suma de las
  categorías da el total, antes y después.
- Ana $3,500 de renta: 3,141,050 → 3,491,050; capacidades −350,000 exactas; sin aviso.
- Beto $2,000 a su mamá: 3,334,950 → 3,534,950; capacidad de ahorro a 0 con aviso.
- Carmen con $15,000 de colegiatura: capacidad de pago −617,971 y aviso con el monto negativo.
- Registrar hace que `comparar_periodos` y `analizar_gasto` la listen (atípica intacta), baja
  `panorama_inicial.capacidadPagoMensualCentavos` y `proyectar_ahorro.capacidadMensualCentavos`
  exactamente lo mensual.
- Mensual desde su periodo; único solo en el suyo y sin tocar capacidad; reemplazo por nombre
  normalizado; monto 0 devuelve la lectura original; idempotencia; por `ejecutar_decision`;
  `reiniciarEstado` lo limpia.
