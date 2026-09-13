---
estado: construido (fases 0 a 7); fase 8 abierta
creado: 2026-09-13
construido: 2026-09-13 02:40
origen: revision de la demo con el equipo de Banorte
---

> **Construido.** La referencia viva es [`docs/como-funciona/widgets-vivos.md`](../como-funciona/widgets-vivos.md)
> y el [ADR 0011](../decisiones/0011-cifras-solo-del-mcp.md). Este plan se deja como estaba para
> leer qué se propuso; al final, [qué cambió al construirlo](#qué-cambió-al-construirlo).

# Plan: widgets vivos en Inicio, con cifras que solo pone el MCP

## Para cualquiera

En la revisión, Banorte dijo que cada pregunta en Inicio se siente como **pasar de una
diapositiva a otra**: escribes algo y el dashboard entero se borra y se vuelve a armar.
Lo que quieren es poder **preguntarle a una tarjeta**: si mi Inicio muestra mis
inversiones, tocar esa tarjeta, preguntar «¿y en los últimos 12 meses?» y que **esa
misma tarjeta** cambie, con las demás quietas.

Y una condición que el equipo pone encima: **los números que aparecen después del cambio
tienen que salir del MCP (de la base), nunca escritos por Gemini.**

La idea en una frase: **el modelo decide qué preguntar al banco; el banco contesta con los
números; un código fijo los acomoda en la tarjeta.** El modelo nunca teclea una cifra.

## Lo que hay hoy (y por qué no alcanza)

| Pieza | Hoy | Problema |
|---|---|---|
| Preguntar en Inicio | `preguntarEnInicio` (`app/(app)/acciones.ts`) corre `generarPortada` con la pregunta y **reemplaza la portada completa** en `banorte.pantallas_inicio`, luego `revalidatePath("/")` | Es el «cambio de ppt»: se tira todo, recarga del servidor, ~7–11 s |
| Ajuste en vivo | `ajustar_pantalla` (`lib/agente/ajustar.ts`) ya parchea sin `createSurface`, **pero solo en `/maya`** | Inicio no lo usa |
| De dónde salen los números | `pintar_pantalla.datosJson` y `ajustar_pantalla.parchesDatos[].value` los **escribe el modelo**, copiando de los resultados de las tools | Se valida la **forma** (Zod, rutas existentes), **no el valor**. Gemini puede redondear, cruzar o inventar una cifra y pasa |
| El texto de Maya | `texto`, `razon`, `Conclusion.titular/cifras` escritos por el modelo | Mismo riesgo: una cifra en prosa no se contrasta con nada |
| Una tarjeta sabe de dónde vino | No. El data model no guarda qué tool ni qué argumentos lo produjeron | No se puede re-consultar ni auditar una tarjeta sola |

Lo que sí sirve tal cual: el motor A2UI ya aplica `updateDataModel` sin tocar el resto
(`procesar.ts`), `<Superficie>` re-resuelve props en cada render, y `usarEstadoSeguido`
ya resincroniza los controles de las tarjetas. **No hay que tocar `packages/a2ui`.**

## El diseño

### 1. Cada tarjeta es un widget con fuente

Cada tarjeta de Inicio pasa a ser un **widget**: `widgetId`, componente, y su **fuente**:

```ts
type FuenteDeWidget = {
  tool: string;                         // "consultar_historico_inversion"
  argumentos: Record<string, unknown>;  // validados con el schema Zod de la tool
  adaptador: string;                    // "historico→RendimientoHistorico"
};
type Procedencia = FuenteDeWidget & {
  llamadaId: string; en: string;        // cuándo se consultó
  huella: string;                       // sha256 del resultado crudo del MCP
};
```

Sus datos viven en `/w/<widgetId>/…` del data model, y la procedencia en un mapa del
lado del servidor (y en la fila de `pantallas_inicio`), no en el data model que ve el
modelo.

### 2. Adaptadores: el único camino de un número a la pantalla

Un **adaptador** es una función pura, en código, `(salidaDeLaTool, variantes) → datos del
componente`. Uno por par tool→componente. Ejemplos:

| Tool MCP | Componente | Variantes que acepta (sin cifras) |
|---|---|---|
| `consultar_inversiones` | `DistribucionPortafolio` | `orden`, `limite`, `clase` |
| `consultar_historico_inversion` | `RendimientoHistorico` | `horizonteMeses` (enum 3/6/12/24) |
| `analizar_gasto` | `GastoPorCategoria` | `periodo` (AAAA-MM), `orden`, `limite` |
| `simular_reestructura` | `PlanDePago` | `plazoElegido` (de los plazos que devolvió la tool) |
| `proyectar_ahorro` | `SimuladorMeta` / `ProyeccionCrecimiento` | `horizonteMeses` |
| `consultar_creditos` | `ProyeccionPagoCredito` | `creditoId` |

- La entrada se valida con el schema de `@maya/schemas` y la salida con el schema del
  componente en `@maya/catalogo`. Si cualquiera falla, el widget no cambia.
- El catálogo declara por componente `fuentes: [{ tool, adaptador, variantes }]`. Es la
  **lista blanca**: el modelo no puede alimentar `DistribucionPortafolio` con
  `analizar_gasto`.
- Los parámetros que el modelo sí elige son **enums, fechas o ids que ya existen**, nunca
  montos ni porcentajes.

### 3. Una salida nueva del turno: `modificar_widget`

Se agrega a las tres de `cierre.ts` (en Inicio, `pintar_pantalla` deja de ofrecerse):

```ts
modificar_widget({
  widgetId: "inversiones",
  tool: "consultar_historico_inversion",
  argumentos: { horizonteMeses: 12 },
  variantes: { orden: "rendimiento" },   // opcional, solo enums del catálogo
  texto: "…",                             // ver punto 5
})
```

Lo que hace **el servidor**, no el modelo:

1. Revisa que `widgetId` exista en la pantalla viva y que `tool` esté en las `fuentes`
   de ese componente.
2. Valida `argumentos` con el Zod de la tool y **fuerza `usuarioId` desde la cookie**
   (el modelo no lo elige).
3. **Llama al MCP** y guarda el resultado crudo con su hash.
4. Corre el adaptador → valida contra el schema del componente.
5. Emite `updateDataModel` en `/w/<widgetId>` y, si hay variantes, `updateComponents` del
   componente fusionado. Nunca `createSurface`.
6. Si el widget cambia de componente (p. ej. de distribución a histórico), es
   `reemplazar_widget`: mismo hueco, otro componente, misma regla de fuentes. El tope de
   3 tarjetas no se toca.

Las otras salidas en Inicio:

| Salida | Qué pasa en pantalla |
|---|---|
| `responder` | Una nota anclada **debajo del widget** preguntado; el dashboard no se mueve |
| `modificar_widget` | Solo esa tarjeta cambia, con transición de números |
| `reemplazar_widget` | Solo ese hueco cambia de tarjeta |
| `pintar_pantalla` | Solo con «rehaz mi inicio» explícito o desde el reloj/acción, nunca por una pregunta |

### 4. Pintar la portada también por fuentes (cierra el hueco de raíz)

`pintar_pantalla` en `generar.ts` cambia `datosJson` por una fuente por tarjeta:
el modelo elige tarjetas + fuentes + variantes; el servidor consulta y adapta. Aprovecha
el prefetch de `reunirDatos`: si la tool y los argumentos coinciden con lo ya consultado,
se reusa ese resultado (misma huella), así que no sube la latencia.

Con esto **ningún número de ninguna tarjeta de Inicio sale del modelo**, ni en la
portada ni en los ajustes.

### 5. Cifras en el texto: verificador

`texto`, `razon` y la `Conclusion` siguen siendo del modelo, así que se agrega
`verificarCifras(texto, resultadosDelTurno)` (`lib/widgets/cifras.ts`):

1. Extrae montos, porcentajes y plazos del texto (`$12,340.50`, `8.7 %`, `24 meses`).
2. Cada uno tiene que coincidir, con tolerancia de redondeo de presentación, con un valor
   de los resultados del MCP de ese turno o de los datos adaptados del widget.
3. Si uno no aparece: primer intento vuelve al modelo como error de tool con la cifra
   señalada; en el último intento se quita la frase con la cifra y se deja lo demás.

Mejor aún para la `Conclusion`: sus `cifras` pasan a ser **enlaces** a rutas de
`/w/<id>/…` en vez de números literales.

Es heurística → lleva su doc en `docs/algoritmos/verificacion-de-cifras.md`.

### 6. La interacción en pantalla (web)

- Cada tarjeta de Inicio lleva un botón «Preguntar sobre esto» (48 px, shadcn `Button`
  variante `ghost`). Al tocarlo, la barra de abajo muestra un chip `Sobre: Inversiones`
  (`Badge`) y las sugerencias de ese widget.
- La pregunta viaja con `foco: widgetId` y el árbol + data model de ese widget solamente
  (menos tokens, menos tentación de tocar lo demás).
- Mientras corre: esqueleto **solo en esa tarjeta**, el resto intacto. Al llegar, los
  números cambian con transición (CSS + `tw-animate-css`, sin librerías nuevas) y un
  resaltado breve con el token de acento.
- Sin foco, el modelo elige el widget por nombre (el contexto lista `widgetId · componente
  · título`), o responde con nota.
- En la tarjeta, una línea `text-xs`: `Datos: consultar_historico_inversion · 10:42`.
  Es la evidencia MCP para el jurado.

### 7. Persistencia sin recargar

- Nueva ruta `POST /api/inicio/widget` (stream JSONL, igual que `/api/agente`) en lugar
  de la server action con `revalidatePath`: el cliente aplica los mensajes con `procesar`
  sobre la superficie que ya tiene. Cero `router.refresh()`, cero flash.
- El servidor aplica los mismos mensajes a la fila de `pantallas_inicio` (con
  `procesarVarios`) y guarda las procedencias, **manteniendo la huella de hoy** (misma
  regla que ya existe: el reloj no borra tu ajuste mientras la cuenta no se mueva).
- Migración `db/migraciones/0003-procedencia-widgets.sql`: columna `procedencias jsonb`.

## Validar que los datos son del MCP y no de Gemini

Es criterio de «hecho», no un extra.

| Prueba | Qué comprueba | Dónde |
|---|---|---|
| Adaptadores | Cada adaptador sobre el volcado de pruebas produce props válidas y los montos son **idénticos** a la salida de la tool | `lib/widgets/__tests__/adaptadores.spec.ts` |
| Modelo tramposo | Un modelo mock que manda cifras en `variantes`, una tool fuera de la lista blanca, un `widgetId` que no existe o `usuarioId` ajeno → todo rechazado, la pantalla no cambia | `modificar-widget.spec.ts` |
| Auditor | `auditarPantalla(estado, procedencias)`: vuelve a llamar al MCP con cada procedencia, corre el adaptador y compara **igualdad profunda** con el data model de cada widget | `lib/widgets/auditar.ts` + spec |
| Verificador de cifras | Textos con cifra correcta, redondeada, inventada y cruzada entre widgets | `cifras.spec.ts` |
| Modelo real | `pnpm probar-widgets`: por persona, 3 preguntas sobre un widget (Carmen: «¿y a 12 meses?» sobre inversiones; Beto: «¿y a 24 meses?» sobre el plan; Ana: «muéstrame julio» sobre gasto). Pasa si: cierre = `modificar_widget`, **cero `createSurface`**, solo cambian rutas `/w/<foco>`, y el auditor da 0 diferencias | `scripts/probar-widgets.mjs` |
| En vivo | En desarrollo, el auditor corre tras cada turno y escribe `{"widget":"auditoria","diferencias":N}` en el log; `N > 0` es un issue | `/api/inicio/widget` |
| Navegador | 390 y 1 440 px: preguntar sobre una tarjeta, las otras dos no se re-montan (mismo nodo DOM), sin errores de consola | Playwright / Chrome |

## Fases y reparto

Cada fase deja `main` arrancando: todo detrás de `FEATURE_WIDGETS_VIVOS` (en
`.env.example`, default `0`). Con el flag apagado, Inicio es idéntico a hoy.

| Fase | Qué | Rol dueño | Depende de | Tamaño |
|---|---|---|---|---|
| **0. ADR y contrato** | ADR 0011 «las cifras de un widget solo salen del MCP»; tipos `FuenteDeWidget`/`Procedencia`; `fuentes` en las entradas del catálogo; esquema de `modificar_widget` | `contrato` | — | S |
| **1. Adaptadores** | Los 6 adaptadores de la tabla con sus pruebas sobre el volcado; revisar que las tools devuelvan todo lo que el componente necesita (si falta un campo, se agrega en la tool, opcional) | `mcp` + `contrato` | 0 | M |
| **2. `modificar_widget` en servidor** | Tool de cierre, llamada al MCP desde el servidor, adaptador, mensajes, auditor, pruebas de modelo tramposo | `contrato` | 1 | M |
| **3. Ruta y persistencia** | `POST /api/inicio/widget` en stream, aplicar a `pantallas_inicio`, migración 0003, foco en el contexto | `contrato` | 2 | M |
| **4. UI** | «Preguntar sobre esto», chip de foco, esqueleto por tarjeta, transición de números, nota anclada, línea de procedencia (con `diseno-banorte` y `shadcn`) | `web` | 3 (contra mock desde la fase 0) | M |
| **5. Portada por fuentes** | `pintar_pantalla` de `generar.ts` con fuentes en vez de `datosJson`, reuso del prefetch, `VERSION_DEL_GENERADOR` +1 | `contrato` | 2 | M |
| **6. Verificador de cifras** | `cifras.ts`, cifras de `Conclusion` como enlaces, doc de algoritmo | `contrato` | 2 | S |
| **7. Ensayo y guion** | `probar-widgets`, actualizar `guion-demo.md` y `pitch.md` con el momento «le pregunto a la tarjeta», marcar `estable` | `demo` | 4, 5 | S |
| 8. (después) `/maya` | Llevar `ajustar_pantalla` de la conversación a la misma regla de fuentes: hoy tiene el mismo hueco | `contrato` | 5 | M |

`web` arranca en paralelo con la fase 0: la UI se construye contra un mock de
`/api/inicio/widget` que devuelve mensajes fijos.

## Documentos que cambian

- Nuevo: `docs/decisiones/0011-cifras-solo-del-mcp.md`
- Nuevo: `docs/como-funciona/widgets-vivos.md` (dos niveles)
- Nuevo: `docs/algoritmos/adaptadores-de-widget.md` y `docs/algoritmos/verificacion-de-cifras.md`
- Actualizar: `inicio-personalizado.md` (la sección «el pizarrón que se borra» deja de ser
  cierto con el flag encendido), `ciclo-live.md`, `agente.md`, `catalogo.md`,
  `.env.example`, `CLAUDE.md` (mapa)

## Riesgos y decisiones abiertas

- **Preguntas que ninguna fuente contesta** («¿conviene vender?»): van a `responder` con
  nota anclada; si la nota necesita cifras, pasan por el verificador. No se fuerza un widget.
- **Latencia**: `modificar_widget` suma una llamada al MCP desde el servidor (~100–300 ms
  en local) pero quita la generación del data model por el modelo (menos tokens de salida).
  Se mide en `probar-widgets`; objetivo < 3 s por ajuste.
- **Tolerancia del verificador**: demasiado estricta tira frases buenas («casi 9 %»);
  demasiado laxa deja pasar cruces. Empezar con coincidencia exacta al redondeo mostrado
  y relajar solo con casos reales.
- **Acciones desde el widget** (aplicar plan): siguen yendo a `/maya` como hoy. Ejecutarlas
  en el lugar es un siguiente paso, fuera de este plan.

## Qué cambió al construirlo

- **Props literales, no `/w/<widgetId>` en el data model.** Las portadas guardadas ya traían todo
  como props literales, y los adaptadores producen props validadas contra el catálogo. Un cambio
  viaja como `updateComponents` de la tarjeta (el motor reemplaza por id, sin remontar las demás).
- **`parametros` y `variantes` como texto JSON.** Con `string | record`, `gemini-3.8-flash` no
  contestaba y el lite mandaba `{}`.
- **El turno usa el modelo chico con pensamiento mínimo** (`MODELO_WIDGETS`) y repite un intento
  que no cierra en 11 s: 1.1–2.4 s por pregunta en `pnpm probar-widgets`.
- **El modo no entra a la huella**: base compartida con producción; en su lugar, una portada sin
  procedencias se considera vencida solo donde el flag está encendido.
- **El MCP ganó `simular_rebalanceo` y `ahorroLiquidoCentavos`** (fase 1): dos tarjetas no tenían
  de dónde sacar sus cifras.
- **Fase 8 (`/maya`) no se hizo**: registrada como issue
  (`docs/issues/2026-09-13-cifras-escritas-por-el-modelo-en-maya.md`).
