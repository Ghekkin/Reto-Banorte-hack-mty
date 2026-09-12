---
name: tool-mcp
description: Cómo se crea o modifica una tool del servidor MCP en este repo - schema Zod compartido primero, mock con datos plausibles, registro con anotaciones, test y doc en el mismo commit. Invocar antes de tocar apps/mcp.
---

# Crear o modificar una tool MCP

Referencia de patrón (no copiar lógica de negocio): `/root/yolani/mcp-tenant/src/server.ts`
(servidor Streamable HTTP stateless con Express) y
`/root/yolani/mcp-tenant/src/lib/mcp-sink.ts` (registro con `registerTool`, anotaciones,
log por llamada, errores como `toolError`).

## Orden obligatorio

1. **Schema primero, en `packages/schemas`.** Un archivo por tipo de resultado. El
   schema Zod de salida es **el contrato con la UI**: el componente que lo renderiza
   depende de él. Nombre del schema = nombre del componente que lo pinta. Exporta el
   tipo inferido.
2. **Input también en Zod**, con `.describe()` en cada campo: es lo que el modelo lee
   para decidir cómo llamar la tool. Un campo sin descripción es una llamada mal hecha.
3. **Mock antes que real.** La primera implementación lee de `apps/mcp/data/*.json`
   con datos plausibles (nombres, montos y fechas creíbles para México/Banorte). Si
   después hay implementación "real" (Python, API), se elige por variable de entorno y
   el mock sigue siendo el default. Ver ADR 0002.
4. **Registro** con `registerTool`: `title`, `description` (qué hace y cuándo usarla,
   en una o dos frases pensadas para el modelo), `inputSchema`, `annotations`
   (`readOnlyHint` true para consultas; `destructiveHint` true si mueve dinero, aunque
   sea mock). Toda tool captura errores y devuelve un error de tool, nunca lanza.
5. **Test** en `apps/mcp/src/__tests__/<tool>.spec.ts`: al menos (a) llamada válida
   devuelve algo que pasa el schema de salida, (b) input inválido devuelve error de
   tool, (c) el caso "sin datos".
6. **Doc** en `docs/como-funciona/<slug>.md` con los dos niveles (skill `documentar`).
   Si la tool tiene lógica no trivial, también `docs/algoritmos/<slug>.md`.
7. **Registro en `CLAUDE.md`** si es la primera tool de una carpeta nueva.

## Convenciones

- Nombre de tool en `snake_case`, verbo primero, en español: `consultar_movimientos`,
  `simular_credito`, `programar_transferencia`.
- Un archivo por tool en `apps/mcp/src/tools/`. Sin lógica de dominio en el servidor.
- Toda salida incluye un campo `tipo` con literal igual al nombre del schema; el host
  lo usa para elegir componente sin adivinar.
- Montos en centavos enteros, moneda explícita. Fechas ISO 8601.
- Nunca datos reales de personas, ni siquiera "de prueba".

## Checklist antes de commitear

- [ ] Schema en `packages/schemas`, exportado y usado por la tool (no duplicado).
- [ ] `description` de tool y de cada campo de input escritas para el modelo.
- [ ] Mock devuelve datos que pasan el schema de salida.
- [ ] Test pasa. `pnpm typecheck` limpio.
- [ ] Doc en `docs/como-funciona/` y enlace en `docs/README.md`.
- [ ] Entrada en tu bitácora (`docs/bitacora/<nombre>.md`); si el schema es nuevo, línea en `docs/bitacora/equipo.md`.
