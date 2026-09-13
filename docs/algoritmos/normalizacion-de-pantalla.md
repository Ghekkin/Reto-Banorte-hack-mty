---
verificado: 2026-09-13 07:55
implementado-en: apps/web/src/lib/agente/pantalla.ts (entradaPintarPantalla, armarMensajes, normalizarListaDeComponentes, limpiarLlaves, inferirComponente, propsDelMcp, comparacionDelMcp, adoptarAlias, quitarPropsNoDeclaradas, nombresParecidos, tiposDeProp, valorCompatible, completarAccion, accionParecida)
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
tira en silencio es un nombre que parece un error de dedo de una prop que falta (issue #42): si es un
texto con un solo destino posible (`salud: "Hola, Alberto"` por `saludo`, `datoClav` por `datoClave`),
el texto pasa a su lugar; si es un número, una lista o un objeto, se deja para que la validación lo
nombre y el modelo lo corrija, porque ahí un nombre parecido puede traer otra unidad (pesos por
centavos). Y si el valor ni siquiera es del tipo de la prop parecida (un objeto donde va un texto), no
es error de dedo: se quita como cualquier sobrante (issue #46).

Y nada de eso sirve si la llamada no llega a la reparación. La puerta de `pintar_pantalla` (el
schema que revisa la librería del modelo antes de entregarnos la llamada) exigía que cada tarjeta
trajera su identificador y su nombre; si faltaba uno, rechazaba la llamada entera con un mensaje de
decenas de líneas y el turno pagaba otro intento, aunque el host sabía ponerle el identificador. Pasó
23 veces el 13, incluido el primer paso del guion. Ahora la puerta deja pasar la tarjeta y el host
decide: le pone identificador, deduce el nombre cuando sus datos solo caben en una tarjeta del
catálogo, recorta una cuarta pregunta sugerida, y si de plano no sabe qué tarjeta es, le contesta al
modelo en una línea. Igual con los botones: si el modelo le pone a una tarjeta una acción que esa
tarjeta no tiene, se cambia por la suya en vez de rechazar la pantalla (issue #43).

## La idea

El modelo no escribe cifras (ADR 0011): las elige de lo que devolvieron las tools. Los widgets de
Inicio ya tienen, por componente, un **adaptador** que convierte la salida de una tool en las
props del componente (`apps/web/src/lib/widgets/fuentes.ts`, `docs/algoritmos/adaptadores-de-widget.md`).
La normalización usa esos mismos adaptadores sobre los resultados del turno: si hay una forma
correcta de leer `consultar_tarjeta` (con su `tarjeta` anidada) o `analizar_gasto` (con su `gasto`
anidado), existe una sola vez y la usan los dos caminos.

## Paso a paso

**Antes de todo, la puerta del SDK** (`entradaPintarPantalla`, el `inputSchema` de la tool). En cada
componente, `id` y `component` son **opcionales** y el resto de las props queda abierto
(`passthrough`); `razon` es texto sin mínimo. Las descripciones siguen pidiéndole al modelo que los
mande. Lo que la puerta deja pasar lo decide lo de abajo (#43).

`armarMensajes(entrada)` primero fija la **razón del turno**: si la del modelo no sirve (menos de 10
caracteres, o la palabra «razon»), usa el `texto` cuando este sí sirve. Es la que heredan las
tarjetas sin razón propia.

`normalizarListaDeComponentes(lista, entrada, datos, errores)`, por cada elemento:

1. Texto JSON → objeto (rescate de cercas y comas colgantes).
2. Nombre suelto de un componente → su esqueleto `{ id, component, razon }` (y `heroe` en
   `ProyeccionPagoCredito` y `ComparadorAntesDespues`). Sin cifras: las pone el paso 5.
3. Aplana props anidadas (`props`, `data`…), **limpia llaves** con comillas o espacios de sobra
   (`"\"component"` → `component`, sin pisar una llave limpia), **infiere `component`** si falta
   (`inferirComponente`, abajo) y adopta los alias genéricos (`tasaAnual`,
   `TasaAnualPct` → `tasaAnualPct`, solo si el componente declara `tasaAnualPct`). Un objeto que
   sigue sin `component` y trae props propias no se tira: va a `errores` con una línea
   («`componentesJson[3]` (id "credito") no dice qué componente es…») y `armarMensajes` devuelve eso
   solo. Un objeto vacío de props propias se ignora, como antes.

   `inferirComponente(objeto)`: sin props propias y con `children` → `Column`. Con menos de dos props
   propias (las que no son `id`, `component`, `razon`, `ancho`, `heroe`, `action`, `accessibility`,
   `weight`, `children`, `child`) → nada. Si no, cada componente del catálogo se puntúa con cuántas
   props propias del objeto declara (`propsDeclaradas`, de `catalogo.json`); gana el mejor solo si
   declara al menos el 60 % de ellas y le saca 2 o más al segundo.
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
   de `catalogo.json`, lo mismo que mira el validador oficial) se quita, **salvo** que parezca un
   nombre mal escrito de una prop declarada. Las **candidatas** son las props declaradas que faltan,
   que `nombresParecidos` empareja con ella y cuyo tipo acepta el valor (`valorCompatible`: los tipos
   JSON que `tiposDeProp()` lee del schema publicado; un enlace `{path}` o un tipo que no se puede
   leer cuentan como compatibles) (#46):
   - **una** candidata, valor de **texto** y la candidata acepta texto: se **adopta** (el valor pasa
     a la prop real y el nombre mal escrito se borra);
   - una o más candidatas en cualquier otro caso (número, arreglo, objeto, enlace, o varias): se
     deja para que la validación diga «la propiedad "X" no existe»;
   - ninguna candidata (no se parece a nada que falte, o el valor es de otro tipo): se quita.
   `children` y `child` nunca se tocan (las revisa la validación del árbol). El layout no pasa por
   aquí.
9. Arma la raíz `Column` con todas las tarjetas.

En `Conclusion`, además, las `sugerencias` se recortan a 3, el máximo de su schema (#43).

Después, `armarMensajes` valida contra el catálogo y los JSON Schema oficiales
(`validacion-a2ui.md`); lo que falte sale como error hacia el modelo. Justo antes del validador
oficial, `completarAccion` revisa el botón de cada tarjeta: sin `action`, pone la primera de
`acciones` del catálogo (como siempre); con una `action` cuyo `event.name` **no** está en `acciones`,
la cambia por la permitida que comparte un sustantivo con la pedida (`accionParecida`:
`ver_plan_pago` → `simular_plan`, ignorando verbos como `ver`, `simular`, `consultar`) o, si no hay
una sola así, por la primera, con `context: {}`. Una permitida se respeta tal cual. La de un
componente sin `acciones` ya la quitó el paso 8, porque su schema no declara `action` (#43).

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
- Compatibilidad de tipo (`tiposDeSchema`): `type` (con `integer` como número), los valores de
  `enum` y `const`, y las ramas de `anyOf`/`oneOf`/`allOf`; las ramas que solo son `$ref` (el enlace
  y la llamada a función de A2UI) no suman tipo. Solo se **adopta** texto: los números, arreglos y
  objetos parecidos siempre vuelven al modelo con su nombre.
- `inferirComponente`: **2** props propias como mínimo; el ganador declara al menos el **60 %** de
  ellas y le saca **2** o más al segundo. Con esos umbrales, en las 23 llamadas reales infiere
  `ResumenTarjeta` (×2), `DistribucionPortafolio`, `ProyeccionPagoCredito` y una tarjeta con
  `maximo`/`titulo`/`eventos` (`Calendario`), y no adivina con `{titulo, detalle}`.
- `accionParecida`: sustantivos de más de 2 letras, fuera los verbos `ver`, `simular`, `consultar`,
  `aplicar`, `elegir`, `crear`, `confirmar`, `programar`, `registrar`, `cancelar`, `rebalancear`,
  `orden`, `preguntar`; gana solo si **una** permitida comparte alguno.

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
- Adoptar un texto parecido puede poner el texto en una prop que el modelo no quería si su nombre
  cae a 1-2 letras de otra declarada que falta y es la única candidata; el daño se limita a un texto
  en otro renglón de la misma tarjeta, nunca a una cifra.
- Quitar una prop de sobra puede esconder una intención del modelo que no se parece a ningún
  nombre declarado (un `heroe` en `PlanDePago` no se pinta como héroe). Es el costo aceptado:
  antes esa pantalla se rechazaba completa y el turno pagaba otra petición.
- `ajustar_pantalla` (`ajustar.ts`) no pasa por esta normalización: sus parches se validan con
  `revisarProps`. Su `inputSchema` ya aceptaba los parches como texto o arreglo abierto; en las
  corridas del 13 no hubo ninguna llamada suya rechazada por el SDK, así que no se tocó.
- Sin `razon` **y** sin `texto` la llamada la sigue rechazando el SDK (2 de las 23 del 13): son
  obligatorias en el schema porque son lo que Maya le dice a la persona.
- Inferir `component` puede equivocarse si el modelo mezcla props de dos tarjetas: el margen de 2
  sobre el segundo lo hace raro, y un error ahí lo reporta la validación de props del inferido.
- Cambiar una acción no permitida pierde el `context` que puso el modelo: los componentes llenan el
  suyo al tocarse.
- Relajar el `inputSchema` cambia las definiciones de tools que se le mandan al modelo: invalida el
  caché de Gemini una vez.

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
  numérica sigue rechazado con su nombre (desde #46 el de una opcional de texto se adopta), y el de
  una obligatoria sigue saliendo como faltante. Contra el
  `pantalla.ts` de `8060918` fallan 26 de las 33 que no dependen de `nombresParecidos`.
- Repetición de las 164 llamadas a `pintar_pantalla` grabadas el 2026-09-13 desde las 00:00: pasan
  141 contra 135 del código anterior. Las 6 que se arreglan son por prop de sobra (`portafolioId`
  ×2, `valorActualCentavos`, `heroe` ×3). Ninguna que pasaba se rechaza ahora.
- `apps/web/src/lib/agente/__tests__/entrada-pintar-pantalla.spec.ts` (13 pruebas, #43), con
  llamadas reales de `banorte.corrida_tools` en `fixtures/pintar-rechazadas-43.json`: componentes
  sin `id` (2382), sin `component` (2851 → `ResumenTarjeta`, 2836 → `ProyeccionPagoCredito`), la
  llave `"\"component"` (216), una `Conclusion` con 4 sugerencias (2372) y el aviso de «quiero
  invertir» con `ver_plan_pago` (2929 → `simular_plan`) pasan `entradaPintarPantalla` y
  `armarMensajes`; un objeto sin `component` que no se puede inferir sale como un solo error corto;
  una razón «razon» hereda el `texto`; `inferirComponente` no adivina con pocas props o empate.
  Contra el `pantalla.ts` de `origin/main` (`4f00835` + `974a8d0`) fallan las 13.
- Repetición de las **23** llamadas del 13 rechazadas por el SDK con `Invalid input for tool
  pintar_pantalla`: con el código anterior el SDK rechazaba 22 (la otra ya pasaba); ahora pasan
  **16**, el SDK rechaza 2 (sin `razon` ni `texto`) y 5 vuelven al modelo con errores cortos (3 con
  `razon`/`titular` de relleno como «razon», 2 con hitos de amortización sin `periodo`).
- Repetición de las **170** llamadas a `pintar_pantalla` del 13 desde las 00:00: pasan **153**
  contra 137 del código anterior (15 del SDK y el aviso con acción no permitida). Ninguna que pasaba
  se rechaza ahora.
- `apps/web/src/lib/agente/__tests__/prop-parecida.spec.ts` (5 pruebas, #46), con la llamada real del
  ensayo del guion contra producción (`fixtures/pintar-salud-46.json`, `corrida_tools` 3042, «Beto ·
  simulador de ahorro»): `salud: "Hola, Alberto"` pasa a `saludo` y la pantalla se arma a la primera;
  `salud` con un objeto o un número se quita sin tocar `saludo`; con `saludo` ya puesto el parecido
  se quita sin pisarlo; un enlace en el nombre parecido sigue saliendo como error con su nombre. Contra
  el `pantalla.ts` de `108e722` fallan 3 de las 5, y también la de `datoClav` modificada en
  `normalizacion-alias.spec.ts`.
- Repetición de las **191** llamadas a `pintar_pantalla` del 13: pasan **173** contra 172 de
  `108e722` (la 3042). Ninguna que pasaba se rechaza ahora; las 18 que siguen fallando son por otras
  causas (cifras de apoyo sin `valor`, hitos sin `periodo`, textos de relleno, árbol con hijos
  inexistentes, props obligatorias sin tool en el turno).
