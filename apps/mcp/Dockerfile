# Imagen de @maya/mcp. Se construye desde la RAIZ del repo:
#   docker build -f apps/mcp/Dockerfile .
#
# No incluye datos: el servidor los lee de PostgreSQL al arrancar (ADR 0010). La
# imagen no lleva ni una fila; `DATABASE_URL` es obligatoria para que arranque.
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache curl
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/mcp/package.json apps/mcp/
COPY packages/a2ui/package.json packages/a2ui/
COPY packages/catalogo/package.json packages/catalogo/
COPY packages/schemas/package.json packages/schemas/
RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/mcp/ apps/mcp/

ENV NODE_ENV=production
ENV MCP_PUERTO=3100
EXPOSE 3100

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3100/health || exit 1

WORKDIR /repo/apps/mcp
CMD ["pnpm", "start"]
