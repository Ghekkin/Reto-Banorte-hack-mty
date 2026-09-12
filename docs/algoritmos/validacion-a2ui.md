---
verificado: 2026-09-12 01:55
implementado-en: packages/a2ui/src/esquema.ts
lenguaje: typescript
---

# Validación de un mensaje A2UI contra los schemas oficiales

## Para cualquiera

Cuando Maya describe una pantalla, antes de dibujarla hay que comprobar que la
descripción esté bien: que el componente exista, que no le falte nada, que no se haya
inventado una propiedad. Eso lo hace un verificador automático a partir de las reglas
**oficiales** del protocolo A2UI, las mismas que publicó Google, sin que nosotros
escribamos ninguna regla a mano.

Hay un detalle que vale la pena entender porque es el truco central: las reglas
oficiales no dicen qué componentes existen. Dejan ese hueco abierto a propósito, para
que cada quien ponga su propio catálogo. Nosotros metemos el nuestro en ese hueco. El
resultado es que el verificador oficial termina revisando nuestras tarjetas financieras.

Y cuando algo está mal, el error tiene que servirle al modelo para corregirse, no
solamente para decir "no". Por eso la segunda mitad de esto es conseguir **un** error
claro en vez de ochenta.

## La idea

`server_to_client.json` (el schema oficial del mensaje) referencia los componentes así:

```json
{ "$ref": "catalog.json#/$defs/anyComponent" }
```

Es una ref **relativa y sin resolver**: se resuelve contra el `$id` del propio schema,
o sea `https://a2ui.org/specification/v0_9/catalog.json`. Ese archivo no existe en la
spec. El que decide qué hay ahí es quien compila los schemas. Entonces:

- si registramos el **catálogo básico oficial** bajo ese id → podemos correr los 76
  casos de conformidad de la spec tal cual vienen;
- si registramos **el nuestro** → los mismos schemas oficiales validan `Confirmacion`.

Un solo validador, dos catálogos, cero reglas propias. Lo único que se necesita es que
nuestro `catalogo.json` tenga la forma de un catálogo A2UI, y eso lo garantiza el
generador (`pnpm catalogo`).

La segunda mitad del problema es la legibilidad. El schema del mensaje es un `oneOf` de
los cuatro verbos, y cada componente es otro `oneOf` sobre los 18 del catálogo. Un
`variant` mal escrito produce **81 errores**: los de las tres ramas de verbo que no
aplican, más uno por cada componente que tampoco encaja. Medido, no estimado. Para un
modelo que tiene que corregirse en el siguiente paso, eso es ruido puro.

La salida es no entrar por arriba: el JSON **ya dice** qué es. Si trae la llave
`updateComponents`, se valida contra `$defs/UpdateComponentsMessage`; si un componente
dice `component: "Confirmacion"`, se valida contra `#/components/Confirmacion`. Son los
mismos schemas oficiales, leídos más adentro.

## Paso a paso

1. Se compila ajv (draft 2020-12) con cuatro documentos: `common_types.json`,
   `server_to_client.json`, `client_to_server.json` y **el catálogo**, este último
   registrado bajo el `$id` que la ref relativa espera.
2. Llega un mensaje. Se mira cuál de los cuatro verbos trae. Si no trae exactamente uno,
   se acaba ahí con un error claro.
3. Se valida contra el `$defs` de ese verbo. Los errores que caen dentro de
   `/updateComponents/components/…` se descartan, igual que los del keyword `oneOf`:
   esos los produce el siguiente paso, con precisión.
4. Si es `updateComponents`, para cada componente: si su nombre no está en el catálogo,
   el error lo dice **y lista los que sí existen**. Si está, se valida contra el schema
   de ese componente y sus errores se traducen a la posición real en el mensaje
   (`/updateComponents/components/2/tono`).
5. Cada error se traduce a castellano accionable: un `enum` incluye los valores
   aceptados, una propiedad no evaluada dice su nombre, un `required` dice qué falta.

Para conformidad existe aparte `validadorDeDocumento()`, que **sí** entra por arriba y
no recorta nada: es el que corren los 76 casos oficiales. Si la spec dice que algo es
inválido, ahí sale inválido.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|
| catálogo | objeto JSON Schema | `packages/catalogo/catalogo.json` o el básico de `spec/` |
| mensaje | `unknown` | `{ version, updateComponents: { surfaceId, components } }` |

| Salida | Tipo | Ejemplo |
|---|---|---|
| errores | `{ donde, mensaje }[]` | `[{ donde: "/updateComponents/components/0/tono", mensaje: "Confirmacion: must be equal to one of the allowed values: \"exito\", \"informativo\"" }]` |

Vacío significa válido. `crearValidador` nunca lanza: un mensaje que ni parece mensaje
también sale como error, porque quien llama ya tiene cómo reportarlo.

## Parámetros y umbrales

- `strict: false` en ajv: los schemas oficiales usan `discriminator` (estilo OpenAPI) y
  `format: uri`, que en modo estricto serían error de compilación. No afecta la
  validación; con `ajv-formats` instalado, `format` se comprueba de verdad (sin él, un
  caso oficial de los 76 pasaba de más).
- `allErrors: true`: se quieren todos los problemas de un componente en una sola pasada,
  para que el modelo los arregle todos juntos y no uno por turno.
- Compilar cuesta unos cientos de milisegundos, así que el agente crea el validador
  **una vez por proceso** (`esquemaDelCatalogo()` en `apps/web/src/lib/agente/pantalla.ts`).

## Límites y supuestos

- **Props enlazadas**: cada prop se publica como `anyOf: [<schema>, DataBinding]`, así
  que `{ "path": "/…" }` vale en cualquier prop. Lo que no se valida es un enlace
  *parcial* (un objeto literal con un `{path}` adentro): o la prop entera es enlace, o
  los datos van al data model. Es el mismo límite que tiene la spec con sus `Dynamic*`.
- **`anyFunction` está definido como "nada válido"**: no implementamos `functionCall`.
  Si algún día se implementa, hay que llenar `functions` en el catálogo.
- El validador **no** comprueba que los hijos citados existan (eso es
  `revisarArbolCompleto` en `validar.ts`) ni que los paths del data model existan (eso
  solo se sabe al pintar, y es legítimo que lleguen después).
- Corre en el servidor. En el navegador el cerco es el de nombres, que no necesita ajv.

## Cómo se probó

- `packages/a2ui/src/__tests__/conformidad.test.ts` — los 8 archivos oficiales, 76
  casos, con el catálogo básico. Incluye los que deben fallar.
- `packages/catalogo/src/__tests__/catalogo.spec.ts` — con nuestro catálogo: un enum mal
  puesto nombra los valores válidos, una prop inventada se nombra, un componente
  inventado lista los que existen, un enlace se acepta en cualquier prop, y falta de
  `razon` se rechaza.
- `packages/a2ui/src/__tests__/renderer.test.ts` — que `validarMensaje` delega en el
  validador y que **no** lo llama si la estructura ya venía mal.
