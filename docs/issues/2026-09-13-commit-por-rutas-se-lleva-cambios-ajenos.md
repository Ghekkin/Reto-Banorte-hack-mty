---
estado: resuelto
severidad: media
area: infra
encontrado: 2026-09-13 04:25
resuelto-en: d156138
github: 31
---

# El commit por rutas en el árbol compartido se lleva cambios de otra sesión

**Dónde:** el procedimiento de `CLAUDE.md`, regla 5 ("si haces un commit manual, hazlo siempre
por rutas explícitas: `git commit -- <rutas>`"), en la carpeta que comparten las sesiones
(`/root/Reto-Banorte-hack-mty`).

**Qué esperaba:** que commitear solo mis rutas dejara fuera el trabajo a medias de las demás
sesiones.

**Qué pasa:** `git commit -- <rutas>` toma el contenido del ÁRBOL DE TRABAJO de esas rutas en el
instante del commit. Si otra sesión edita uno de esos archivos entre que revisas el diff y
commiteas, su versión a medias entra en tu commit. Pasó el 2026-09-13 a las 04:18: `a7f1e73`
(animación de widgets) revisó `proyeccion-pago-credito/componente.tsx` con 8 líneas de diff y
commiteó 132, incluido un `import { usarValoresAnimados } from "../transicion"` de la sesión de
ajustes en vivo, cuyo `transicion.ts` no estaba commiteado. `main` quedó en rojo: el CI tronó en
"catalogo.json al dia" con `ERR_MODULE_NOT_FOUND` (run 34751519567). No llegó a producción.

**Cómo lo reproduje / por qué estoy seguro:** `git show a7f1e73 --stat` (132 líneas en ese
componente) contra el diff revisado minutos antes (8 líneas), y el log del run.

**Impacto en la demo:** ninguno en lo publicado (el CI frena antes del deploy), pero `main` estuvo
unos 10 minutos sin poder desplegar nada de nadie.

**Arreglo aplicado:** `d156138` devuelve el componente a la versión anterior más solo los ganchos
de animación, commiteado desde un `git worktree` limpio (índice propio) y verificado ahí con
`pnpm catalogo`, `pnpm typecheck` y `pnpm test` antes de subir.

**Arreglo sugerido para el procedimiento:** para un commit con nombre propio en el árbol
compartido, justo antes de commitear volver a correr `git diff --stat -- <rutas>` y comparar
con lo revisado; o armar el commit en un `git worktree` aparte con los archivos copiados, como
se hizo en `d156138`.
