---
verificado: 2026-09-13 07:05
implementado-en: apps/web/src/lib/agente/pantalla.ts (normalizarListaDeComponentes, propsDelMcp, comparacionDelMcp, adoptarAlias, quitarPropsNoDeclaradas, nombresParecidos)
lenguaje: typescript
---

# Normalización de la pantalla que entrega el modelo

## Para cualquiera

Cuando Maya arma una pantalla, a veces la manda incompleta: le falta el saldo de una tarjeta, o
escribe solo el nombre de la tarjeta («ProyeccionPagoCredito») sin sus datos. Antes de validar,
el host repara lo que se puede reparar.

La regla es una: **se completa con lo que dijo el banco, nunca con un número de ejemplo.** Si en
el turno se consultó la herramienta que tiene ese dato, se toma de ahí, con la misma traducción
que usan las tarjetas de Inicio. Si no se consultó, el hueco se queda vacío, la pantalla se
rechaza y el modelo recibe el error para consultar y corregir. Una pantalla rechazada cuesta un
paso más; una pantalla con cifras que no son de la persona le miente.

Hasta el 2026-09-13 esos huecos se llenaban con constantes (el saldo de la tarjeta de Beto como
saldo de cualquier crédito, una tasa de 27.9 %, un portafolio de CETES que Ana no tiene, una
máscara `ÔÇóÔÇóÔÇóÔÇó 4821` con la codificación rota). Issues #23 y #28.

Y la reparación respeta una forma legítima de mandar un dato: el **enlace** al data model
(`{"path": "/portafolio/rendimientoTotalPct"}`). Un enlace se deja como enlace; se resuelve
después, al validar (issue #39).

Por último, **lo que sobra se quita**. El validador del catálogo rechaza la pantalla entera por una
sola prop que el componente no tiene. Si el modelo escribe `tasaAnual` en vez de `tasaAnualPct`, el
host pone el dato donde va y borra el nombre viejo; si le pone `heroe` a un plan de pago (que no
puede ser héroe) o un `portafolioId` a la dona, se quita porque nunca se pintaría. Lo que **no** se
tira en silencio es un nombre que parece un error de dedo de una prop que falta (`datoClav` por
`datoClave`): ese se deja para que la validación lo nombre y el modelo lo corrija (issue #42).

## La idea

El modelo no escribe cifras (ADR 0011): las elige de lo que devolvieron las tools. Los widgets de
Inicio ya tienen, por componente, un **adaptador** que convierte la salida de una tool en las
props del componente (`apps/web/src/lib/widgets/fuentes.ts`, `docs/algoritmos/adaptadores-de-widget.md`).
La normalización usa esos mismos adaptadores sobre los resultados del turno: si hay una forma
correcta de leer `consultar_tarjeta` (con su `tarjeta` anidada) o `analizar_gasto` (con su `gasto`
anidado), existe una sola vez y la usan los dos caminos.

## Paso a paso

`normalizarListaDeComponentes(lista, entrada, datos)`, por cada elemento:

1. Texto JSON → objeto (rescate de cercas y comas colgantes).
2. Nombre suelto de un componente → su esqueleto `{ id, component, razon }` (y `heroe` en
   `ProyeccionPagoCredito` y `ComparadorAntesDespues`). Sin cifras: las pone el paso 5.
3. Aplana props anidadas (`props`, `data`…) y adopta los alias genéricos (`tasaAnual`,
   `TasaAnualPct` → `tasaAnualPct`, solo si el componente declara `tasaAnualPct`).
4. **Guarda las props que son enlace** (`esBinding`).
5. Por componente, completa **solo las props que faltan** con `propsDelMcp(componente, datos)`:
   recorre las fuentes de widgets de ese componente, toma la salida de su tool en `datos` (o
   anidada en una tool compuesta: `analizar_ahorro.ahorro` = `proyectar_ahorro`,
   `analizar_ahorro.inversion` = `consultar_inversiones`, `analizar_gasto.fugas` =
   `detectar_fugas`) y corre su adaptador. Si no hay tool, o su salida no tiene la forma del
   schema (el adaptador falla o lanza), devuelve `{}` y no se completa nada.
6. Los componentes sin adaptador:
   - `ComparadorAntesDespues`: `comparacionDelMcp` arma los dos caminos con `simular_pago_credito`
     (`actual` contra `simulado`; costo total = saldo + intereses) o, si no está,
     `simular_reestructura` (el escenario de pagar el mínimo contra la opción recomendada).
   - `AvisoConsultaNoValida`: solo props del schema, con lo que devolvió
     `orientar_consulta_no_valida` (#40).
   - `SimuladorMeta` sin proyección: el tope del slider sale de
     `panorama_inicial.capacidadPagoMensualCentavos`.
   - `AlertaFugas`: el `pctDelIngreso` que falte sale de la tool o de total mensual ÷
     `panorama_inicial.perfil.ingresoMensualCentavos`.
   - `ProyeccionCrecimiento`, `EscenariosInversion`, `RiesgoRendimiento`: ninguna tool los llena
     todavía; solo se derivan totales cuando vienen sus sumandos.
   Los alias por componente (`veredicto`/`texto`/`titulo`/`mensaje` → `titular`;
   `objetivoCentavos` → `metaCentavos`; `aportacionMensualCentavos` → `aportacionCentavos`; en el
   comparador `title`, `ahorro*`, `mesesAhorrados`/`ahorroMeses`, `actual`/`antes`/`escenario1`,
   `estrategia`/`despues`/`escenario2`/`propuesta`; en fugas `totalMensual`, `totalAnual`,
   `pct_del_ingreso` y sus formas con `_`) pasan por `adoptarAlias`/`quitarAlias`: el primero con
   valor llena la prop real si falta, y **todos se borran** salvo que el alias sea también prop
   declarada de ese componente (`antes` es alias en el comparador y prop real de
   `GastoPorCategoria`). Lo borrado se anota en `quitadas`.
7. **Repone los enlaces** del paso 4 tal cual, **menos los de `quitadas`** (un alias enlazado no
   vuelve), y quita cualquier prop que haya quedado en `NaN` (una cuenta hecha sobre un enlace o un
   texto): la validación la reporta como faltante.
8. **`quitarPropsNoDeclaradas`**: toda prop que el catálogo publicado no le permite al componente
   (las de su schema más `id`, `component`, `accessibility` y `weight`; `propsDeclaradas()` las lee
   de `catalogo.json`, lo mismo que mira el validador oficial) se quita, **salvo** que
   `nombresParecidos` la empareje con una prop declarada que falta. Esa se deja para que la
   validación diga «la propiedad "X" no existe». `children` y `child` nunca se tocan (las revisa la
   validación del árbol). El layout no pasa por aquí.
9. Arma la raíz `Column` con todas las tarjetas.

Después, `armarMensajes` valida contra el catálogo y los JSON Schema oficiales
(`validacion-a2ui.md`); lo que falte sale como error hacia el modelo.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| `lista` | los componentes del modelo (objetos o nombres) | `["ProyeccionPagoCredito"]` |
| `entrada` | `EntradaPintarPantalla` | `razon`, `texto`, `sugerencias` |
| `datos` | data model del turno: `panorama_inicial` + salida de cada tool por su nombre + `datosJson` | `{ consultar_creditos: {…} }` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| componentes | `Componente[]` | `ProyeccionPagoCredito` con `saldoInsolutoCentavos: 5578308` (de la tool) o sin él (rechazo) |

## Parámetros y umbrales

- Un `amortizacionResumen` con menos de 2 hitos se reemplaza por el del adaptador (2 es lo que
  el adaptador exige para dibujar la curva).
- `aportacionMinimaCentavos` del simulador: el adaptador pone `min(50 000, aportación)`, el piso
  que declara el catálogo.
- Los montos en pesos menores a 1 000 que el modelo manda en fugas y movimientos se pasan a
  centavos (heurística previa, sin cambio).
- `nombresParecidos(a, b)`, después de pasar a minúsculas y quitar `_` y `-`: iguales; uno prefijo
  del otro con el más corto de **4** letras o más (`tipo`/`tipoInvalidez`); o a **2** ediciones o
  menos con el más corto de **5** o más (`metaCentavo`/`metaCentavos`). Solo se compara contra
  props declaradas que **faltan**: si la real ya está, el parecido sobra y se quita.

## Límites y supuestos

- `datos` incluye el data model de la pantalla anterior: una salida de tool de un turno viejo
  puede completar un hueco (dato real, quizá desactualizado).
- Si el modelo manda una cifra escrita a mano, la normalización no la contrasta: eso es de
  `verificacion-de-cifras.md` (widgets) y de la validación.
- Los textos de relleno sin cifras (etiquetas, «Aplicar plan», «Camino actual») se conservan.
- Un enlace dentro de un arreglo (una fila de fugas) no se protege en el paso 4; solo los de
  primer nivel y los de los escenarios del comparador.
- El paso 8 solo mira el primer nivel del componente: una llave de más dentro de una opción o de
  una fila la sigue reportando la validación.
- Quitar una prop de sobra puede esconder una intención del modelo que no se parece a ningún
  nombre declarado (un `heroe` en `PlanDePago` no se pinta como héroe). Es el costo aceptado:
  antes esa pantalla se rechazaba completa y el turno pagaba otra petición.
- `ajustar_pantalla` (`ajustar.ts`) no pasa por esta normalización: sus parches se validan con
  `revisarProps`.

## Cómo se probó

- `apps/web/src/lib/agente/__tests__/normalizacion-sin-cifras-inventadas.spec.ts` (37 pruebas):
  cada componente del catálogo, suelto y sin datos, sale **sin un solo número**; con la tool,
  sale con las cifras de la persona; los enlaces de `DistribucionPortafolio`,
  `ProyeccionPagoCredito`, `TermometroSaludFinanciera`, `OrdenRebalanceo` y del comparador
  llegan intactos; el aviso con los argumentos reales de `cor_8b16275bd37741cdbb601853` pasa.
  Contra el `pantalla.ts` anterior fallan 31 de las 37.
- `normalizacion-fugas.spec.ts` y `normalizacion-gasto.spec.ts`: las reparaciones de antes, ahora
  con los datos de una tool en vez de relleno.
- Repetición de las 142 llamadas a `pintar_pantalla` grabadas en `banorte.corrida_tools` el
  2026-09-13: pasan 116 (antes 99). Se arreglaron 18 (15 avisos de #40, 3 portafolios con
  enlaces de #39) y una se rechaza ahora: una portada de Beto cuyo `consultar_creditos` no traía
  la amortización, que antes salía con hitos, tasa e intereses inventados.
- `apps/web/src/lib/agente/__tests__/normalizacion-alias.spec.ts` (42 pruebas, #42): cada alias
  reconocido, en un componente por lo demás válido, deja la prop real, desaparece y la pantalla
  pasa `armarMensajes` (con el validador oficial); un alias enlazado no reaparece; `antes` sigue
  en `GastoPorCategoria`; los dos rechazos reales por prop inexistente de hoy (`portafolioId` en
  `DistribucionPortafolio`, `heroe` en `PlanDePago`) pasan; un nombre mal escrito de una opcional
  sigue rechazado con su nombre, y el de una obligatoria sigue saliendo como faltante. Contra el
  `pantalla.ts` de `8060918` fallan 26 de las 33 que no dependen de `nombresParecidos`.
- Repetición de las 164 llamadas a `pintar_pantalla` grabadas el 2026-09-13 desde las 00:00: pasan
  141 contra 135 del código anterior. Las 6 que se arreglan son por prop de sobra (`portafolioId`
  ×2, `valorActualCentavos`, `heroe` ×3). Ninguna que pasaba se rechaza ahora.
