---
estado: abierto
severidad: alta
area: infra
encontrado: 2026-09-12 13:25
github: 15
---

# Coolify guarda una imagen por commit y el disco del VPS se llena: los deploys de la web fallan al exportar la imagen

**Dónde:** `scripts/deploy.sh:84` (el aviso "no llego a servir … en 15 minutos") y
`.github/workflows/ci-y-deploy.yml` (paso "deploy a Coolify"). La causa no está en el
repo: está en el servidor.

**Qué esperaba:** que cada push a `main` en verde terminara con producción sirviendo ese
commit, como dice `docs/como-funciona/shell-web.md` y el ADR de deploy.

**Qué pasa:** el run `34712147832` (commit `6162bb2`, sáb 12:45) construyó la web bien
(`next build` en 94 s) y falló al exportar la imagen: `failed to extract layer … no space
left on device`. El MCP sí subió. Producción se quedó sirviendo la web en `0a31335`, dos
commits atrás, mientras `main` avanzaba. El siguiente run (`8d779fa`, Productos) fue
cancelado por el push de después, y el de `1c8b7b8` arrancó con 1 GB libre.

**Por qué:** `df -h /` daba **242 GB usados de 242 (99 %)**. Coolify construye una imagen
etiquetada con el sha de cada commit y **nunca borra las anteriores**: había ~40 imágenes
de `maya-web` (1.35 GB cada una) y ~45 de `maya-mcp` (1.14 GB), una por cada push del
día. Con cuatro personas empujando cada 10 minutos, el disco se llena solo.

**Cómo lo reproduje:** `docker images | grep -E "pyqpejvneeyxzfvpilj5fcxn|a7ld8ya2e0g3ye3pjjlz542f"`
en el VPS lista una imagen por commit; `journalctl -u docker` muestra `no space left on
device` en los health checks de todos los contenedores del servidor, no solo los nuestros.

**Impacto en la demo:** producción sigue arriba (los contenedores viejos corren), pero
**no refleja `main`**: cualquier cambio de hoy no llega al proyector hasta que haya disco.
Si el disco llega a cero, se caen los health checks de todo el VPS, incluidos los de otros
proyectos que viven ahí.

**Lo que hice en el momento (sáb 13:30):** borré las imágenes de `maya-web` y `maya-mcp`
de commits viejos, conservando las dos que corren y la del tag `estable` (`737f0a1`), y
`pnpm store prune` (2.6 GB). No toqué volúmenes ni imágenes de otros proyectos.

**Lo que falta (por eso sigue abierto):** una política para que no vuelva a pasar. Dos
opciones, cualquiera sirve:

1. En Coolify, en cada aplicación, activar la limpieza de imágenes viejas tras el deploy
   (ajuste "Delete unused images" / *docker cleanup* del servidor, con umbral de disco).
2. Un cron en el VPS: `docker image prune -a --filter "until=6h"` cada hora, excluyendo la
   imagen del tag `estable`.

Y en `scripts/deploy.sh`, antes de disparar el deploy, un `df` del servidor con aviso si hay
menos de 5 GB: falla temprano y con el diagnóstico, no a los 15 minutos con un timeout.
