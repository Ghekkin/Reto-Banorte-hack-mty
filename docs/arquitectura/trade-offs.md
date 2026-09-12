---
verificado: 2026-09-12 04:40
estado: plan
---

# Trade-offs técnicos (entregable 04)

La presentación pide "diagrama de arquitectura y los trade-offs: modelo, protocolo,
infraestructura". El diagrama está en `vision-general.md`. Aquí, cada decisión con lo
que se ganó y lo que se sacrificó. Se actualiza cada vez que se cierra un ADR.

## Para cualquiera

Elegimos herramientas estándar donde el jurado las va a buscar (MCP, A2UI), un solo
lenguaje para que cuatro personas toquen todo sin pisarse, datos inventados pero
creíbles, y una regla: nada que no esté probado entra a la demo.

## Técnico

| Dimensión | Decisión | Alternativa descartada | Qué ganamos | Qué sacrificamos | ADR |
|---|---|---|---|---|---|
| **Modelo** | Claude Sonnet vía AI SDK, intercambiable por variable de entorno | Gemini (nativo del ecosistema A2UI); modelos locales | Tool calling y structured output confiables; el equipo lo conoce | Costo por token; dependencia de una API externa en la demo (mitigado con plan B grabado) | pendiente |
| **Protocolo de UI** | A2UI v0.9.1 con `@a2ui/react` y catálogo propio | Protocolo propio `tipo → componente`; MCP Apps; renderer Lit | Estándar que el jurado nombró; catálogo controlado (UI como datos, sin código arbitrario); puntos de ingeniería | Paquete en preview (plan B: processor propio de los mismos mensajes) | 0003 |
| **Protocolo de datos y acciones** | MCP propio, Streamable HTTP, tools de lectura y de acción | Llamar funciones internas sin MCP | Las mismas tools sirven a cualquier cliente; la acción es visible y auditable | Un proceso más; latencia de un salto HTTP | 0001 |
| **Lenguaje** | TypeScript de punta a punta, Zod como contrato | Python + Next.js; NestJS | Un schema, un lenguaje, cualquiera toca cualquier archivo | Sin pandas/sklearn a la mano (escape: ADR 0002) | 0001 |
| **ML** | Ninguno como núcleo; Python solo detrás de una tool con fallback | Modelo propio de scoring | Cero riesgo de demo | Menos "IA" aparente; se compensa con la calidad del agente | 0002 |
| **Datos** | Sintéticos, deterministas, commiteados, con estado mutable reiniciable | Fuentes públicas; base de datos real | Demo reproducible; la acción se ve; se reinicia antes de cada ensayo | No hay "escala real" (Tiger Data como opcional cubre esa narrativa) | — |
| **Infraestructura** | Local como demo principal; **Coolify en el VPS del equipo** (Postgres 17 + TimescaleDB ya arriba) como respaldo público; Vultr solo por el premio lateral | VM nueva en Vultr; PaaS | Infra que ya conocemos y opera; TimescaleDB listo para movimientos como series de tiempo | Un deploy que mantener; se congela en la hora 30 | ver `deploy.md` |
| **Estado del agente** | Sin estado en servidor; historial y acciones viajan en el request; el estado del negocio vive en el MCP | Sesiones en servidor | Simplicidad, sin bugs de sesión | Requests más grandes | — |

## Riesgos aceptados y su mitigación

| Riesgo | Mitigación |
|---|---|
| `@a2ui/react` no rinde con catálogo propio | Spike de 2 h; plan B con processor propio (ADR 0003) |
| El modelo inventa componentes fuera del catálogo | Structured output contra el schema del catálogo + validación antes de emitir |
| API del modelo cae en la demo | Grabación en la hora 30; `estable` etiquetado |
| Un reintento aplica una acción dos veces | `idempotencyKey` en tools de acción |
