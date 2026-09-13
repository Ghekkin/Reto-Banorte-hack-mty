# Imagen de @maya/docs. Se construye desde la RAIZ del repo:
#   docker build -f apps/docs/Dockerfile .
# Coolify lo hace con "Build Pack: Dockerfile" y base directory `/`.
#
# Astro genera un sitio estatico; en produccion no hace falta Node. La etapa final es
# nginx con `dist/` y nada mas: unos 50 MB en vez de ~1 GB, que importa porque cada
# push a main deja una imagen en el disco del VPS (issue #15).
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# 1. Solo los manifiestos: esta capa se reusa mientras no cambien las dependencias.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/docs/package.json apps/docs/
RUN pnpm install --frozen-lockfile --filter @maya/docs...

# 2. Solo el codigo de docs: un push que no toca apps/docs reusa todas las capas.
COPY apps/docs apps/docs
RUN pnpm --filter @maya/docs build

FROM nginx:1.27-alpine
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/docs/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/salud >/dev/null || exit 1
