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
pnpm --filter @maya/catalogo generar
```

Genera el JSON desde los schemas. Lo consumen el agente (structured output) y
`apps/web`, que lo sirve en `/catalogo/v1.json`: ese es el `catalogId` de cada
`createSurface` y un juez puede abrirlo. **No se edita a mano.**
