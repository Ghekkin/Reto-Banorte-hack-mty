---
estado: resuelto
severidad: critica
area: web
encontrado: 2026-09-13 04:22
github: 30
resuelto-en: d156138
---

# `main` roto: los componentes del catálogo importan `transicion.ts`, que no se commiteó

**Dónde:** `packages/catalogo/src/proyeccion-pago-credito/componente.tsx` (import de `../transicion`), commit `a7f1e73`

**Qué esperaba:** que el commit de las animaciones de widgets trajera el módulo que importa, y que el CI pasara y desplegara.

**Qué pasa:** `packages/catalogo/src/transicion.ts` existe en la carpeta compartida pero sin commitear (`??`), junto con cambios sin commitear en `gasto-por-categoria`, `plan-de-pago` y `simulador-meta`. En GitHub no existe, así que el paso "catalogo.json al dia" del CI truena con `ERR_MODULE_NOT_FOUND: Cannot find module '.../packages/catalogo/src/transicion'` (run 34751519567) y **no se despliega nada**: tampoco `be8630d` (estado por dispositivo) ni `eafe535`, cuyos runs quedaron cancelados por los pushes siguientes.

**Cómo lo reproduje / por qué estoy seguro:** `gh run view 34751519567 --log-failed`; `git ls-tree origin/main packages/catalogo/src/transicion.ts` no devuelve nada; `git status` en `/root/Reto-Banorte-hack-mty` lo muestra como no rastreado.

**Impacto en la demo:** la rompe si se necesita desplegar o si alguien clona `main` limpio: producción se queda en el último deploy exitoso (`cdfda32`). Se avisó a las sesiones activas del repo.

**Resuelto:** `d156138` quitó de `ProyeccionPagoCredito` el import a `transicion.ts` que se coló en `a7f1e73`.
