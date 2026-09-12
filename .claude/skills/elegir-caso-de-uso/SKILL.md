---
name: elegir-caso-de-uso
description: Decisión del caso de uso del reto en menos de 45 minutos - matriz de criterios, elección, ADR 0003 con las interfaces y tools que implica, y arranque en paralelo de los cuatro roles. Invocar el día 1 en cuanto Banorte dé los detalles.
---

# Elegir el caso de uso

Timebox: **45 minutos** desde que empieza esta skill. Discutir más no mejora la
decisión, solo la atrasa. Si a los 45 no hay acuerdo, decide el rol `demo`.

## Pasos

1. **Lee** `docs/reto/contexto-del-reto.md` (candidatos) y las respuestas ya anotadas
   en `docs/reto/preguntas-para-manana.md`. Si Banorte dio una rúbrica, es el criterio
   número uno y desplaza a los demás.
2. **Matriz**, en `docs/decisiones/0003-caso-de-uso.md` (borrador), un renglón por
   candidato, puntúa 1–3 cada columna:
   - Se demuestra completo en 3 minutos
   - Luce **≥3 interfaces distintas** generadas en una conversación (tabla, gráfica,
     formulario, comparador, línea de tiempo…)
   - Los datos se simulan de forma creíble con mock
   - Encaja con lo que Banorte dijo que evalúa
   - Riesgo técnico bajo (nada que dependa de una API externa que no controlamos)
3. **Elige** el de mayor puntaje. Empates: gana el que tenga más interfaces distintas.
4. **Cierra el ADR 0003** con: la historia de usuario en una frase ("Soy X y quiero
   Y"), las **3–4 interfaces** que el agente generará (nombre de `tipo` de cada una),
   las **tools** que las alimentan (nombres `snake_case`), y qué NO entra.
5. **Reparte de inmediato**, en `docs/tablero.md` (cada quien su fila y su línea de
   "Siguiente"):
   - `contrato`: schemas Zod de los 3–4 `tipo` + registry vacío
   - `mcp`: datos mock (skill `datos-mock`) + primera tool
   - `web`: layout del host + componente del primer `tipo` con datos de ejemplo fijos
   - `demo`: guion literal en `docs/demo/guion-demo.md` + cuentas de servicios
6. Actualiza `docs/reto/contexto-del-reto.md`: la hipótesis pasa a ser la decisión.
   Entrada `decisión` en `docs/bitacora/equipo.md` con hora.

## Señales de que la elección está mal

- Necesita autenticación real, una API bancaria real o un modelo entrenado por nosotros.
- La demo se explica con texto y la UI es decoración.
- Nadie del equipo sabe describir la pantalla 3.
