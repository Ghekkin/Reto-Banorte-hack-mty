---
estado: resuelto
severidad: media
area: web
github: 17
encontrado: 2026-09-13 01:20
---

# El log de tokens del agente y de la portada cuenta solo el último paso del turno

**Dónde:** `apps/web/src/lib/agente/agente.ts:192` y `:307` (`resultado.usage`), y
`apps/web/src/lib/inicio/generar.ts:253`.

**Qué esperaba:** que `entrada`, `salida` y `cache` del log (y `cacheLeido` del `fin`, y
`entrada_tokens`/`cache_tokens` de `banorte.pantallas_inicio`) fueran lo que costó el turno.

**Qué pasa:** en el AI SDK 5, `StreamTextResult.usage` es **el uso del último paso**
(`node_modules/ai/dist/index.d.ts`: "The token usage of the last step"). El total es
`totalUsage`. Un turno hace 2-3 peticiones y cada una reenvía el system prompt y las tools
completos, así que el log decía ~29k tokens por turno cuando eran ~83k. Los porcentajes de
caché documentados (76-87 % en `docs/como-funciona/agente.md`, 16k de 22k en
`inicio-personalizado.md`) son de un solo paso.

**Cómo lo reproduje:** interceptando el `fetch` a Gemini y sumando el `usageMetadata` de
cada petición del turno (`promptTokenCount` 26,137 + ~27,500 + 29,276) contra la línea
`{"agente":...,"entrada":29276}` del mismo turno.

**Impacto en la demo:** ninguno en pantalla. Escondía el costo real por turno, que es
justo lo que se agotó en el issue #12.
