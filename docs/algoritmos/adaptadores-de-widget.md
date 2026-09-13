---
verificado: 2026-09-13 02:30
implementado-en: apps/web/src/lib/widgets/fuentes.ts
lenguaje: typescript
---

# Adaptadores de widget: de la salida de una tool a las props de una tarjeta

## Para cualquiera

Cada tarjeta de Inicio tiene una «receta» fija: a qué ventanilla del banco preguntar y cómo
acomodar lo que conteste. Maya solo elige la receta y los detalles del pedido («el mes de
julio», «cotiza a 24 meses»). La receta está escrita en código, así que con la misma respuesta
del banco siempre sale la misma tarjeta, y nadie puede meter un número a mano en el camino.

## La idea

Una fuente es un par **(tool del MCP, componente del catálogo)** con dos funciones puras: de
parámetros a argumentos, y de salida a props. Como son puras y deterministas, sirven dos veces:
para armar la tarjeta y para **auditarla** (volver a correrlas y comparar).

## Paso a paso

1. El modelo manda `{ id, fuente, parametros?, variantes?, heroe?, razon }`.
2. `parametros` y `variantes` se validan con el Zod `.strict()` de la fuente: una llave que no
   esté declarada se rechaza con su nombre.
3. Si la fuente tiene `resolver`, completa los parámetros consultando otra tool de lectura (la
   clave de un instrumento → su id). Lo resuelto es lo que se guarda en la procedencia, así el
   auditor reproduce la consulta sin volver a resolver.
4. `argumentos(parametros)` arma los argumentos de la tool, sin `usuarioId`.
5. El consultor agrega `usuarioId` de la sesión y llama la tool (o la toma de la caché del turno).
6. `adaptar(salida, parametros)` devuelve `{ ok: true, props }` o `{ ok: false, motivo }` si la
   fuente no aplica a esa persona (sin tarjeta, sin portafolio, sin suscripciones).
7. `revisarVariantes` comprueba lo que depende de los datos (el plazo preseleccionado tiene que
   estar entre los cotizados).
8. El componente `{ id, component, ...props, ...variantes, razon, heroe? }` se valida contra el
   schema del catálogo; `heroe` solo si el componente lo declara.

## Las fuentes

| Fuente | Tool | Componente | Parámetros | Variantes | Qué hace el adaptador |
|---|---|---|---|---|---|
| `tarjeta` | `consultar_tarjeta` | `ResumenTarjeta` | — | — | Copia saldo, límite, mora; con plan activo omite el mínimo y usa la mensualidad y el primer pago del plan |
| `plan_de_pago` | `simular_reestructura` | `PlanDePago` | `plazosMeses` (3–60, hasta 6) | `plazoElegido` | Ordena por plazo; `ahorroVsMinimoCentavos` → `ahorroCentavos`; preselecciona `plazoRecomendado` |
| `credito` | `consultar_creditos` (`incluirAmortizacion`, 12 pagos) | `ProyeccionPagoCredito` | `creditoId` | — | Elige el pedido, o el más caro con saldo, o el de mayor saldo; hitos 1, 3, 6 y último de los pagos pendientes |
| `gasto_del_mes` | `analizar_gasto` | `GastoPorCategoria` | `periodo` | `orden`, `limite` | Toma `gasto`; quita categorías en cero; `categoriaAtipicaId` → nombre |
| `gasto_comparado` | `comparar_periodos` | `GastoPorCategoria` | `periodo`, `periodoAnterior` | `orden`, `limite` | Igual que el anterior, contra el mes que se pida |
| `detalle_categoria` | `consultar_movimientos` (límite 15) | `DetalleCategoria` | `categoriaId`, `periodo` | — | `periodo` → primer y último día del mes; solo cargos; total = `sumaCargosCentavos` |
| `fugas` | `detectar_fugas` | `AlertaFugas` | `mesesSinUso` | — | Las sin uso primero, luego por monto |
| `salud` | `diagnostico_salud_financiera` | `TermometroSaludFinanciera` | `periodo` | — | `ahorroLiquidoCentavos` → `montoAhorradoCentavos`; el hábito solo si `vigente` |
| `simulador_meta` | `proyectar_ahorro` | `SimuladorMeta` | `metaId`, `montoObjetivoCentavos`, `aportacionCentavos`, `frecuencia`, `nombre` | — | Tope del slider = el mayor entre capacidad, aportación y escenarios |
| `meta_activa` | `proyectar_ahorro` | `MetaActiva` | `metaId` | — | Exige `meta`; `saldoInicialCentavos` → `acumuladoCentavos`; `fechaEstimada` → `fechaObjetivo` |
| `portafolio` | `consultar_inversiones` | `DistribucionPortafolio` | — | — | Posiciones por peso descendente |
| `rebalanceo` | `simular_rebalanceo` | `OrdenRebalanceo` | — | — | Exige órdenes; copia movimientos tal cual |
| `rendimiento_historico` | `consultar_historico_inversion` | `RendimientoHistorico` | `clave` (o `instrumentoId`), `semanas` (2–52) | — | **Resuelve** la clave («NAFTRAC») al id con `consultar_inversiones` (posiciones y modelo); `precioCierreCentavos` → `precioCentavos`; etiqueta «Últimas N semanas» |

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| Pedido del modelo | `{ id, fuente, parametros?: string JSON, variantes?: string JSON, heroe?, razon }` | `{ "id": "plan", "fuente": "plan_de_pago", "parametros": "{\"plazosMeses\":[6,24]}" }` |
| Salida de la tool | lo que declara `@maya/schemas` | `SalidaSimularReestructura` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| Widget armado | `{ componente, datos, procedencia }` | `PlanDePago` con `opciones` de la tool y `procedencia.huella` sha256 |
| Rechazo | `{ ok: false, errores: string[] }` | `widget "plan".variantes (plan_de_pago): no acepta saldoCentavos` |

## Parámetros y umbrales

- **Cuatro cifras derivadas, declaradas.** `totalInteresesEstimadosCentavos = mensualidad ×
  pagosRestantes − saldoInsoluto` (la fórmula que ya declaraba el catálogo);
  `aportacionMinimaCentavos = min(50 000, aportación)` y `aportacionMaximaCentavos` son topes del
  slider, no datos; `plazoRestanteMeses` se acota a 1–360 (el schema del componente). Todas las
  demás cifras son hojas de la salida de la tool, y la prueba lo exige.
- **Hitos 1, 3, 6 y último**: los que ya mostraba la tarjeta; con menos de 2 pagos pendientes la
  fuente no aplica (el schema pide al menos 2).
- **15 movimientos** en el detalle: lo que cabe en la tarjeta; el total sale del rango completo.

## Límites y supuestos

- Se confía en que el MCP ya validó su salida con `@maya/schemas` (lo hace en cada tool). El
  adaptador importa los tipos de ahí, no revalida en tiempo de ejecución: `@maya/schemas` publica
  imports con `.js` y el web los usa solo como tipos.
- Un adaptador no interpreta: no suma, no estima, no compara contra otra tool. Si una tarjeta
  necesita un dato que ninguna tool da, **se agrega a la tool** (así nacieron
  `ahorroLiquidoCentavos` y `simular_rebalanceo`), no al adaptador.
- `fechaLimitePago` con plan activo es el primer pago del plan: es la fecha que la persona tiene
  que cumplir, aunque el nombre de la prop sea el de la tarjeta.

## Cómo se probó

`apps/web/src/lib/widgets/__tests__/fuentes.spec.ts`, contra salidas reales capturadas del MCP
(`fixtures/salidas-mcp.json`): props válidas para cada componente, casos que no aplican (Ana sin
tarjeta, Beto sin meta, un MCP sin `ahorroLiquidoCentavos`), la suma de categorías igual al
total, el detalle de restaurantes igual a su renglón en el gasto, y **toda cifra de una tarjeta
es una hoja de la salida de su tool** salvo las derivadas de arriba.
