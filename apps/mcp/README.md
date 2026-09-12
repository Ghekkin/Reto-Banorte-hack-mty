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
| `src/dominio/finanzas.ts` | Mensualidad, amortización, CAT, escenario de pago mínimo |
| `src/dominio/consultas.ts` | Las consultas que más de una tool necesita (y la única que decide cuánto debe alguien) |
| `src/dominio/tiempo.ts` | Qué día es "hoy" para el dominio, y aritmética de meses |
| `src/datos/` | La puerta única a los datos: CSV en memoria (default) y el estado mutable |
| `scripts/reiniciar-estado.ts` | Vuelve el estado al punto de partida |

## Las 9 tools

| Tool | Clase | Para qué |
|---|---|---|
| `consultar_perfil` | lectura | quién es la persona: ingreso, ocupación, segmento |
| `consultar_tarjeta` | lectura | límite, saldo, uso, mora, intereses del mes, plan activo, `alerta` |
| `consultar_movimientos` | lectura | movimientos filtrados + totales del filtro completo |
| `simular_reestructura` | lectura | una opción por plazo: mensualidad, CAT, ahorro vs. pagar el mínimo |
| `consultar_plan` | lectura | el plan aplicado y su calendario de pagos |
| `aplicar_plan_pago` | **acción** | difiere el saldo de la tarjeta; idempotente |
| `comparar_periodos` | lectura | gasto por categoría de dos meses + la categoría atípica |
| `proyectar_ahorro` | lectura | meses y fecha para llegar a una meta, con tres escenarios |
| `crear_apartado` | **acción** | crea la meta con aportación automática; idempotente |

El detalle (qué devuelve cada una, casos límite, idempotencia) está en
`docs/como-funciona/tools-mcp.md`. La matemática, en `docs/algoritmos/`.

## Datos

Los 22 CSV de `db/datos/` se cargan al arrancar (ADR 0007). **Ninguna tool lee un CSV
ni escribe SQL**: todas piden a `src/datos/`. Lo que una acción cambia se escribe en
`estado.json` (fuera de git) y las lecturas lo superponen; por eso reiniciar es borrar
un archivo y la demo arranca igual las veces que haga falta.

`FEATURE_POSTGRES=true` cambiará el origen a Postgres; hoy avisa y usa memoria.

## Agregar una tool

Skill **`tool-mcp`**. Schema en `packages/schemas` primero, mock después, test y doc en
el mismo commit, y una línea en `src/tools/index.ts`.
