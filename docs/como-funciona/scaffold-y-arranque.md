---
verificado: 2026-09-12 07:30 (hora de Monterrey)
estado: construido
---

# Cómo se levanta Maya

## Para cualquiera

Maya son dos programas que se hablan entre sí.

El primero, **la web**, es lo que la persona ve: una página con una barra abajo donde
escribe lo que necesita. Cuando escribe algo, la web se lo pasa al **agente**, que vive
dentro de la misma web.

El segundo, **el servidor de herramientas (MCP)**, es donde están los datos y las
operaciones: consultar una tarjeta, simular una reestructura, aplicar un plan. El
agente le pide lo que necesita y con eso decide **qué pantalla armar**.

El agente no manda HTML: manda una descripción de la pantalla ("una tarjeta de
confirmación con este monto y esta fecha") en un formato estándar llamado A2UI. La web
la lee y la dibuja con los componentes que diseñamos nosotros. Si la persona toca un
botón, ese toque vuelve al agente igual que si hubiera escrito algo, y el agente vuelve
a armar la pantalla con el resultado. **Ese ida y vuelta es el producto.**

Para arrancar todo hace falta un comando: `pnpm dev`. No hace falta llave de ningún
modelo de IA para ver la página: sin llave, el agente responde con una pantalla de
ejemplo y lo dice.

## Técnico

### Las cinco piezas

| Paquete | Qué hace | Dueño |
|---|---|---|
| `@maya/web` (`apps/web`) | Next.js 16. El shell, el renderer montado en el lienzo, `POST /api/agente` (stream JSONL) y `GET /catalogo/v1.json` | `web` + `contrato` |
| `@maya/mcp` (`apps/mcp`) | Express + MCP SDK. `/health` y `/mcp` (Streamable HTTP stateless), tools y capa de datos | `mcp` |
| `@maya/a2ui` (`packages/a2ui`) | El renderer propio: validar → procesar → bindings → árbol → registro → `<Superficie>` | `contrato` |
| `@maya/catalogo` (`packages/catalogo`) | Los componentes que el agente puede invocar, y `catalogo.json` | `web` |
| `@maya/schemas` (`packages/schemas`) | Los contratos Zod de las tools | `contrato` |

### Qué pasa cuando corres `pnpm dev`

1. `scripts/dev.sh` instala si hace falta, **carga el `.env` de la raíz y lo exporta** (los
   dos procesos corren con su propio `cwd`) y **genera `catalogo.json`** desde los schemas.
   Si falta `DATABASE_URL`, se detiene ahí con el motivo.
2. Levanta `@maya/mcp` en el 3100 y **espera a que `/health` responda** (hasta 30 s).
   El MCP trae el esquema `banorte` entero de PostgreSQL al arrancar: si la base no
   responde, **no arranca** (ADR 0010) y se sabe ahí, no en la demo.
3. Levanta `@maya/web` en el 3000.
4. Imprime las tres URLs: la web, el MCP y el catálogo.

`Ctrl-C` baja las dos.

**`dev.sh` es bash y en Windows no corre.** Levantando las apps a mano
(`pnpm --filter @maya/mcp dev`, `pnpm --filter @maya/web dev`) el `.env` de la raíz igual se
carga, porque `apps/mcp/src/config.ts` y `apps/web/next.config.ts` lo leen por ruta
absoluta desde su propia ubicación. Antes no lo hacían y el resultado era una app entera
con las pantallas vacías.

### Una vuelta completa del ciclo

```
persona escribe
  → usar-agente.ts  POST /api/agente { usuarioId, conversacionId, mensajes, superficie }
    → route.ts abre un stream JSONL y llama correrTurno()
      → agente.ts: tools MCP (mcp-cliente.ts) → decide → emite mensajes A2UI
        → cada mensaje pasa por validarMensaje(m, nombresDelCatalogo())
      ← {"tipo":"a2ui","mensaje":{…}}   una línea por mensaje
  ← procesar(estado, mensaje) actualiza el estado del renderer
  → <Superficie> pinta con el registro de componentes
persona toca "Aplicar plan"
  → emitirAccion() resuelve el context contra el data model
  → enviarAccion() vuelve a POST /api/agente, ahora con `accion`
  (y otra vez desde arriba, con el estado ya cambiado)
```

Contrato completo en `docs/arquitectura/contrato-agente-cliente.md`; el renderer en
`docs/arquitectura/renderer-a2ui.md`.

### Estado mutable y ensayos

Los datos de partida **no se tocan nunca**: las tablas de `banorte` son la foto inicial. Lo
que una tool de acción aplica se escribe en `banorte.acciones_aplicadas` y las lecturas lo
superponen. Por eso `pnpm reiniciar-estado` es truncar esa tabla, y la demo arranca igual
las veces que haga falta. Va antes de cada ensayo (skill `checklist-demo`).

### Qué está mockeado hoy

`apps/web/src/lib/agente/agente.ts` **no llama al modelo todavía**: emite los mensajes
de `packages/catalogo/ejemplos/confirmacion.jsonl`, ya validados contra el catálogo, y
avisa en el stream con `{"tipo":"error","codigo":"modelo"}`. Sirve para que el ciclo
completo (escribir → stream → renderer → tocar → nuevo turno) se pueda probar sin llave
y sin MCP. Lo sustituye el rol `contrato` (skill `agente-host`).

### Verificación (skill `probar`)

```bash
pnpm typecheck   # 5 paquetes en verde
pnpm test        # 19 tests: renderer (15) + tools (4)
pnpm dev         # ambos /health
pnpm humo        # tools/list y una llamada real al MCP
```
