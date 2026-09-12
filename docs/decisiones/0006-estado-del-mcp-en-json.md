---
estado: aceptada
fecha: 2026-09-12
---

# 0006 — El estado del MCP vive en JSON; TimescaleDB entra después y detrás de flag

## Contexto

Ya hay un Postgres 17 + TimescaleDB arriba en el Coolify del equipo (ver
`arquitectura/deploy.md`). La tentación es que las tools lean y escriban ahí desde el
minuto uno. Pero la fase 1 (ADR 0004) tiene que estar completa a la hora 10, y la demo
no puede depender de una base remota.

## Decisión

1. **Fase 1 y 2 sobre archivos JSON** en `apps/mcp/data/`: datos base inmutables
   (`usuarios.json`, `movimientos.json`, `categorias.json`, `productos.json`) y
   `estado.json` mutable que las tools de acción escriben. `reiniciar-estado` lo
   regresa a `estado.inicial.json`. Cero fricción, reproducible, sin red.
2. **TimescaleDB entra después de la hora 18, detrás de `FEATURE_TIMESCALE=1`**, como
   premio lateral (skill `premio-lateral`): los movimientos se cargan en una hypertable
   y `consultar_movimientos` / `comparar_periodos` consultan agregados continuos. Con
   el flag apagado, las tools devuelven **exactamente lo mismo** desde JSON.
3. **La demo corre con el flag en el estado que haya pasado el checklist.** Si
   Timescale pasa los 4 niveles de `probar`, se presenta con él y se cuenta en el pitch
   ("series de tiempo reales"); si no, apagado y no se menciona.

## Alternativas descartadas

- **Postgres desde el inicio.** Migraciones, conexión remota y seeds en la ruta crítica
  de la hora 10. No.
- **Solo JSON, sin Timescale nunca.** Se pierde el premio y una buena línea de pitch a
  cambio de nada: el flag lo hace gratis en riesgo.

## Consecuencias

- La capa de datos del MCP es una interfaz (`repositorio.ts`) con dos implementaciones:
  `json` y `timescale`. Las tools no saben cuál corre.
- `DATABASE_URL` en `.env.example` ya existe; se usa solo con el flag.
