---
estado: aceptada
fecha: 2026-09-12
---

# 0005 — Gemini 3.8 Flash como modelo principal, Claude Sonnet 5 como respaldo

## Contexto

El agente hace tres cosas por turno: interpretar la intención, llamar tools MCP y
emitir JSON A2UI restringido al catálogo (structured output). Se estimaron ~1,500
turnos en el hack (4 personas probando + ensayos), ~15K tokens de entrada y ~3K de
salida por turno. Se compararon cuatro modelos con precios verificados el 2026-09-12:

| Modelo | Entrada / salida por 1M | Costo estimado del hack | Notas |
|---|---|---|---|
| Claude Opus 5 | $5 / $25 | ~$250–350 | Mejor juicio; latencia media; el más caro |
| Claude Sonnet 5 | $2 / $10 | ~$90–140 (~$60 con caché) | Muy confiable en tools y JSON |
| **Gemini 3.8 Flash** | **$0.75 / $3.75** (promo hasta 2026-12-31) | **~$35–50** | El Flash más capaz; ecosistema natal de A2UI; premio MLH |
| Claude Haiku 4.5 | $1 / $5 | ~$45 | 200K contexto; menos juicio |

Gemini 3.8 Flash: código `gemini-3.8-flash`, 1,048,576 tokens de entrada, 65,536 de
salida, niveles de pensamiento `low | medium | high`, structured outputs y function
calling soportados. El nivel gratuito (5–15 RPM, 1,000/día) no alcanza para cuatro
personas: hay que activar facturación desde el inicio.

## Decisión

1. **Gemini 3.8 Flash es el modelo principal**, vía `@ai-sdk/google`. Relación
   calidad/precio y latencia para una demo "en tiempo real"; los ejemplos oficiales de
   A2UI corren sobre Gemini; y es el premio "Best Use of Gemini API".
2. **Claude Sonnet 5 queda cableado como respaldo** detrás de `MODELO=claude`
   (`@ai-sdk/anthropic`). Un solo proveedor en la demo es un punto único de fallo;
   con dos, la caída de uno se resuelve con una variable de entorno. También sirve
   de comparación honesta para `trade-offs.md`.
3. **Nivel de pensamiento `low` por defecto** en el agente (latencia), `medium` solo
   si en los ensayos las decisiones de interfaz salen planas. Se mide en la hora 24.
4. **Facturación activa en Google desde la hora 1**, tope de gasto sugerido: $50 en
   Google, $100 en Anthropic (respaldo). Si el stand da créditos, se ajusta.
5. **Caché y disciplina de prompt** como si el modelo fuera caro: system prompt,
   catálogo y tools como prefijo estable; historial compacto; ≤ 8 pasos por turno.

## Alternativas descartadas

- **Opus 5 como principal.** Mejor juicio, pero 6–8× el costo y más latencia; para lo
  que se evalúa, la diferencia no justifica el gasto. Queda como experimento opcional
  del ensayo de la hora 24 si sobra presupuesto.
- **Sonnet 5 como principal.** Era la recomendación técnica inicial (más confiable en
  tools y JSON). Se descarta por costo y porque Gemini suma el premio y encaja con
  A2UI; se conserva como respaldo.
- **Haiku 4.5.** Ahorro mínimo frente a Sonnet, menos juicio.
- **Solo Gemini.** Sin respaldo, un incidente del proveedor en la demo no tiene salida.

## Consecuencias

- `modelo.ts` en el agente: `MODELO=gemini` (default) → `google("gemini-3.8-flash")`;
  `MODELO=claude` → `anthropic("claude-sonnet-5")`. Nada más en el código sabe cuál es.
- `.env.example`: `MODELO`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`.
- El guion se ensaya con los dos modelos al menos una vez (hora 24). Si Gemini falla
  en algún prompt del guion dos veces, es issue `alta` y se decide el modelo de demo.
- Riesgo: JSON A2UI fuera del catálogo. Mitigación: structured output contra el
  schema del catálogo y validación antes de emitir (ADR 0003), en los dos proveedores.
- El premio de Gemini pasa de "probable" a **objetivo**: `demo` registra la aplicación.
