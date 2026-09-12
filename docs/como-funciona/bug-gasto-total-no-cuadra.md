---
verificado: 2026-09-12 16:55 (hora de Monterrey)
estado: construido
---

# El bug del gasto: un total que no cuadraba con sus propios renglones

## Para cualquiera

La tarjeta de gasto decía, en grande, **$33,349.50 de gasto en agosto**. Debajo listaba seis
categorías: vivienda, intereses, educación, retiros, supermercado, transporte. Si sumabas
esas seis con una calculadora, daban **$28,034.00**.

Faltaban **$5,315.50** y no había forma de saber de dónde. No era que el total estuviera
mal: el total era correcto. Lo que estaba mal era la lista, que mostraba solo las seis
categorías más grandes de las once que Alberto tuvo ese mes, sin decir que había más.

Para alguien revisando su dinero, eso es lo peor que puede hacer una pantalla de banco: dar
dos cifras que no cuadran entre sí. En cuanto una no cuadra, dejas de creer las demás.

**Ahora la tarjeta lista las once**, y para que no crezca a lo largo de media pantalla, el
alto se queda en seis filas y el resto se desplaza, como una lista. La suma cuadra porque
está todo.

## Técnico

### Dónde estaba

No en el componente y no en la tool. En el **ejemplo que le enseña al modelo**.

| Pieza | Qué tenía |
|---|---|
| `apps/mcp/src/tools/comparar-periodos.ts:49` | `gastoTotal = suma(delPeriodo)` — el total de **todas** las categorías. Correcto |
| `comparar-periodos.ts:52-71` | La lista, ordenada y **sin recortar**. Correcto |
| `packages/catalogo/src/gasto-por-categoria/componente.tsx` | Renderiza `categorias` completa, sin `.slice`. Correcto |
| `packages/catalogo/ejemplos/gasto-por-categoria.jsonl` | **6 de 11 categorías contra el total completo.** Aquí estaba |
| `packages/catalogo/src/gasto-por-categoria/schema.ts:21` | `.describe("De mayor a menor; 6 u 8 es un buen numero")` |

El `.jsonl` se inyecta como **few-shot en el system prompt**
(`apps/web/src/lib/agente/prompt.ts` → `ejemplosEnTexto()`). Sus números eran salida real de
la tool para `usr_beto`, así que el ejemplo era **indistinguible de uno correcto**: el
modelo aprendía la forma "total completo + lista recortada" de un caso que parecía bueno. Y
el `describe` del schema, publicado en `catalogo.json`, lo confirmaba con "6 u 8 es un buen
numero".

### Por qué ninguna prueba lo cazó

`packages/catalogo/src/__tests__/catalogo.spec.ts` valida los ejemplos contra los **JSON
Schema oficiales de A2UI**. La aritmética no es parte de un schema: `minItems: 1` se cumplía
con seis, y ningún schema puede expresar "la suma de este arreglo es igual a ese otro
campo".

Del lado del MCP, `lecturas.spec.ts:121` sí verifica que las participaciones sumen 1 — y
**pasaba**, precisamente porque la tool no trunca. Validaba la salida de la tool, nunca las
props que el modelo emite.

### El arreglo, en cuatro piezas

1. **El ejemplo** ahora lista las 11 categorías reales de Beto en agosto de 2026, con sus
   variaciones reales contra julio. Suma exactamente `3334950`.
2. **El schema** dice lo contrario de lo que decía: *"TODAS las categorias del periodo […]
   La suma de montoCentavos TIENE que dar exactamente totalCentavos […] No la recortes; la
   tarjeta se encarga de acotar su alto"*. Regenerado en `catalogo.json` con `pnpm catalogo`.
3. **El componente** acota el alto a `FILAS_VISIBLES = 6` con `overflow-y-auto`, no la
   lista. En dos columnas (desde 42rem de tarjeta) el mismo alto muestra el doble de filas.
   Al pie va el conteo (`11 categorías · desplázate para ver todas`).
4. **Un aviso si vuelve a pasar.** El componente compara la suma con el total y, si falta
   algo, lo dice al pie en ámbar: `Faltan $5,315.50 sin desglosar`. Es feo a propósito —es
   un dato faltante, no una decisión de diseño— y es lo que evita que el mismo bug vuelva
   en silencio si un modelo desobedece el schema.

`overflow-y-auto` y no `ScrollArea`: dentro de una tarjeta con container queries el scroll
nativo no necesita que nadie le calcule una altura, y la barra ya viene delgada y neutra
desde `globals.css`.

### Las pruebas nuevas

`packages/catalogo/src/__tests__/ejemplos-cuadran.spec.ts` — las invariantes de **negocio**
de los ejemplos, que es lo que el modelo copia:

- la suma de las categorías es exactamente el total;
- hay al menos 7 categorías (con menos, alguien volvió a recortar "para que se vea mejor");
- van de mayor a menor, que es lo que el schema promete;
- ningún monto es cero o negativo.

### Comprobado con el modelo real

Dos consultas desde Inicio con `gemini-3.5-flash-lite`, tras el arreglo:

| Pregunta | Componentes | Categorías | Suma | Total | Cuadra |
|---|---|---|---|---|---|
| "¿En qué se me fue el dinero?" | `Column · Conclusion · GastoPorCategoria` | 11 | 3 334 950 | 3 334 950 | sí |
| "¿Cómo va mi deuda de la tarjeta?" | `Column · Conclusion · ResumenTarjeta` | — | — | — | n/a |

Ninguna emitió `Text`. El modelo pasa las categorías como **literales** en el componente,
no enlazadas al data model, así que una verificación que solo mire `updateDataModel` no ve
nada: hay que recorrer también las props de los componentes.
