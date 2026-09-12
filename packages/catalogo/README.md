# `@maya/catalogo` — los componentes que el agente puede invocar

La entrega de "componentes propios" del reto (regla 1). Cada componente cubre **una**
intención del usuario; el agente elige entre ellos y los llena con datos de las tools.

## Cómo se construye uno

Invoca la skill **`ui-generativa`** (orden obligatorio y checklist) y **`diseno-banorte`**
(tokens). Tres archivos por componente, en `src/<nombre-kebab>/`:

| Archivo | Qué |
|---|---|
| `schema.ts` | Zod con `.describe()` en cada prop — es lo que el modelo lee para decidir |
| `componente.tsx` | React sobre primitivas de shadcn; props ya resueltas por el renderer |
| `README.md` | Cuándo lo elige el agente, props, ejemplo |

Más el `.jsonl` en `ejemplos/` y dos líneas en `src/index.ts`.

`src/confirmacion/` está construido y sirve de referencia. Los otros siete tienen su
carpeta con el encargo escrito.

## De dónde salen las primitivas de shadcn

De `apps/web/src/components/ui/` — donde las pone el CLI de shadcn y donde la skill
`shadcn` las encuentra. Este paquete las importa con el alias `@/components/ui/...`,
que `tsconfig.json` mapea a esa carpeta.

Es un acoplamiento a propósito: el catálogo solo se usa desde `apps/web`, y la
alternativa (un `packages/ui` aparte) duplica configuración de shadcn sin comprar nada
en 33 horas. Si algún día hay un segundo consumidor, se mueve; el cambio es mecánico.

## `catalogo.json`

```bash
pnpm catalogo        # o: pnpm --filter @maya/catalogo generar
```

Se genera desde los schemas Zod y es **un catálogo A2UI de verdad**: misma forma que
`packages/a2ui/spec/v0_9_1/catalogs/basic/catalog.json` (`components` por nombre,
`$defs.anyComponent`, `unevaluatedProperties: false`). Eso no es decoración: la spec
referencia el catálogo con una ref relativa, así que con esta forma **los JSON Schema
oficiales de A2UI validan nuestros componentes** sin una sola regla escrita a mano
(ver `docs/algoritmos/validacion-a2ui.md`).

Cada prop se publica como `anyOf: [<el schema de Zod>, DataBinding]`, porque cualquier
prop acepta un enlace `{ "path": "/…" }` al data model. El `cuandoUsarlo` de la entrada
va como `description`: es lo que lee el modelo para elegir, y lo que lee un juez.

Lo consumen el agente (validación y prompt), `apps/web` —que lo sirve en
`/catalogo/v1.json`, el `catalogId` de cada `createSurface`— y las pruebas. **No se
edita a mano**, y el CI falla si está desfasado de los schemas.

## Agregar un componente: lo que las pruebas exigen

`pnpm --filter @maya/catalogo test` falla si falta cualquiera de estos pasos, con el
mensaje de qué falta:

1. `src/<nombre-kebab>/schema.ts` con el Zod y su entrada en `CATALOGO` (`src/index.ts`).
2. La línea de `registrar(...)` en `registrarCatalogo()`: lo que el catálogo anuncia
   tiene que existir en el renderer.
3. `pnpm catalogo` corrido y commiteado.
4. `ejemplos/<nombre-kebab>.jsonl` con un mensaje A2UI que use el componente — y ese
   ejemplo tiene que **validar de verdad** contra los schemas oficiales.
