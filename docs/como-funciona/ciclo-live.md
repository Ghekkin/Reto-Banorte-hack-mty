# El ciclo LIVE: aclarar, ajustar o repintar

**Estado:** construido · **Dueño:** rol `contrato` · **Última verificación:** 2026-09-12

## Para cualquiera

Cuando ya tienes una pantalla enfrente y escribes algo más, lo que pides puede ser una de tres
cosas muy distintas:

1. **«¿por qué me sale tan alto?»** — no quieres otra pantalla, quieres que te expliquen la que
   ya estás viendo.
2. **«ordénalo por variación»**, **«muéstrame julio»**, **«y si fueran 24 meses»** — quieres la
   *misma* tarjeta, con otro parámetro.
3. **«¿cómo voy con mi ahorro?»** — eso ya es otro tema, y toca otra pantalla.

Antes las tres costaban lo mismo: la pantalla se tiraba y se volvía a construir de cero, con sus
esqueletos de carga, sus consultas al banco y unos seis segundos de espera. Preguntar «¿por qué?»
te borraba la tarjeta por la que preguntabas.

Ahora Maya distingue las tres. En el segundo caso **la tarjeta se actualiza en su lugar**: los
números cambian, el resto se queda quieto, y el plazo o el escenario que tú habías elegido no se
pierde. En el primero la pantalla no se toca en absoluto. Medido con el modelo real: una pantalla
nueva tarda ~4.7 s, un ajuste ~1.5 s, una aclaración ~2.9 s.

Y hay un tope: **tres tarjetas por pantalla como máximo**, contando la del veredicto. Cabe en un
celular, se lee de un vistazo y el botón nunca queda debajo del borde.

## Para quien va a tocar el código

### Las tres salidas del turno

Todo turno cierra llamando **una** de tres tools (`apps/web/src/lib/agente/cierre.ts`). **La tool
que elige el modelo ES la clasificación de intención**: no hay clasificador previo, ni heurísticas
sobre los verbos del texto.

| Tool | Emite | Qué hace el cliente |
|---|---|---|
| `responder` | nada | la pantalla se queda como está |
| `ajustar_pantalla` | `updateDataModel` por parche, más un `updateComponents` parcial si cambia una prop literal. **Nunca `createSurface`** | **actualiza** la pantalla que ya estaba en el hilo |
| `pintar_pantalla` | `createSurface` + `updateComponents` + `updateDataModel` en `/` | **apila** una pantalla nueva |

Por qué tools y no un clasificador aparte: cero latencia extra, un solo punto de falla en vez de
dos, y la decisión queda visible en la tira de transparencia, que es lo que el jurado tiene que
poder ver. El modelo ya está leyendo la pregunta; no hace falta que otro se la lea.

**En el primer turno solo existe `pintar_pantalla`.** Lo decide `crearCierre(pantallaActual?)`: sin
pantalla previa no hay nada que ajustar ni que aclarar, y ofrecer las tres invitaría al modelo a
contestar con texto — exactamente lo que este producto existe para no hacer. Lo mismo aplica a un
cliente que no mande el árbol de la pantalla.

Una **acción que muta estado** sigue obligada a `pintar_pantalla`: hay que volver a pintar la
tarjeta que cambió, y eso es la prueba del ciclo (`historial.ts`, rama de `peticion.accion`).

### Por qué el motor ya lo soportaba

Nada de esto necesitó tocar `packages/a2ui`. Ya estaba:

- `procesar()` aplica un `updateDataModel` **sin tocar `componentes` ni `raiz`** (`procesar.ts:45-56`).
- `<Superficie>` llama `resolver(propsDe(c), dataModel, item)` **en cada render** (`Superficie.tsx:152`),
  así que un data model nuevo produce props nuevas sin más.
- `usarAgente` guarda el estado en `useState` y `procesar` nunca muta: referencia nueva → re-render.

Lo que faltaba era **una forma de mandar el parche**. `armarMensajes` emitía siempre los tres
mensajes juntos, y `createSurface` **borra el data model** (`procesar.ts:21`), así que el ciclo
completo era el único camino posible.

### El árbol viaja en la petición

Para parchear hay que poder nombrar lo que ya existe. La petición lleva ahora
`superficie.arbol: Componente[]` (`agente/tipos.ts`), con los componentes **tal cual se emitieron**:
id, props, enlaces `{ path }`, `children` y `action`. Lo llena `componentesVisibles(superficie)` en
`usar-agente.ts` — el árbol alcanzable desde la raíz, no el `Map`, que acumula la conversación
entera (issue #3).

Van **completos y no solo las props** porque `updateComponents` **reemplaza** el componente por id;
para parchear una prop hay que volver a mandar el resto. `armarParches` hace la fusión
(`{ ...viejo, ...props }`).

El contexto del turno lo imprime compacto, una línea por componente
(`gasto · GastoPorCategoria · categorias→/gasto/categorias, periodo="2026-08"`): la flecha marca lo
que es enlace, que es la parte parcheable. `razon` se omite (frase larga, no se parchea). Y el data
model, si pasa de 2000 caracteres, se resume en **rutas con su tipo** en vez de cortarse por la
mitad: recortar el JSON pierde justo el final, que es donde están las rutas que el modelo
necesitaría, y deja un JSON roto que invita a copiarlo mal.

### Qué valida `ajustar_pantalla`

`apps/web/src/lib/agente/ajustar.ts`:

- cada `path` de `parchesDatos` existe en el data model entrante, o existe el objeto que lo
  contiene (agregar una llave a algo que ya está es legítimo; inventarse un subárbol, no);
- cada `id` de `parchesComponentes` existe en el árbol entrante, y el error lista los ids que sí hay;
- las props del componente **fusionado** se validan contra su schema Zod (`revisarProps`);
- `id`, `component`, `children` y `action` no se pueden parchear: cambiar la estructura es repintar;
- un parche vacío se rechaza y se le dice al modelo cuál de las otras dos salidas quería.

El tope de tarjetas **no** se revisa aquí: un parche solo toca ids que ya existen, así que no puede
meter una cuarta tarjeta por la puerta de atrás.

Los parches se aceptan **como arreglo nativo o como texto JSON**. Las dos formas hacen falta: en el
primer ensayo con el modelo real, Gemini mandó `parchesDatos` como arreglo (que es lo natural
leyendo la descripción), el schema pedía `string`, y el turno gastó un paso reintentando por algo
que no era error de nadie.

### El tope de 3 tarjetas

`TOPE_DE_TARJETAS = 3` en `agente/pantalla.ts`, y es de **código**, no una línea del prompt: el
prompt ya lo decía («de 1 a 4») y el modelo se pasaba igual. Lo único que se validaba por cantidad
era `heroe <= 1`.

- Se cuenta sobre el **árbol** alcanzable desde `root`, sin los cuatro de layout: un componente que
  nadie declara como hijo no se pinta, y contarlo rechazaría pantallas que caben de sobra.
- El primer rebase vuelve al modelo como error de tool, para que **él** elija cuál tarjeta sobra.
- En el último intento se **poda** (`podarAlTope`): se conserva la `Conclusion` y las demás en el
  orden en que se lee la pantalla, y la raíz se rearma como `Column` con solo esas. Un turno nunca
  muere por el tope.

### Los cinco componentes que no se resincronizaban

`PlanDePago`, `SimuladorMeta`, `ProyeccionCrecimiento`, `EscenariosInversion` y `RiesgoRendimiento`
sembraban su `useState` desde las props **solo al montar**. La `key` la deriva el motor del id, así
que la tarjeta no se remonta entre turnos: un parche a `/planElegido` re-renderizaba la tarjeta pero
**dejaba el control en el valor viejo**. Para la persona: pidió un cambio y no pasó nada.

No se notaba porque cada turno rearmaba todo. Con el ciclo live se notaría siempre. Lo arregla
`usarEstadoSeguido` (`packages/catalogo/src/estado.ts`), que ajusta el estado **durante el render**
—el patrón que React documenta— y no con un `useEffect`: un efecto pintaría un frame con el valor
viejo, y en un slider eso se ve como un salto. La decisión de quién gana (la persona o el agente)
es la función pura `seguir`, probada en `estado.spec.ts`.

### Props de variante

Lo que el agente puede ajustar sin pedir datos nuevos. Las que ya existían:
`escenarioInicial`, `instrumentoSeleccionadoId`, `plazoElegido`, `periodo`, `plazoMeses`,
`horizonteMeses`, y `maximo` en `Calendario`.

**`orden` y `limite`, en cinco componentes.** Empezaron en `GastoPorCategoria` y el 2026-09-12 se
extendieron a los cuatro que faltaban, al inventariar el catálogo buscando por dónde podía el usuario
cambiar un parámetro hablando. El hallazgo fue que **cuatro componentes listaban colecciones sin
ninguna prop de orden ni límite**, así que «muéstrame solo las 3 suscripciones más caras» obligaba a
repintar la pantalla con datos nuevos aunque el componente ya los tuviera todos. Era asimetría del
catálogo, no falta de información:

| Componente | `orden` | Qué pone primero lo que no es el default |
|---|---|---|
| `GastoPorCategoria` | `monto` · `variacion` · `nombre` | la que más subió, para «qué se me disparó» |
| `AlertaFugas` | `monto` · `sinUso` · `nombre` | las que no se usan (y dentro, las más caras): las que conviene cancelar |
| `DetalleCategoria` | `fecha` · `monto` · `comercio` | el gasto más fuerte |
| `DistribucionPortafolio` | `peso` · `desviacion` · `nombre` | la clase que más se salió del modelo, que es la lectura que lleva al rebalanceo |
| `OrdenRebalanceo` | `monto` · `tipo` · `instrumento` | las **ventas** primero: es el orden en que se ejecutan, hay que liberar efectivo antes de comprar |

`limite` recorta la lista tras ordenar, y **lo que deja fuera se resume**, no desaparece: un renglón
neutro con el conteo y la suma («y 2 cargos más — $164.00»). Si desapareciera, la suma de los renglones
no cuadraría con el total del encabezado y quien lo lea no sabría a cuál de los dos números creerle. En
`GastoPorCategoria` el aviso ámbar «Faltan X sin desglosar» sigue reservado para cuando el modelo
recortó `categorias` de verdad, que es el bug que ese aviso existe para delatar.

Dos detalles que se cuidaron al extenderlo:

- En `DistribucionPortafolio`, `limite` recorta **la lista de al lado, no la dona**: un pedazo de dona
  no suma 100 %. Y el color se ata a la clase (`claseId`), no a su posición, para que reordenar no
  cambie los colores.
- En `OrdenRebalanceo`, el botón confirma **todas** las operaciones, también las que el límite no
  lista; el renglón de resumen lo dice con esas palabras («y 2 operaciones más en la orden»).

### La validación mira las props RESUELTAS

Hasta el 2026-09-12 `revisarProps` se saltaba toda prop enlazada (`{"path":"/…"}`) porque "no se puede
validar por valor". Como el modelo enlaza casi todo, en la práctica **la mayoría de las props no se
validaban nunca**, y por ahí pasaron tres bugs de cifras el mismo día sin que nada dijera nada.

El argumento era falso en el caso que importa: tanto en `pintar_pantalla` como en `ajustar_pantalla`
**el data model viene en la misma llamada**. Ahora se resuelve con `resolverValor` y se valida el
resultado. Lo único que sigue fuera es una prop cuyo path resuelve a `undefined`: un path relativo de
plantilla, o un dato que llegará después.

En `ajustar_pantalla` se valida contra el data model **ya parcheado**, no contra el que llegó: un
parche de datos y uno de props del mismo turno pueden depender entre sí, y validar contra el modelo
viejo reportaría un error que el turno ya arregló.

Detalle en `docs/issues/2026-09-12-props-enlazadas-sin-validar.md`.

## Cómo se prueba

```bash
pnpm test                 # 619 pruebas; las de esto: agente.spec.ts, hilo.spec.ts, estado.spec.ts,
                          # props-resueltas.spec.ts, props-de-vista.spec.tsx
pnpm reiniciar-estado     # ANTES de cualquier ensayo, o un plan ya aplicado falsea el resultado
pnpm probar-inicio        # 3 portadas con el modelo real: exactamente 3 tarjetas, una Conclusion
```

Y a mano, sobre una pantalla ya pintada, los tres tipos de turno: «¿por qué me sale tan alto?»
(cero `a2ui`), «ordénalo por variación» (solo `updateDataModel`/`updateComponents`, sin parpadeo),
«¿cómo voy con mi ahorro?» (repintado con 3 tarjetas). El `fin` del stream lleva `cierre` con cuál
de las tres fue, así que es comprobable desde la tira de transparencia.

## Lo que no está verificado

El guion completo con el modelo real. La cuota gratuita de Gemini es **por modelo** y se agotó dos
veces el 2026-09-12: primero las 20 peticiones diarias de `gemini-3.8-flash`, y después los 250,000
tokens de entrada de `gemini-3.5-flash-lite`, al que se cambió con la variable nueva `MODELO_GEMINI`.
De los 10 pasos, **los 2 que alcanzaron a correr pasaron** («Beto · detalle de una categoría» y «Ana ·
MISMA pregunta, otra interfaz», esta última pintando `ProyeccionPagoCredito` + `SimuladorMeta` en 3
pasos); los otros 8 fallaron con `0 pasos` y error de cuota, no de código. `pnpm probar-inicio` sí
corrió completo: **3 de 3**.

Lo que eso deja sin medir es lo más importante de este bloque: **si la validación sobre props
resueltas sube los reintentos**. Caza errores que antes eran invisibles, así que puede costar pasos.
En las dos corridas parciales no apareció ninguno por esa causa, pero dos turnos no son una medición.

Sí quedó verificado a mano en el navegador: la galería completa sin errores de consola, el hilo
sobreviviendo al cambio de pestaña y al F5, y el cambio de usuario limpiando el chat y redirigiendo a
Inicio. En esa pasada apareció un defecto nuevo, ya registrado y **sin arreglar**:
`docs/issues/2026-09-12-aviso-de-renderer-en-la-conversacion.md`.
