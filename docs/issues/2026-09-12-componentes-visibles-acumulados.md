---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-12 00:50
github: 3
resuelto-en: 2026-09-12 01:35
---

# El agente recibe como "pantalla actual" todos los componentes de la conversación, no los visibles

**Dónde:** `apps/web/src/components/shell/usar-agente.ts:52` (cómo se arma `superficie.componentes`) junto con `packages/a2ui/src/procesar.ts:36-38` (el upsert que nunca poda).

**Qué esperaba:** que `superficie.componentes` de la petición `POST /api/agente` diga **lo que está en pantalla ahora**, como promete `docs/arquitectura/contrato-agente-cliente.md`.

**Qué pasa:** `procesar` hace `componentes.set(c.id, c)` por cada componente que llega, sin quitar nunca los que dejaron de ser alcanzables desde `root`. El `Map` es por lo tanto la **acumulación histórica** de todos los componentes de toda la conversación. El cliente manda ese `Map` completo al agente como "lo que hay en pantalla". Desde el turno 2 el agente recibe una lista falsa.

Ejemplo con los ejemplos que ya están en el repo:

1. Turno 1, `packages/a2ui/ejemplos/plan-de-pago.jsonl`: el `Map` queda con `root: Column`, `resumen: ResumenTarjeta`, `plan: PlanDePago`.
2. Turno 2, `packages/catalogo/ejemplos/confirmacion.jsonl`: llega `{"id":"root","component":"Confirmacion"}`. Se reemplaza `root`, pero `resumen` y `plan` siguen en el `Map`.
3. La pantalla se ve bien (el árbol parte de `root`, que ya no los declara como hijos).
4. Pero la siguiente petición manda `componentes: ["Confirmacion","ResumenTarjeta","PlanDePago"]`. El agente cree que el plan de pago sigue visible.

El upsert de `procesar` **es fiel a la spec** (`server_to_client.json`: "Updates a surface with a new set of components... can be sent multiple times to update the component tree"), así que el arreglo no va ahí: va en quién calcula "lo visible". La línea del doc que dice "`updateComponents` reemplaza la lista de componentes" es la que está mintiendo.

**Arreglo propuesto:** exponer en `packages/a2ui` un `componentesVisibles(superficie)` que recorra el árbol desde `raiz` (ya existe `arbol()`, es un `map` sobre sus nodos) y usarlo en `usar-agente.ts`. Corregir en el mismo commit la frase de `contrato-agente-cliente.md` para que diga que `updateComponents` hace upsert por `id` y que lo visible es lo alcanzable desde `root`.

**Cómo lo reproduje / por qué estoy seguro:** lectura del código; el `Map` nunca recibe un `delete` en `procesar.ts`, y `usar-agente.ts` itera `superficie.componentes.values()` sin filtrar por alcanzabilidad. Los 15 tests de `packages/a2ui` no cubren el caso porque ninguno encadena dos pantallas distintas.

**Impacto en la demo:** se nota si el guion hace dos turnos sobre la misma superficie (el viaje Beto 1 → Beto 2 → Ana 3 lo hace). El agente decide con una lista falsa de lo que la persona está viendo, justo en la parte del reto que la rúbrica llama "el ciclo se cierra".

---

## Arreglado — 2026-09-12 01:35

Se hizo lo que proponía el hallazgo, más una segunda defensa:

1. **`componentesVisibles(superficie)` en `packages/a2ui/src/arbol.ts`**: recorre el árbol
   desde la raíz y devuelve los componentes alcanzables, una vez cada uno (un componente
   repetido por plantilla no se lista N veces). `usar-agente.ts:54` ya la usa en vez de
   iterar el `Map`.
2. **El agente rearma la superficie completa en cada turno** (`createSurface` +
   `updateComponents` con la lista entera + `updateDataModel` en `/`), así que el `Map`
   tampoco acumula en la práctica. Ver `docs/como-funciona/agente.md`.
3. **La frase que mentía en `docs/arquitectura/contrato-agente-cliente.md`** quedó
   corregida: `updateComponents` hace upsert por `id`, y lo visible es lo alcanzable
   desde `root`.
4. **Tests** en `packages/a2ui/src/__tests__/renderer.test.ts` →
   `describe("componentesVisibles")`: encadena las dos pantallas del ejemplo del hallazgo
   y comprueba que el `Map` sigue con 3 componentes mientras lo visible es solo
   `Confirmacion`. Era justo el caso que los 15 tests anteriores no cubrían.
