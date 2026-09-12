---
name: probar
description: Qué significa "funciona" en este repo antes de marcar algo como hecho - typecheck, tests unitarios de tools, prueba de humo del MCP y prueba manual con los prompts del guion. Invocar antes de decir que algo está terminado o de marcar un doc como construido.
---

# Probar

"Me funciona" no es un estado. Estos son los cuatro niveles, y **hecho** significa que
los cuatro pasan. Marcar `estado: construido` en un doc sin esto es mentir en la doc.

## Los cuatro niveles

1. **Tipos**: `pnpm typecheck` desde la raíz, en verde en todos los workspaces.
2. **Unitario**: `pnpm test` (vitest). Toda tool tiene al menos tres casos: entrada
   válida devuelve algo que pasa el schema de salida; entrada inválida devuelve error
   de tool (no lanza); caso "sin datos". Los datos mock pasan `datos.spec.ts`.
3. **Humo del MCP**: con `scripts/dev.sh` arriba, `scripts/humo.sh` hace `tools/list`
   por JSON-RPC contra `apps/mcp` y llama una tool de cada `tipo`; falla si alguna
   respuesta no pasa su schema. Tarda segundos. Se corre antes de cada `guardar` que
   toque el MCP.
4. **Manual con el guion**: los prompts literales de `docs/demo/guion-demo.md` en el
   chat, en orden. Cada uno produce la interfaz esperada, sin errores de consola, en
   menos de 8 s. Es el único nivel que ve lo que ve el juez.

## Cuándo correr qué

| Momento | Niveles |
|---|---|
| Antes de cada `guardar` | 1 y 2 (segundos) |
| Después de tocar `apps/mcp` o schemas | 1, 2 y 3 |
| Antes de marcar un doc `construido` | 1–4 |
| `checklist-demo` | 1–4 más lo suyo |

## Si algo falla

- Es tuyo y de tu tarea: lo arreglas antes de seguir.
- Es ajeno: issue (skill `registrar-issue`), y si bloquea la demo, severidad `critica`.
- No sabes por qué: **45 minutos** de intento. Después, pregunta al dueño o rodea con
  un mock, y issue. Nadie se queda atorado dos horas solo a las 3 am.

## Lo que no hacemos

- Tests de UI automatizados (Playwright). No en 36 horas; el nivel 4 los sustituye.
- Cobertura. Tres casos por tool bien elegidos valen más que cien generados.
