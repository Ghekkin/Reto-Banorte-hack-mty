# `Conclusion`

## Para qué sirve

Es lo que Maya te **dice**, no lo que te muestra. La lectura de tu situación en una frase
grande, con las dos o tres cifras que la sostienen y las preguntas que podrías hacer
después.

Es el único componente del catálogo que no reporta un dato: reporta el criterio. Y es la
pieza que convierte una pila de tarjetas en una pantalla que alguien armó para ti.

## Cuándo lo elige el agente

**Siempre, y como primera tarjeta de la pantalla.** Si emites `Conclusion`, el `texto` del
turno puede ir vacío: esta tarjeta ya lo dice, y mejor.

Cuándo **no**:

- Para reportar un dato suelto. Ese dato tiene su propia tarjeta.
- Para confirmar una acción que acabas de ejecutar. Eso es `Confirmacion`.
- Dos veces en la misma pantalla. Es la lectura, y hay una.

## Por qué existe

Antes, el `texto` del turno se pintaba arriba del lienzo como un párrafo
`text-sm text-muted-foreground` con un avatar a la izquierda: la forma de un mensaje de
chat. Eso tenía dos costos, y el segundo es el que importa.

El consejo —lo único que tu banco no te da hoy— era el elemento con **menos** peso visual
de la pantalla, por debajo de cualquier monto de cualquier tarjeta. Y con forma de burbuja,
la pantalla se leía como "un chat con tarjetas pegadas" en lugar de un dashboard. El
encuadre del reto es justo el contrario: la pantalla ES la respuesta.

## Props

| Prop | Obligatoria | Qué es |
|---|---|---|
| `titular` | sí | LA frase. Una oración, segunda persona, con el veredicto. Va en el tamaño más grande de la tarjeta |
| `razon` | sí (de `PropsBase`) | El "¿Por qué veo esto?" de siempre |
| `saludo` | no | Una línea corta antes del titular: "Hola, Alberto" |
| `detalle` | no | De una a tres frases: el porqué y la recomendación |
| `datos` | no | Hasta 3 cifras que sostienen el titular, con `tono` (`neutro` \| `bueno` \| `alerta`) |
| `sugerencias` | no | Hasta 3 preguntas de seguimiento; tocarlas dispara `preguntar` |

Las cifras de `datos` son las **mismas** que ya están en las otras tarjetas, ya formateadas
y cortas ("$3,193", "+74%", "39/100"). No son datos nuevos: son el ancla del titular.

## Acción

`preguntar` con `{ pregunta: string }` cuando alguien toca una sugerencia. Sin `alAccionar`
las sugerencias se pintan deshabilitadas: un botón que no hace nada al tocarlo es peor que
un texto que no invita a tocarlo.

## Cómo se ve

Desde 42rem de **tarjeta** (no de pantalla) el titular y las cifras se ponen lado a lado
en `1.6fr 1fr`, con un separador vertical. Abajo de eso, en una sola columna. Es lo que
evita que una tarjeta ancha deje su mitad derecha vacía, que era el otro defecto del
párrafo.

El titular usa `text-balance` y el detalle `text-pretty`: con dos renglones, el navegador
reparte las palabras en vez de dejar una sola colgando.

## Ejemplo

`packages/catalogo/ejemplos/conclusion.jsonl` — la portada de Beto con el plan ya aplicado.
Es la captura de este componente; ábrelo en `/catalogo`.
