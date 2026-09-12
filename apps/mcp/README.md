# `@maya/mcp` — servidor MCP

Una de las tres piezas no negociables del reto: expone al modelo **los datos y las
acciones** del dominio financiero. Streamable HTTP stateless en el puerto **3100**.

```bash
pnpm --filter @maya/mcp dev              # arranca con recarga
curl localhost:3100/health                  # { ok: true, tools: [...] }
scripts/humo.sh                             # lista las tools y llama una
pnpm --filter @maya/mcp reiniciar-estado # antes de cada ensayo
```

## Cómo está armado

| Archivo | Qué |
|---|---|
| `src/server.ts` | Express: `/health` y `/mcp`. Un `McpServer` por petición |
| `src/servidor.ts` | Construye el `McpServer` y registra las tools |
| `src/tools/registro.ts` | Cómo se registra una tool: anotaciones, log por llamada, errores que no lanzan |
| `src/tools/<tool>.ts` | Una tool por archivo |
| `src/datos/` | La puerta única a los datos: CSV en memoria (default) y el estado mutable |
| `scripts/reiniciar-estado.ts` | Vuelve el estado al punto de partida |

## Datos

Los 22 CSV de `db/datos/` se cargan al arrancar (ADR 0007). **Ninguna tool lee un CSV
ni escribe SQL**: todas piden a `src/datos/`. Lo que una acción cambia se escribe en
`estado.json` (fuera de git) y las lecturas lo superponen; por eso reiniciar es borrar
un archivo y la demo arranca igual las veces que haga falta.

`FEATURE_POSTGRES=true` cambiará el origen a Postgres; hoy avisa y usa memoria.

## Agregar una tool

Skill **`tool-mcp`**. Schema en `packages/schemas` primero, mock después, test y doc en
el mismo commit, y una línea en `src/tools/index.ts`.
