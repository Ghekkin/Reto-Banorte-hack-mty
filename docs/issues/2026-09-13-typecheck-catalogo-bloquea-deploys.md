---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-13 15:40
github: 7
---

# `pnpm typecheck` falla en `packages/catalogo` y eso bloquea todos los deploys

**Dónde:** `packages/catalogo/src/__tests__/render.spec.tsx:92` (commit `9d5351e`).

**Qué esperaba:** que `pnpm typecheck` pasara en toda la raíz.

**Qué pasa:** falla con

```
src/__tests__/render.spec.tsx(92,74): error TS2345:
  Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

El destructuring `for (const [, etiqueta, atributos] of html.matchAll(...))` da
`string | undefined` en cada grupo, y el `tsconfig.base.json` del repo tiene
`noUncheckedIndexedAccess: true`, así que TypeScript lo marca. No es un falso
positivo del linter: es la configuración que el repo eligió a propósito.

**Impacto:** `pnpm typecheck` es uno de los cuatro niveles de "hecho" (skill `probar`)
y **es un paso del workflow de CI**, así que con esto en rojo **ningún push a `main`
llega a desplegarse**: el job de verificación corta antes del deploy. Cualquiera que
tocara otra cosa se encontraba el CI roto por un archivo que no había tocado.

**Cómo lo reproduje:** `pnpm typecheck` en la raíz, o
`pnpm --filter @maya/catalogo typecheck`.

**Arreglado** sacando los grupos de la coincidencia con su valor por defecto
(`coincidencia[1] ?? ""`), que es lo que el resto del repo hace con índices. La prueba
sigue comprobando exactamente lo mismo.
