---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-12 19:50
resuelto-en: mismo bloque (revisarProps valida sobre valores resueltos)
---

# `revisarProps` se saltaba las props enlazadas, y el modelo enlaza casi todo

**Dónde:** `apps/web/src/lib/agente/pantalla.ts`, `revisarProps`.

**Qué esperaba:** que la validación de props del host revisara las props de cada componente contra
el schema de su entrada del catálogo.

**Qué pasa:** las revisaba, pero **solo las literales**. Toda prop enlazada (`{"path":"/…"}`) se
omitía, con este argumento en el comentario:

> Las props enlazadas (`{path}`) no se pueden validar por valor —lo resuelve el cliente contra el
> data model—, asi que se omiten sus errores y se revisa todo lo demas.

El argumento es falso en el caso que importa: en `pintar_pantalla` el data model **viene en la misma
llamada** (`datosJson`), y en `ajustar_pantalla` también. Y como el modelo enlaza casi todo, en la
práctica **la mayoría de las props del catálogo no se validaban nunca**.

Este es el agujero por el que pasaron los tres bugs de cifras del 2026-09-12 sin que nada dijera
nada:

| Lo que llegó a pantalla | Por qué pasó |
|---|---|
| `$457,09.50` donde iban $4,570.95 | `datos` venía enlazada |
| aportación de $477 en un slider con piso de $500 | las tres props del rango venían enlazadas |
| siete cifras de inversión que ninguna tool calculó | todas enlazadas |

**Cómo quedó:** `revisarProps` acepta un `dataModel` opcional; con él, resuelve las props con
`resolverValor` de `@maya/a2ui` y valida el resultado. Sin él se comporta como antes. Lo que sigue
fuera es una prop cuyo path resuelve a `undefined`: puede ser un path **relativo de plantilla**
(`children: { componentId, path }`, que solo resuelve contra su elemento) o un dato que llegará
después. Ese es el único hueco que queda y está acotado.

En `ajustar_pantalla` se valida contra el data model **ya parcheado**, no contra el que llegó: un
parche de datos y uno de props del mismo turno pueden depender entre sí.

**Riesgo asumido:** esto caza errores del modelo que antes eran invisibles, así que puede subir los
reintentos. No se pudo medir con `probar-guion` porque la cuota de Gemini se agotó (ver abajo); las
dos corridas parciales del día no mostraron reintentos nuevos por esta causa.

**Pruebas:** `apps/web/src/lib/agente/__tests__/props-resueltas.spec.ts`, en particular "caza un
error dentro de un arreglo ENLAZADO, que antes era invisible" y "una prop enlazada a un path que NO
existe se sigue omitiendo".
