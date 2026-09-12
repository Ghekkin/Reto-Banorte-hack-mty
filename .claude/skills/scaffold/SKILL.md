---
name: scaffold
description: Cómo está armado el monorepo - workspace pnpm, apps y paquetes, puertos, variables de entorno, scripts únicos de arranque, typecheck y test. Invocar para agregar una app o paquete nuevo, o para entender de dónde sale un comando.
---

# Scaffold del monorepo

Estado: **construido** (sáb 07:30). Lo de abajo es lo que hay, no un plan.

## Estructura

```
apps/web/            @maya/web       Next.js 16 (App Router) + React 19 + Tailwind v4    :3000
                     + shadcn/ui (base-nova, 23 componentes en src/components/ui)
                     + AI SDK (ai, @ai-sdk/google, @ai-sdk/anthropic)
                     + cliente MCP (@modelcontextprotocol/sdk)
apps/mcp/            @maya/mcp       Express 5 + @modelcontextprotocol/sdk               :3100
packages/a2ui/       @maya/a2ui      Renderer A2UI propio + spec v0.9.1 vendoreada (ADR 0008)
packages/catalogo/   @maya/catalogo  Componentes del catálogo + catalogo.json generado
packages/schemas/    @maya/schemas   Zod de las tools MCP
services/ml/         (no existe; solo si ADR 0002 se activa)                             :8000
```

## Comandos

```bash
pnpm install          # Node 22, pnpm 10
pnpm dev              # scripts/dev.sh: mcp, espera su /health, web; imprime las URLs
pnpm typecheck        # tsc --noEmit en los 5 paquetes
pnpm test             # vitest en los 5
pnpm humo             # scripts/humo.sh: /health + tools/list + una llamada real
pnpm catalogo         # regenera packages/catalogo/catalogo.json desde los schemas
pnpm reiniciar-estado # el estado mutable del MCP vuelve a cero
```

Un paquete se corre solo con `pnpm --filter @maya/<nombre> <script>`.

## Reglas

- **pnpm workspace** (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). Versiones fijadas,
  sin `latest`. **Nunca `npm install`**: un `package-lock.json` está en `.gitignore`.
- **Un `tsconfig.base.json`** en la raíz con `strict` y `noUncheckedIndexedAccess`; cada
  paquete lo extiende. Los paquetes se publican en TypeScript, sin build propio: la web
  los compila con `transpilePackages`.
- **Los imports internos van sin extensión** (`from "./registro"`). Turbopack no mapea
  `.js` a `.ts` y la web truena en ejecución aunque el typecheck pase. Los imports de
  node_modules sí llevan `.js` si así los publica el paquete.
- **Cada paquete expone los mismos scripts**: `typecheck` y `test` (más `dev`/`build`
  las apps). Si un paquete nuevo no los tiene, `pnpm -r` lo salta en silencio.
- **Puertos fijos**: web 3000, mcp 3100, ml 8000. Cambiarlos toca `scripts/dev.sh`,
  `.env.example` y esta skill.
- **`.env.example` siempre completo**, con comentario por variable. **El scaffold
  arranca sin llenar ninguna**: sin llave de modelo el agente responde con la pantalla
  de ejemplo y lo dice en el stream.
- **`/health`** en el MCP devuelve `{ ok, servicio, version, origenDatos, tools }`.

## Dónde va cada cosa

| Si vas a… | Toca | Skill |
|---|---|---|
| Agregar una tool | `apps/mcp/src/tools/` + `packages/schemas` | `tool-mcp` |
| Agregar un componente del catálogo | `packages/catalogo/src/<nombre>/` | `ui-generativa` |
| Tocar el renderer o el protocolo | `packages/a2ui/src/` | `agente-host` |
| Tocar el agente o su prompt | `apps/web/src/lib/agente/` | `agente-host` |
| Tocar pantalla, CSS o layout | `apps/web/src/app`, `src/components/shell` | `diseno-banorte`, `shadcn` |

## shadcn

Ya inicializado en `apps/web` (`components.json` commiteado, estilo `base-nova`, base
`@base-ui/react`, iconos `lucide`). Los tokens de Banorte están en
`src/app/globals.css`. Para agregar componentes: skill **`shadcn`** y su CLI
(`pnpm dlx shadcn@latest add <componente>`), nunca a mano.

`packages/catalogo` importa esas primitivas con el alias `@/components/ui/...`, que su
`tsconfig.json` mapea a `apps/web/src`. Es un acoplamiento a propósito: el catálogo solo
se usa desde la web, y un `packages/ui` aparte duplicaría la configuración de shadcn sin
comprar nada en 33 horas.

## Lo que el scaffold dejó a medias, con dueño

| Hueco | Dónde | Dueño |
|---|---|---|
| El agente real (tools, structured output, streaming) — hoy es un mock que pinta un `.jsonl` | `apps/web/src/lib/agente/agente.ts` | `contrato` |
| Validación con ajv contra `spec/v0_9_1/json/` + los 8 casos de conformidad | `packages/a2ui/src/validar.ts` | `contrato` |
| 8 tools de 9 | `apps/mcp/src/tools/` | `mcp` |
| 7 componentes de 8 (cada uno con su encargo escrito en su carpeta) | `packages/catalogo/src/` | `web` |
| Origen `postgres` detrás de `FEATURE_POSTGRES` | `apps/mcp/src/datos/index.ts` | `mcp` |
| Panel de transparencia y badges LLM · MCP · A2UI (el stream ya llega) | `apps/web/src/app/page.tsx` | `web` |
