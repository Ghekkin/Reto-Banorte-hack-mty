---
verificado: 2026-09-11
fuentes: [mlh.com/events/hackmty-2026/prizes]
---

# Premios objetivo

La página de MLH lista solo los premios de **patrocinadores de MLH**. El premio del
reto de Banorte y el premio principal del evento **no aparecen ahí**: se preguntan el
día 1 (ver `preguntas-para-manana.md`).

## Regla que protege todo

Un premio lateral **nunca está en la ruta crítica de la demo**. Si Vultr se cae, se
corre local; si Tiger Data no responde, el mock toma el control; si ElevenLabs falla,
se escribe en el chat. Y nada nuevo entra después de la hora 30.

## Los ocho premios MLH, contra nuestro proyecto

| Premio | Encaje | Costo | Veredicto |
|---|---|---|---|
| .Tech Domain | Un dominio apuntando a la demo | ~15 min | **Sí** |
| Vultr | Deploy + URL pública HTTPS para el MCP | ~1 h | **Sí** |
| Tiger Data | Los movimientos financieros *son* series de tiempo | 2–3 h | **Sí, mejora el reto** |
| ElevenLabs | Voz de entrada, interfaz generada de salida; ya usado en Yolani | 1–2 h | **Sí** |
| Gemini API | Con AI SDK es agregar `@ai-sdk/google`; A2UI nace en Google y sus ejemplos usan Gemini | 1 h | **Probable, subió** |
| MongoDB Atlas | Compite con Tiger Data por la misma capa | 2 h | Solo si Tiger falla |
| Snowflake | Igual, y más pesado de montar | 3 h+ | No |
| Solana | Diluye la narrativa bancaria | 4 h+ | **No** |

## Objetivo: reto Banorte + 4 laterales (~5 h de las 36)

**Nivel 0 — gratis, aunque sea a la hora 34 (1 h, 2 premios)**

- **.Tech**: registrar el dominio y apuntarlo al deploy. Que **no imite a Banorte**
  (nada de `banorte.tech`): nombre del producto.
- **Vultr**: desplegar `apps/mcp` y `apps/web`. De paso resuelve un endpoint MCP
  público al que un juez pueda conectar su propio cliente.

**Nivel 1 — mejora el reto (2–3 h)**

- **Tiger Data**: Postgres con la extensión de series de tiempo detrás de las tools;
  hypertables y agregados continuos sobre los movimientos. El mock se queda como
  fallback (ADR 0002).

**Nivel 2 — mejora la demo (1–2 h)**

- **ElevenLabs**: el usuario habla y la interfaz aparece. SDK ya conocido.

**Nivel 3 — si va sobrado (1 h)**

- **Gemini**: mejor en una tarea multimodal (foto de estado de cuenta o ticket → datos
  → interfaz) que como simple cambio de modelo.

## Descartados

- **Solana**: 4 h y confunde el mensaje en una demo para un banco.
- **Snowflake / MongoDB**: pelean con Tiger Data por el mismo hueco. Uno solo.

## Pendiente de confirmar el día 1

- Qué da Banorte por su reto y cuál es el premio principal del evento.
- Si los premios MLH exigen registro aparte (Devpost u otro) y con qué fecha límite.
- Qué evalúan los jueces de Banorte: eso decide si Tiger Data y ElevenLabs entran.
