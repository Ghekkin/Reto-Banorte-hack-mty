---
estado: aceptada
fecha: 2026-09-10
---

# 0001 — Todo el stack en TypeScript

## Contexto

Reto de 36 horas sobre agentes que generan interfaces en tiempo real, con MCP
obligatorio. Se consideró backend en Python (FastAPI) con front en Next.js, y también
NestJS. El equipo tiene un monorepo en producción (`/root/yolani/`) 100% TypeScript con
el mismo tipo de piezas: Express, Next.js, servidores MCP con `@modelcontextprotocol/sdk`,
Vercel AI SDK.

## Decisión

Todo en TypeScript, monorepo pnpm:

- `apps/web`: Next.js + React + Tailwind. Host del agente y render de la UI generada.
  Vercel AI SDK para el loop del agente y el render de tools como componentes.
- `apps/mcp`: servidor MCP en TS, Streamable HTTP sobre Express, calcado del patrón de
  `mcp-tenant` en Yolani. Tools del dominio financiero con schema Zod.
- `packages/schemas`: Zod. El contrato tool → UI se define una sola vez aquí.

Sin backend de negocio aparte salvo necesidad demostrada; los route handlers de Next.js
bastan.

## Alternativas descartadas

- **Python en backend.** El ecosistema de UI generativa (AI SDK, MCP Apps, streaming
  de componentes) es TS-nativo; con Python habría que serializar y reconstruir en el
  front, con el schema definido dos veces. En la hora 30, cada cambio de schema por
  duplicado es donde se rompe. Python solo gana si el núcleo es ML pesado, y no lo es
  (ver ADR 0002).
- **NestJS.** Módulos, decoradores e inyección de dependencias son ceremonia que rinde
  en un producto de dos años, no en 36 horas.

## Consecuencias

- Un solo lenguaje: cualquiera del equipo puede tocar cualquier archivo.
- Schemas compartidos: cambiar una tool y su componente es un solo cambio.
- El primer servidor MCP se levanta en ~1 hora copiando la estructura de Yolani.
- Se pierde el acceso directo a pandas/sklearn. Se acepta; ver ADR 0002 para el escape.
