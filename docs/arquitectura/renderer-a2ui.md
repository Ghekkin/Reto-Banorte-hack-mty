---
verificado: 2026-09-11 23:10
estado: plan            # pasa a construido cuando los criterios de aceptación pasen
---

# Renderer A2UI propio (`packages/a2ui`)

Decisión en ADR 0008. Este doc es el plan de construcción para `contrato`, sáb
00:00–03:00. Cuando exista, se reescribe con lo real.

## Para cualquiera

El agente describe la pantalla en un formato estándar llamado A2UI: una lista de
piezas ("una tarjeta de plan de pago con estas tres opciones") y los datos que van en
ellas. Esta pieza del sistema lee esa descripción, comprueba que esté bien formada, y
la convierte en componentes de verdad en pantalla. Cuando la persona toca un botón, le
avisa al agente qué tocó y con qué datos. Lo escribimos nosotros para que cada
componente salga con nuestro diseño y para entender cada línea cuando nos pregunten.

## Técnico

### Estructura

```
packages/a2ui/
  spec/                      JSON Schema oficiales v0.9.1 (vendoreados, Apache 2.0)
    mensajes.schema.json
    catalogo-basico.schema.json
  src/
    tipos.ts                 tipos de los 4 mensajes y del action (derivados del schema)
    validar.ts               validarMensaje(m) → ok | errores   (ajv sobre spec/)
    procesar.ts              reducer: (estado, mensaje) → estado
    bindings.ts              resolver({path}) con JSON Pointer sobre el data model
    arbol.ts                 lista plana + children → árbol renderizable
    registro.ts              Map<nombre, ComponenteReact>; registrar(), obtener()
    Superficie.tsx           <Superficie id> pinta el árbol con el registro
    acciones.ts              emitirAccion(evento, dataModel) → action con context resuelto
    layout/                  Column, Row, Text, Divider (Tailwind + tokens)
  ejemplos/                  .jsonl a mano para probar cada pieza
  src/__tests__/
```

### El estado

```ts
type Superficie = {
  id: string
  catalogId: string
  componentes: Map<string, Componente>   // por id, lista plana
  raiz?: string                          // el componente sin padre
  dataModel: Record<string, unknown>     // se actualiza por JSON Pointer
}
type Estado = Map<string, Superficie>
```

`procesar` es un reducer puro: no hace fetch, no conoce React. Se prueba con `.jsonl`.

### Los cuatro mensajes (v0.9.1)

| Mensaje | Efecto en el estado |
|---|---|
| `createSurface { surfaceId, catalogId }` | Crea la superficie vacía |
| `updateComponents { surfaceId, components[] }` | Reemplaza/agrega por `id`; recalcula `raiz` |
| `updateDataModel { surfaceId, path, value }` | `set(dataModel, path, value)` por JSON Pointer; `path: "/"` reemplaza todo |
| `deleteSurface { surfaceId }` | Borra |

Toda línea que no pase `validar()` se rechaza con error y **no toca el estado**. El
route handler del agente hace la misma validación antes de emitir (contrato
agente↔cliente): un mensaje inválido nunca viaja.

### Bindings

Una prop puede ser literal o `{ "path": "/plan/opciones" }`. `bindings.resolver` recorre
las props del componente y sustituye cada `{path}` por el valor del data model. Paths
absolutos (`/…`) siempre; los relativos (dentro de `List` con plantilla) se resuelven
contra el ítem. Si el path no existe todavía → `undefined`, y el componente muestra su
estado de carga (skill `ui-generativa`, tres estados).

### Árbol y render

`arbol(superficie)` parte de `raiz` y sigue `children` (ids). `<Superficie>` recorre el
árbol y para cada nodo busca `registro.obtener(componente.component)`; si no existe,
pinta un `Desconocido` visible en dev (borde punteado con el nombre) y registra un
issue-en-consola. Las props llegan ya resueltas.

Las tarjetas entran con la transición de 150 ms de `diseno-banorte`; la rejilla bento
usa la prop `ancho` de cada componente del catálogo.

### Acciones

Un `Button` (o cualquier componente del catálogo) declara
`action: { event: { name, context } }`. Al disparar, `emitirAccion` resuelve cada
`{path}` del `context` contra el data model y entrega:

```json
{ "action": { "name": "aplicar_plan_pago", "surfaceId": "principal",
              "sourceComponentId": "btn_aplicar", "timestamp": "…",
              "context": { "plazo": 18, "idempotencyKey": "…" } } }
```

Eso va al `POST /api/agente` como `accion` (contrato agente↔cliente). El renderer no
hace nada más: espera la nueva UI.

### Registro y catálogo

`registro.ts` es un `Map` en memoria. `packages/catalogo` registra los suyos al
importarse; `layout/` registra Column, Row, Text, Divider. `apps/web` sirve
`/catalogo/v1.json` generado desde los schemas: es el `catalogId` de cada
`createSurface` y lo que el agente recibe para su structured output.

### Dependencias

`ajv` (validación), `react`. Nada más. Sin Lit, sin `@a2ui/*`.

## Criterios de aceptación (sustituyen al spike; corte H6 = sáb 02:00)

- [ ] `pnpm --filter a2ui test` en verde: reducer con los 4 mensajes, bindings
      absolutos y relativos, árbol con 3 niveles, validación que rechaza un componente
      inexistente y un mensaje sin `version`.
- [ ] `ejemplos/plan-de-pago.jsonl` (a mano) pinta `PlanDePago` con datos del data
      model dentro del lienzo de `apps/web`.
- [ ] Tocar "Aplicar plan" produce el `action` con `context.plazo` resuelto, impreso en
      consola.
- [ ] Un mensaje con `component: "NoExiste"` no toca el estado y se ve el error.
- [ ] Cero warnings de hidratación en Next.

## Por qué no `@a2ui/react` (para la pregunta del jurado)

| | Oficial | Propio |
|---|---|---|
| Fidelidad a la spec | Total | Total: mismos mensajes, validados con sus schemas |
| Estilos shadcn/Banorte | En riesgo (Lit/shadow DOM) | Garantizados |
| Next App Router | Incierto | Sin sorpresas |
| Riesgo en la demo | Paquete en preview | Código nuestro, 2 dependencias |
| Regla 1 del reto ("sus propios componentes") | Parcial | Completa |
