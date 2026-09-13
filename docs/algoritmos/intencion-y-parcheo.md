# Intención y parcheo: cómo se decide qué hacer con una pregunta de seguimiento

**Dónde vive:** `apps/web/src/lib/agente/cierre.ts` (las tres salidas),
`apps/web/src/lib/agente/ajustar.ts` (los parches), `apps/web/src/lib/agente/pantalla.ts`
(el tope y la poda), `packages/catalogo/src/estado.ts` (`seguir`).

## La idea en palabras

Una pregunta de seguimiento puede ser tres cosas, y cuestan muy distinto: aclarar lo que ya se ve,
cambiarle un parámetro a lo que ya se ve, o pedir otra pantalla. El algoritmo no las adivina con
reglas sobre el texto: **le da al modelo tres puertas y la que abre es la clasificación**.

Dos decisiones deterministas rodean esa elección, y son las que sí son algoritmo: **cuántas tarjetas
caben** (con un recorte reproducible si el modelo se pasa) y **quién gana cuando la persona movió un
control y el agente manda otro valor**.

## 1 · Clasificación por elección de tool

**Entrada:** el turno (texto o acción), más `superficie.arbol` y `superficie.dataModel` si el
cliente reportó que hay pantalla.

**Pasos:**

1. Si no hay `superficie.arbol` con al menos un componente → el conjunto de salidas es
   `{ pintar_pantalla }`. Fin: no hay nada que ajustar ni que aclarar.
2. Si hay → el conjunto es `{ pintar_pantalla, ajustar_pantalla, responder }`.
3. En los últimos `PASOS_RESERVADOS_PARA_PINTAR` (2) pasos del turno, `prepareStep` fija
   `toolChoice: "required"` y `activeTools` = solo esas salidas. Con una sola disponible equivale a
   forzarla; con tres, obliga a cerrar pero deja la elección al modelo.
4. Una acción entrante que muta estado añade al contexto la instrucción de cerrar con
   `pintar_pantalla`: hay que volver a pintar la tarjeta que cambió. **Excepción**: si la acción está
   en `ACCIONES_EN_SU_LUGAR` (hoy `programar_abono_capital`), la instrucción es cerrar con
   `ajustar_pantalla` sobre la tarjeta que la disparó (`instruccionDeAccion` en `historial.ts`,
   `docs/como-funciona/ajustes-en-vivo.md`).
5. El turno termina en cuanto una salida se ejecuta sin errores (`stopWhen`), o a los 2 intentos
   fallidos, o al tope de 8 pasos.

**Salida:** `cierre.con()` ∈ `{"pintar", "ajustar", "responder"}`, que viaja en el `fin` del stream.

**Límites:** el modelo puede clasificar mal. Se mitiga con la regla «si dudas, `pintar_pantalla`» en
el prompt y con que las tres salidas son válidas siempre: clasificar mal cuesta una pantalla de más,
nunca un dato incorrecto. No hay medición de con qué frecuencia acierta; los tres casos del guion
acertaron en las dos corridas del 2026-09-12.

## 2 · Tope de tarjetas y poda determinista

**Entrada:** el arreglo de componentes que mandó el modelo. **Salida:** el mismo arreglo, o un error
para el modelo, o un arreglo recortado.

**Pasos:**

1. Recorrer en anchura desde `root` siguiendo `children`/`child` y `children.componentId`. Un
   componente que nadie declara como hijo **no cuenta**: no se pinta.
2. Descartar los cuatro de layout (`Column`, `Row`, `Text`, `Divider`): agrupan, no son una idea.
3. Si el resto es ≤ 3, no se toca nada.
4. Si es > 3 y **no** es el último intento: error de tool con la cuenta y los nombres, para que el
   modelo elija cuál sobra. Él sabe cuál contesta la pregunta; el código no.
5. Si es > 3 y **sí** es el último intento (`podarAlTope`):
   - conservar la `Conclusion` (si viene) y después las demás en el orden en que se lee la pantalla,
     hasta llenar 3;
   - recolectar el subárbol completo de cada conservada, para no dejar hijos sin definir;
   - rearmar `root` como `Column` con solo esas — reusar sus `children` viejos dejaría ids que ya no
     existen, y un hijo fantasma tumba el árbol entero;
   - si `root` **no** es de layout, devolver el arreglo intacto: no hay forma de recortar sin
     inventar un árbol. No se da con una pantalla real (las tarjetas del catálogo no llevan hijos).

**Por qué 3:** cabe en un celular sin desplazar, y el botón nunca queda debajo del borde. El número
vive en `TOPE_DE_TARJETAS`.

**Por qué en código y no en el prompt:** el prompt ya lo pedía («de 1 a 4») y el modelo se pasaba
igual. La única regla de cardinalidad que se validaba era `heroe <= 1`.

## 3 · Validación de un parche

**Entrada:** `parchesDatos: {path, value}[]`, `parchesComponentes: {id, props}[]`, `pantalla?`, la
pantalla actual y hasta 3 anteriores. **Salida:** mensajes A2UI (con el id de la pantalla si fue una
de arriba), o errores para el modelo.

Primero se elige **contra qué pantalla** se valida (`elegirPantalla`): sin `pantalla`, o con el id de
la actual, es la actual; con el id de una anterior, esa; con un id que no viajó, error con la lista de
las que sí. Todo lo de abajo se revisa contra el árbol y el data model de la elegida: dos pantallas
pueden tener un `conclusion` cada una y no chocan.

Un parche es aceptable cuando:

- `path` empieza con `/` y **existe** en el data model entrante, o existe el objeto que lo contiene.
  La segunda mitad es deliberada: activar una variante que el data model todavía no tenía
  (`/gasto/orden`) es legítimo; construir `/inversiones/portafolio/clases` de la nada es otra
  pantalla, no un ajuste.
- trae `value`. Borrar una llave (que la spec permite omitiendo `value`) no se acepta por esta vía.
- `id` existe en el árbol entrante, y el componente no es de layout.
- las props **fusionadas** (`{...viejo, ...nuevas}`) pasan el schema Zod de su entrada del catálogo.
- no toca `id`, `component`, `children` ni `action`.

**Por qué se fusiona:** `updateComponents` reemplaza el componente por id (así lo define la spec y
así lo hace `procesar`), no fusiona campo por campo. Mandar solo la prop nueva dejaría la tarjeta sin
sus datos.

## 4 · Quién gana el control: `seguir`

El caso: la persona arrastró el slider a 24 meses, y el agente parchea la prop a 36.

**Entrada:** `valorDelAgente` (la prop de ahora), `anterior` (el valor del agente que se vio en el
render pasado), `valor` (lo que la persona tiene puesto). **Salida:** `{ valor, anterior }`.

**Regla:** gana la persona **mientras el agente no cambie de opinión**. En cuanto
`valorDelAgente !== anterior`, ese pisa al local y se recuerda como `anterior` para no volver a
pisar en el render siguiente — si no, el slider quedaría pegado y no se podría arrastrar.

Se compara con `Object.is` porque lo que se sigue es siempre un primitivo (un plazo, unos centavos,
un id de instrumento).

**Se ajusta durante el render, no en un `useEffect`.** Es el patrón que React documenta para
"ajustar estado cuando una prop cambia": React descarta el render en curso y vuelve a renderizar de
inmediato, sin pintar el intermedio. Un efecto pintaría un frame con el valor viejo, y en un slider
eso se ve como un salto.

**Límite conocido:** si la persona mueve el control al mismo valor que el agente va a mandar, el
parche no se distingue de "no cambió nada" — y no importa, porque el resultado visible es el mismo.
