---
estado: resuelto
severidad: baja
area: mcp
encontrado: 2026-09-12 19:30
resuelto-en: mismo bloque
---

# Parámetros que existían en el dominio y no estaban conectados

**Qué pasa:** al inventariar los 21 componentes del catálogo contra las 23 tools buscando por dónde
podía el usuario "cambiar un parámetro desde la entrada de texto", salieron cuatro casos donde la
capacidad **ya existía** y no estaba expuesta. Todos son la misma clase de defecto: la persona pide
un cambio razonable, no hay por dónde pedirlo, y el modelo contesta de memoria.

## 1. `analizar_gasto` recibía `periodo` y tiraba lo demás (severidad media)

`comparar_periodos` acepta **dos periodos arbitrarios** (`periodo` y `periodoAnterior`), pero la
fachada `analizar_gasto` —que el prompt pide preferir— solo declaraba `periodo` y llamaba a la
atómica sin `periodoAnterior` (`analizar-gasto.ts:39`). Lo mismo con `detectar_fugas`, que acepta
`mesesSinUso` y se llamaba sin argumentos (`:41`). Consecuencia: "compáralo con julio" y "¿qué no he
usado en seis meses?" no tenían efecto por la vía normal.

**Arreglado:** los dos parámetros se declaran y **se pasan**.

## 2. `consultar_sugerencias_inversion.horizonteMeses` era un parámetro MUERTO (severidad baja)

Se declaraba en el schema, se pasaba a `generarSugerenciasInversion` y la función lo recibía como
tercer argumento… y **nunca se usaba en el cuerpo**. El modelo creía estar afinando la respuesta con
algo que no movía nada.

**Arreglado:** ahora descarta los instrumentos que piden más plazo del horizonte (leyendo el número
de `plazoMinimo`, que es texto libre porque es lo que se le muestra a la persona) y promueve el más
corto que sí quepa. Se conserva la invariante de que siempre queda una sugerencia recomendada: una
lista sin recomendación deja a la persona eligiendo sola, que es lo que la tarjeta existe para evitar.

## 3. `consultar_inversiones` no dejaba ver el modelo de otro perfil (severidad baja)

`modeloRecomendadoPara(perfil)` existe y es genérica, pero la tool solo aceptaba `usuarioId`, así que
"¿y si fuera agresivo?" no se podía contestar.

**Arreglado:** `perfil` opcional. El perfil **real** de la persona no cambia en la salida: se agrega
`perfilDelModelo` y `perfilEsHipotetico`, porque sin esa bandera el modelo —y quien vea la pantalla—
podría creer que su perfil cambió.

## 4. `proyectar_ahorro` solo iba objetivo → meses (severidad baja)

La relación inversa ("¿cuánto junto en 18 meses?") no se podía pedir: el modelo tendría que
multiplicar por fuera, que es exactamente la clase de cuenta mental que produjo el `$504,785`.

**Arreglado:** `horizonteMeses` opcional, que devuelve `montoAlcanzableCentavos` y
`alcanzaEnElHorizonte`. **Lineal y sin rendimiento**, igual que el resto de la tool: un apartado no
invierte, y esa decisión ya estaba documentada en `proyectar-ahorro.ts:145`.

**Pruebas:** `apps/mcp/src/__tests__/parametros-expuestos.spec.ts`, 14 casos.

## Lo que NO era un hueco, y conviene saberlo

- `comparar_periodos` **sí** acepta dos meses cualesquiera.
- `consultar_historico_inversion` **sí** acepta de 2 a 52 semanas, así que "y a un año" ya funcionaba.
- `consultar_movimientos` acepta `desde`/`hasta`, `categoriaId` y `limite`.
