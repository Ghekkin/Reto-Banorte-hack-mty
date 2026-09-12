# Maya — Interfaces que la IA construye en tiempo real

Hack Monterrey 2026 · Reto Banorte × Tec de Monterrey.

Un agente de IA que, en vez de contestar con texto, **arma la pantalla que resuelve el
problema financiero de quien pregunta**: interpreta la intención, obtiene datos y
acciones de un servidor MCP propio, describe la interfaz con **A2UI** y la pinta con un
catálogo de componentes diseñado por el equipo. Lo que la persona toca vuelve al agente
y cambia la experiencia.

> **Prototipo de hackathon.** Es un concepto sobre el asistente Maya de Banorte,
> construido para el reto; **no es oficial ni está afiliado a Banorte**. Los datos son
> sintéticos y ninguna persona real aparece en ellos.

## Correr el proyecto

Node 22 y pnpm 10.

```bash
git clone https://github.com/Ghekkin/Reto-Banorte-hack-mty.git
cd Reto-Banorte-hack-mty
cp .env.example .env          # y llena DATABASE_URL (obligatoria) y la llave de Gemini
pnpm install
pnpm dev                      # MCP en :3100, web en :3000; espera los /health
```

Abre http://localhost:3000.

**`DATABASE_URL` es obligatoria**: los datos viven en PostgreSQL y el MCP no arranca sin
base (ADR 0010). El password está en el panel de Coolify o en `/opt/reto/.env` del VPS.
Si la base quedara vacía, `pnpm datos:restaurar` la repuebla desde el volcado del repo.

Sin llave de modelo la web abre igual, pero el agente responde con una pantalla de
ejemplo y lo dice en el stream.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta el MCP y la web, en ese orden |
| `pnpm typecheck` · `pnpm test` | TypeScript y vitest en los 5 paquetes |
| `pnpm humo` | Prueba de humo del MCP: lista las tools y llama una |
| `pnpm catalogo` | Regenera `packages/catalogo/catalogo.json` desde los schemas |
| `pnpm reiniciar-estado` | Vacía `banorte.acciones_aplicadas`: antes de cada ensayo |
| `pnpm datos:migrar` · `datos:fixture` · `datos:restaurar` | Migraciones, volcado para pruebas, y repoblar la base |

El catálogo de componentes que el agente puede invocar se sirve en
http://localhost:3000/catalogo/v1.json — es el `catalogId` de cada superficie A2UI.

## Cómo está construido

```
Usuario → Agente/LLM → MCP → A2UI → Componentes → (la acción regresa al agente)
```

| Pieza | Carpeta | Qué es |
|---|---|---|
| Agente | `apps/web/src/lib/agente/` | Interpreta intención, llama tools, emite A2UI, recibe acciones |
| Servidor MCP | `apps/mcp/` | Tools de lectura y de acción sobre datos sintéticos |
| Renderer A2UI | `packages/a2ui/` | Nuestro renderer conforme a la spec v0.9.1, validado con sus JSON Schema |
| Catálogo A2UI | `packages/catalogo/` | Componentes financieros propios, con schema y ejemplos |
| Contratos de tools | `packages/schemas/` | Zod de entrada/salida de cada tool |
| Datos | PostgreSQL, esquema `banorte` | Tres perfiles demo sintéticos y el estado que las acciones cambian. Esquema y migraciones en `db/` |

Cómo se levanta y qué pasa en una vuelta completa del ciclo:
[`docs/como-funciona/scaffold-y-arranque.md`](docs/como-funciona/scaffold-y-arranque.md).
Detalle: `docs/arquitectura/vision-general.md`. Trade-offs: `docs/arquitectura/trade-offs.md`.

## Documentación

Todo está en [`docs/README.md`](docs/README.md): contexto del reto y rúbrica, decisiones
(ADR), cómo funciona cada pieza en dos niveles (para cualquiera / técnico), algoritmos,
issues, guion de la demo.

## Equipo

Cuatro roles: `web`, `mcp`, `contrato`, `demo`. Quién está en qué: `docs/tablero.md`.
