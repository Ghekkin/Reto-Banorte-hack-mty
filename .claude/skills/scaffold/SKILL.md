---
name: scaffold
description: Cómo está (o debe quedar) armado el monorepo - workspace pnpm, apps y paquetes, puertos, variables de entorno, scripts únicos de arranque, typecheck y test. Invocar para crear el scaffold el día 1 o para agregar una app o paquete nuevo.
---

# Scaffold del monorepo

Estado: **pendiente de crear.** Cuando exista, esta skill se actualiza para describir
lo real, y `CLAUDE.md` recibe los comandos en "Comandos habituales" y el mapa.

## Estructura objetivo

```
apps/web/            Next.js (App Router) + React + Tailwind + AI SDK    puerto 3000
                     + @a2ui/react @a2ui/web_core (renderer A2UI)
apps/mcp/            TS + @modelcontextprotocol/sdk + Express             puerto 3100
packages/catalogo/   Catálogo A2UI propio: schema + componente React + .jsonl de ejemplo por componente
packages/schemas/    Zod de tools, sin dependencias de runtime aparte de zod
services/ml/         (solo si ADR 0002 se activa) FastAPI                 puerto 8000
scripts/dev.sh       levanta todo con un comando y espera los /health
.env.example         TODAS las variables, con comentario y valor de ejemplo
```

## Reglas

- **pnpm workspace** (`pnpm-workspace.yaml` con `apps/*` y `packages/*`). Versiones
  fijadas en `package.json` (sin `latest`). Node 22.
- **Un `tsconfig.base.json`** en la raíz; cada paquete extiende. `strict: true`.
- **Scripts raíz**: `pnpm dev` (todo), `pnpm typecheck` (`-r`), `pnpm test` (`-r`),
  `pnpm build`. Cada app expone los mismos cuatro nombres.
- **Puertos fijos** (arriba). Nadie cambia un puerto sin tocar `scripts/dev.sh`,
  `.env.example` y esta skill.
- **`.env.example` es obligatorio y siempre completo.** Cada variable nueva entra ahí
  en el mismo commit que la usa, con comentario. `.env` nunca se commitea.
- **`/health`** en cada servicio, devuelve `{ ok: true, servicio, version }`.
- **`apps/mcp/scripts/reiniciar-estado.ts`**: vuelve el estado mutable al punto de
  partida. Se corre antes de cada ensayo de demo.
- **`packages/catalogo`** genera su JSON de catálogo (`catalogo.json`) desde los
  schemas con `pnpm --filter catalogo generar`; el agente lee ese JSON.
- **`scripts/dev.sh`**: arranca `apps/mcp`, espera su `/health`, arranca `apps/web`,
  imprime las URLs. Si `services/ml` existe y `ML_URL` está definida, lo arranca
  también; si su `/health` no responde en 10 s, sigue sin él (mock toma el control).
- **Patrón de referencia** para `apps/mcp`: `/root/yolani/mcp-tenant/` (server.ts,
  mcp-sink.ts, tests). Sin OAuth: un `Authorization: Bearer` fijo desde `.env` basta.

## Al terminar el scaffold

- [ ] `pnpm install && pnpm typecheck && pnpm test && scripts/dev.sh` corren limpios
      desde un clon fresco.
- [ ] `CLAUDE.md`: comandos y mapa actualizados.
- [ ] Esta skill describe lo real, no el plan.
- [ ] `docs/arquitectura/vision-general.md` pasa de `plan` a `construido`.
