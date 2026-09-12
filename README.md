# Reto Banorte — Interfaces que la IA construye en tiempo real

Hack Monterrey 2026 · Reto Banorte × Tec de Monterrey.

Un agente de IA que, en vez de contestar con texto, **arma la pantalla que resuelve el
problema financiero de quien pregunta**: interpreta la intención, obtiene datos y
acciones de un servidor MCP propio, describe la interfaz con **A2UI** y la pinta con un
catálogo de componentes diseñado por el equipo. Lo que la persona toca vuelve al agente
y cambia la experiencia.

> Estado: **preparación**. El caso de uso se decide al arrancar (ADR 0004). Este README
> se completa con los comandos reales en cuanto exista el scaffold.

## Correr el proyecto

Pendiente de scaffold. Quedará así (skill `scaffold`):

```bash
git clone https://github.com/Ghekkin/Reto-Banorte-hack-mty.git
cd Reto-Banorte-hack-mty
cp .env.example .env          # y poner la API key del modelo
pnpm install
scripts/dev.sh                # levanta MCP (3100) y web (3000), espera los /health
```

## Cómo está construido

```
Usuario → Agente/LLM → MCP → A2UI → Componentes → (la acción regresa al agente)
```

| Pieza | Carpeta | Qué es |
|---|---|---|
| Agente | `apps/web/src/lib/agente/` | Interpreta intención, llama tools, emite A2UI, recibe acciones |
| Servidor MCP | `apps/mcp/` | Tools de lectura y de acción sobre datos sintéticos |
| Catálogo A2UI | `packages/catalogo/` | Componentes financieros propios, con schema y ejemplos |
| Contratos de tools | `packages/schemas/` | Zod de entrada/salida de cada tool |
| Datos | `apps/mcp/data/` | Usuario demo, movimientos, productos, estado mutable |

Detalle: `docs/arquitectura/vision-general.md`. Trade-offs: `docs/arquitectura/trade-offs.md`.

## Documentación

Todo está en [`docs/README.md`](docs/README.md): contexto del reto y rúbrica, decisiones
(ADR), cómo funciona cada pieza en dos niveles (para cualquiera / técnico), algoritmos,
issues, guion de la demo.

## Equipo

Cuatro roles: `web`, `mcp`, `contrato`, `demo`. Quién está en qué: `docs/tablero.md`.
