---
estado: descartado
severidad: critica
area: web
encontrado: 2026-09-13 04:25
github: 29
---

> **Duplicado de #30** (`2026-09-13-main-roto-transicion-sin-commitear.md`), registrado casi a la
> misma hora desde otra sesión y resuelto en `d156138`. #29 se cerró en GitHub con esa nota.

# `main` no arranca: cuatro componentes del catálogo importan `./transicion`, que nunca se subió

**Dónde:** `packages/catalogo/src/proyeccion-pago-credito/componente.tsx`,
`gasto-por-categoria/componente.tsx`, `plan-de-pago/componente.tsx` y
`simulador-meta/componente.tsx` importan `../transicion` desde el commit `a7f1e73`. El archivo
`packages/catalogo/src/transicion.ts` (y su prueba `__tests__/transicion.spec.tsx`) existe solo sin
commitear en la carpeta compartida `/root/Reto-Banorte-hack-mty`.

**Qué esperaba:** que `origin/main` arrancara y pasara CI (regla 4 de `CLAUDE.md`).

**Qué pasa:** el run `34751519567` de `ci y deploy` falla en «catalogo.json al dia»:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../packages/catalogo/src/transicion'
imported from .../packages/catalogo/src/proyeccion-pago-credito/componente.tsx
```

Un worktree limpio sobre `origin/main` falla igual en `pnpm --filter @maya/catalogo generar`.
Mientras siga así no se despliega nada.

**Cómo lo reproduje / por qué estoy seguro:** `git worktree add --detach /root/reto-mas origin/main`,
`pnpm install`, `pnpm --filter @maya/catalogo generar` → el mismo error. `git log -- packages/catalogo/src/transicion.ts`
no devuelve nada.

**Impacto en la demo:** ningún deploy pasa desde `a7f1e73`; producción sigue en el commit anterior.

**Arreglo:** commitear `transicion.ts` y su prueba desde la sesión que los escribió (el commit fue por
rutas explícitas y se quedaron fuera).
