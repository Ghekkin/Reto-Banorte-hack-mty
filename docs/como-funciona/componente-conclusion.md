---
verificado: 2026-09-12 17:05 (hora de Monterrey)
estado: construido
---

# `Conclusion`: la conclusión como tarjeta, no como párrafo

## Para cualquiera

Es la tarjeta de arriba: **lo que Maya te dice**, en grande. Una frase con el veredicto
("Tu plan ya está activo, pero tus retiros de efectivo se dispararon este mes"), debajo el
porqué y la recomendación, al lado las dos o tres cifras que lo sostienen, y abajo las
preguntas que podrías hacer después.

Es la única tarjeta del catálogo que no te muestra un dato: te muestra **la lectura** de
tus datos. Es lo que convierte una pila de tarjetas en una pantalla que alguien armó para
ti.

### Qué había antes

Ese mismo texto se pintaba arriba del lienzo como un párrafo gris chico, con un avatar
redondo a la izquierda. Es decir: con la forma de un mensaje de chat.

Dos problemas, y el segundo es el grave. El consejo —lo único que tu banco no te da hoy—
era lo **menos** visible de la pantalla, por debajo de cualquier monto de cualquier tarjeta.
Y con esa forma, la pantalla se leía como "un chat con tarjetas pegadas" en lugar de un
dashboard, que es justo al revés de lo que el proyecto propone: la pantalla *es* la
respuesta.

## Técnico

### Dónde vive

| Pieza | Archivo |
|---|---|
| Schema de props (lo que el modelo lee) | `packages/catalogo/src/conclusion/schema.ts` |
| Implementación React | `packages/catalogo/src/conclusion/componente.tsx` |
| Cuándo usarlo, props, acción | `packages/catalogo/src/conclusion/README.md` |
| Ejemplo renderizable (la "captura") | `packages/catalogo/ejemplos/conclusion.jsonl` |
| Registro en el renderer y en el catálogo | `packages/catalogo/src/index.ts` |
| Quien la pinta en Inicio | `apps/web/src/components/inicio/inicio-de-maya.tsx` |

### Props

`titular` y `razon` son las únicas obligatorias. `saludo`, `detalle`, `datos` (hasta 3) y
`sugerencias` (hasta 3) son opcionales, así que la tarjeta funciona con lo mínimo que el
host tenga.

Las cifras de `datos` llevan `tono` (`neutro` | `bueno` | `alerta`) y son las **mismas** que
ya están en las otras tarjetas, ya formateadas. El schema es explícito sobre esto: *"Si es
dinero, va con centavos y EXACTAMENTE igual que en la tarjeta que lo reporta: dos cifras
distintas para el mismo monto en la misma pantalla es lo que hace que nadie crea ninguna"*.

### No lleva `heroe`

Ya es la pieza dominante por tamaño de tipografía (`text-2xl`, `text-3xl` desde 28rem de
tarjeta). El degradado de marca está reservado para la tarjeta que carga **el** número de la
pantalla, y dos superficies gritando compiten entre sí. La regla del sistema de una sola
heroe por pantalla se respeta sin gastarla aquí.

### Aprovecha el ancho

Desde `@2xl/tarjeta` (42rem **de la tarjeta**, no de la pantalla) el titular y las cifras se
ponen lado a lado en `1.6fr 1fr` con un separador vertical; debajo de eso, una sola columna.
Es lo que evita que una tarjeta ancha deje su mitad derecha vacía, que era el otro defecto
del párrafo.

`text-balance` en el titular y `text-pretty` en el detalle: con dos renglones el navegador
reparte las palabras en vez de dejar una colgando.

### En Inicio la pinta el host

`InicioDeMaya` la arma con el `texto` y la `razon` que la portada **ya trae** validados,
partiendo el texto en titular y detalle con `partirEnTitular()` (corta en el primer punto
seguido de espacio; sin punto, todo es titular).

Es deliberado. Si dependiera de que el modelo emitiera el componente, una omisión suya
dejaría la pantalla sin veredicto — y `inicio-personalizado.md` registra que el modelo chico
omitió props obligatorias dos corridas seguidas teniendo la regla escrita. El componente
**sí** está en el catálogo, así que el agente de `/maya` puede emitirlo, y el encargo de
consulta (`encargoDeConsulta`) le pide explícitamente que la primera tarjeta sea esta.

Verificado con el modelo real: dos consultas distintas emitieron `Column · Conclusion ·
GastoPorCategoria` y `Column · Conclusion · ResumenTarjeta`, ninguna con `Text`.

### La acción

`preguntar` con `{ pregunta: string }` cuando alguien toca una sugerencia. En Inicio el host
la traduce a `/maya?intencion=…`.

Sin `alAccionar` las sugerencias se pintan `disabled`: en un lienzo de solo lectura —la
galería `/catalogo`, una portada sin host que atienda la acción— un botón que no hace nada
al tocarlo es peor que un texto que no invita a tocarlo.

### El estado de carga

Se arma con `esqueletos.tsx` (`EsqueletoTarjeta` + `Linea`), con la caja de línea exacta del
titular a dos renglones y del detalle a dos: en `/catalogo` la columna "Estado de carga"
mide lo mismo que "Con datos del ejemplo", así que la rejilla no salta al llegar los datos.
