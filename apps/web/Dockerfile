# Imagen de @maya/web. Se construye desde la RAIZ del repo:
#   docker build -f apps/web/Dockerfile .
# Coolify lo hace con "Build Pack: Dockerfile" y base directory `/`.
#
# Una nota sobre el tamano: no usamos `output: standalone` a proposito. La web lee
# dos archivos del repo en tiempo de ejecucion (`packages/catalogo/catalogo.json` y
# los `.jsonl` de ejemplo); standalone reescribe las rutas y los deja fuera. Una
# imagen mas grande a cambio de que no haya sorpresas a las 3 am.
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache curl
WORKDIR /repo

# 1. Solo los manifiestos: esta capa se reusa mientras no cambien las dependencias.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/mcp/package.json apps/mcp/
COPY packages/a2ui/package.json packages/a2ui/
COPY packages/catalogo/package.json packages/catalogo/
COPY packages/schemas/package.json packages/schemas/
RUN pnpm install --frozen-lockfile

# 2. El codigo y el build.
#
# `rm -rf .next/cache` en la MISMA capa que el build: ese cache (Turbopack) solo sirve
# para recompilar mas rapido y `next start` no lo necesita. Como la imagen es de una sola
# etapa, se quedaba dentro de cada imagen. El 2026-09-12 el disco del VPS llego al 99 %
# (38 imagenes de esta app, ~1.4 GB cada una, una por push a main) y el deploy fallo
# justo escribiendo `.next/cache/turbopack`. En una capa aparte no serviria: la capa del
# build ya lo habria guardado.
COPY . .
# Las `NEXT_PUBLIC_*` se incrustan en el bundle AL CONSTRUIR; ponerlas solo en runtime no
# alcanza (el boton de voz no aparecia). Coolify las pasa como build arg si la variable
# esta marcada "build time". Un ARG queda como variable de entorno del RUN de abajo.
ARG NEXT_PUBLIC_FEATURE_VOZ=0
RUN pnpm --filter @maya/catalogo generar \
 && pnpm --filter @maya/web build \
 && rm -rf apps/web/.next/cache

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

WORKDIR /repo/apps/web
CMD ["pnpm", "start"]
