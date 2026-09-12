---
name: tool-mcp
description: Cómo se crea o modifica una tool del servidor MCP - de lectura (datos) o de acción (muta el estado sintético), schema Zod compartido primero, mock con datos plausibles, registro con anotaciones, test y doc en el mismo commit. Invocar antes de tocar apps/mcp.
---

# Crear o modificar una tool MCP

El MCP es una de las tres piezas no negociables del reto: "exponer al modelo los
datos, las herramientas y **las acciones** que el equipo construyó". Nuestro servidor
tiene dos clases de tools y las dos cuentan:

| Clase | Qué hace | Anotación | Ejemplos |
|---|---|---|---|
| **Lectura** | Devuelve datos del estado sintético | `readOnlyHint: true` | `consultar_cuentas`, `consultar_movimientos`, `simular_reestructura` |
| **Acción** | **Muta el estado** y devuelve el resultado | `readOnlyHint: false`, `destructiveHint` según el caso | `aplicar_plan_pago`, `programar_transferencia`, `contratar_producto` |

La regla 3 del reto ("al menos un flujo accionable con cambio real") se cumple con al
menos una tool de acción cuyo efecto se vea en una lectura posterior.

Referencia de patrón (no copiar lógica): `/root/yolani/mcp-tenant/src/server.ts` y
`mcp-tenant/src/lib/mcp-sink.ts`.

## Orden obligatorio

1. **Schema primero, en `packages/schemas`.** Input y output en Zod, con `.describe()`
   en cada campo del input: es lo que el modelo lee para decidir cómo llamar la tool.
   Exporta los tipos inferidos.
2. **Mock antes que real.** Toda lectura y escritura pasa por la capa de datos única
   (ADR 0007): implementación `memoria` que carga los CSV de `db/datos/` al arrancar
   (default) y `postgres` detrás de `FEATURE_POSTGRES`. Ninguna tool escribe SQL.
   Las tools de acción escriben en el **estado mutable** (`estado.json`, con script
   `reiniciar-estado` para volver al punto de partida antes de cada demo).
3. **Registro** con `registerTool`: `title`, `description` (qué hace y cuándo usarla,
   pensada para el modelo), `inputSchema`, `annotations`. Toda tool captura errores y
   devuelve error de tool; nunca lanza.
4. **Idempotencia en acciones**: cada acción recibe un `idempotencyKey` o equivalente
   para que un reintento del agente no aplique el plan dos veces.
5. **Test** en `apps/mcp/src/__tests__/<tool>.spec.ts`: entrada válida pasa el schema
   de salida; entrada inválida devuelve error de tool; caso sin datos; y para acciones,
   **el estado cambió** y una lectura posterior lo refleja.
6. **Doc** en `docs/como-funciona/tool-<nombre>.md`, dos niveles. Lógica no trivial
   (amortización, scoring) → `docs/algoritmos/`.

## Convenciones

- Nombres `snake_case`, verbo primero, español: `consultar_movimientos`,
  `simular_reestructura`, `aplicar_plan_pago`.
- Un archivo por tool en `apps/mcp/src/tools/`. Sin lógica de dominio en el servidor.
- Montos en centavos enteros, moneda explícita. Fechas ISO 8601.
- La salida es **datos**, no UI: la tool no sabe de A2UI ni de componentes. Quien
  decide la pantalla es el agente.
- Nunca datos reales de personas.

## Checklist antes de commitear

- [ ] Schema en `packages/schemas`, usado por la tool (no duplicado).
- [ ] `description` de tool y de cada campo de input escritas para el modelo.
- [ ] Anotaciones correctas (lectura vs. acción).
- [ ] Tests pasan; para acciones, el test de cambio de estado. `pnpm typecheck` limpio.
- [ ] `scripts/humo.sh` lista la tool y la llama con éxito.
- [ ] Doc en `docs/como-funciona/` y enlace en `docs/README.md`. Entrada en tu bitácora.
