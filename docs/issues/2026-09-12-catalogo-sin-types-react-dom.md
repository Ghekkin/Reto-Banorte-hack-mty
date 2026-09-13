---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-12 09:10
resuelto: 2026-09-12 22:50
---

# `packages/catalogo` no declara `@types/react-dom` y `pnpm typecheck` falla en toda la raíz

**Dónde:** `packages/catalogo/package.json` (bloque `devDependencies`, no aparece
`@types/react-dom`) contra `packages/catalogo/src/__tests__/render.spec.tsx:4`, que hace
`import { renderToStaticMarkup } from "react-dom/server"`.

**Qué esperaba:** que `pnpm typecheck` desde la raíz pasara en los 5 paquetes.

**Qué pasa:** `packages/catalogo` falla con

```
src/__tests__/render.spec.tsx(4,38): error TS7016: Could not find a declaration file
for module 'react-dom/server'. …/react-dom/server.node.js implicitly has an 'any' type.
Try `npm i --save-dev @types/react-dom` …
```

Como el script raíz es `pnpm -r typecheck`, el fallo de un paquete devuelve exit 2 para
todo el comando. Los otros cuatro paquetes (`a2ui`, `schemas`, `mcp`, y el typecheck de
`web`) pasan.

**Cómo lo reproduje / por qué estoy seguro:** instalación limpia en Windows
(`pnpm install --frozen-lockfile` sobre un repo sin `node_modules`), después
`pnpm typecheck`. `packages/catalogo` declara `react-dom` como devDependency pero no sus
tipos; el único `@types/react-dom` del monorepo está en `apps/web/package.json:37`. Con
el `node_modules` aislado de pnpm, `catalogo` no ve los tipos de `web`, así que el error
aparece en cualquier máquina donde la instalación no haya quedado aplanada. No tiene
relación con las tools nuevas del Paquete 1: el archivo que falla es de `catalogo` y no
se tocó.

**Impacto en la demo:** ninguno en tiempo de ejecución — es solo tipos, y
`packages/catalogo` tiene `react-dom` instalado, así que la prueba corre y la UI pinta.
El daño es de proceso: **el nivel 1 de la skill `probar` ("typecheck en verde") no se
puede cumplir desde la raíz**, y eso invita a que alguien empiece a dar el typecheck por
bueno sin leerlo. A las 3 am eso es exactamente cómo se cuela un error real.

**Arreglo:** una línea en `packages/catalogo/package.json`:

```json
"@types/react-dom": "^19",
```

en `devDependencies`, y `pnpm install`. No lo aplico de paso: `packages/catalogo` es
dominio del rol `web` y la regla es registrar antes que arreglar.

**Solución aplicada:**
Se agregó `"@types/react-dom": "^19"` en `packages/catalogo/package.json` (`devDependencies`). `pnpm typecheck` pasa en limpio tanto en `@maya/catalogo` como a nivel raíz del monorepo.
