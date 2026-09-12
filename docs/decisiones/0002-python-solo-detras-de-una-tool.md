---
estado: aceptada
fecha: 2026-09-10
---

# 0002 — Python solo detrás de una tool, nunca en el contrato tool → UI

## Contexto

Puede que el caso de uso pida algo de ML (scoring de riesgo, anomalías en movimientos,
forecast de flujo). El stack es TS (ADR 0001). Pregunta: ¿se puede mezclar Python?

## Decisión

Sí, con una sola costura y estas reglas:

1. **TS es dueño del schema.** La tool MCP declara su schema Zod, valida la respuesta
   de Python al entrar y devuelve un fallback si Python falla. Para el agente y la UI,
   Python no existe.
2. **Python es un FastAPI mínimo** en `services/ml/`: 1–3 endpoints (`/score`,
   `/forecast`, `/health`), sin ORM, sin auth, sin capas. Contrato JSON acordado en el
   doc de la tool.
3. **Ningún flujo de la demo tiene a Python como única ruta.** Toda tool que llame a
   Python nace con un mock en TS que devuelve datos plausibles. El mock es el default;
   Python se conecta solo si hay tiempo y el caso lo justifica. Se decide en la hora
   30 con información, no en la hora 2 apostando.
4. **Nada se descarga en caliente.** Si hay pesos de modelo, van cacheados en disco
   antes de presentar. `requirements.txt` con versiones exactas.

## Antes de meter Python, agotar en este orden

1. **Precalcular offline**: entrenar/inferir en Python de noche, guardar resultados como
   JSON en el repo, la demo lee el archivo. Visualmente idéntico, cero infra.
2. **Exportar a ONNX** y correr con `onnxruntime-node`. Un solo proceso.
3. **Que el modelo sea Claude**: clasificación, extracción de un estado de cuenta,
   categorización de gastos, explicación de un score. Encaja con el reto.

## Alternativas descartadas

- Python como backend principal: ver ADR 0001.
- Python "solo para el ML" sin mock en TS: convierte un servicio opcional en punto único
  de fallo de la demo.

## Consecuencias

- Si aparece Python, es una carpeta chica y un proceso más en el script de arranque,
  con `/health` que el host consulta.
- El equipo puede desarrollar UI y agente completos desde la hora 1 contra el mock.
- Hay que documentar en `docs/algoritmos/` cualquier modelo o heurística, con la idea
  en palabras (regla 3 del CLAUDE.md), esté en TS o en Python.
