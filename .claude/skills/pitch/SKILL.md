---
name: pitch
description: Cómo se construye el pitch de 5 minutos a partir de la bitácora - estructura, guion literal, qué se dice sobre cada pantalla, preguntas probables de los jueces con sus respuestas, y ensayo con cronómetro. Invocar desde la hora 24 en adelante; dueño el rol demo.
---

# Pitch

El pitch es **la demo con voz**. Cinco minutos: tres de demo en vivo (ya escrita en
`docs/demo/guion-demo.md`), dos de contexto y cierre. Se escribe en
`docs/demo/pitch.md` y se ensaya con cronómetro al menos tres veces.

## Estructura (5:00)

| Tiempo | Qué | Fuente |
|---|---|---|
| 0:00–0:30 | El problema en una frase y quién es el usuario. Sin "hola somos…" largo. | ADR 0003 |
| 0:30–1:00 | La idea: el agente no responde texto, **genera la interfaz que el usuario necesita**. Una frase sobre MCP: las capacidades son tools. | `contexto-del-reto.md` |
| 1:00–4:00 | Demo en vivo, guion literal. Cada pantalla: qué pidió el usuario, qué decidió el agente, qué tool alimentó la vista. | `guion-demo.md` |
| 4:00–4:40 | Qué aprendimos y qué decidimos a propósito: dos o tres decisiones con hora, sacadas de la bitácora ("a la hora 6 decidimos que el agente no escribe HTML porque…"). | `bitacora/equipo.md`, `decisiones/` |
| 4:40–5:00 | Qué sigue en una frase. Gracias. | — |

## Reglas

- **Quien presenta no maneja la máquina.** Uno habla, otro teclea los prompts (que
  están en un archivo para pegar). Se ensaya así.
- **Nada de slides con texto que se lee.** Máximo 4 slides: título, problema, diagrama
  de arquitectura (`vision-general.md`), qué sigue. La demo es la slide.
- **Cada pantalla tiene su frase.** "Esta gráfica no la programamos: el agente decidió
  mostrarla porque la pregunta era de gasto por categoría." Escrita en el pitch.
- **Honestidad técnica**: los datos son simulados y se dice. Un juez de Banorte lo va
  a preguntar; adelantarse suma.
- Cronómetro en cada ensayo. Si pasa de 5:00, se corta demo, no contexto.

## Preguntas probables (respuestas escritas en `pitch.md`)

- ¿Qué pasa con datos reales / seguridad / PII? → Arquitectura: las tools son la
  frontera; el agente nunca ve más de lo que la tool devuelve; auth va en el MCP.
- ¿Por qué MCP y no llamar la API directo? → Las mismas tools sirven a cualquier
  cliente (nuestro host, Claude Desktop, otro agente); lo demostramos.
- ¿Cuánto cuesta por conversación? → Número real medido en los ensayos (tokens × precio).
- ¿Por qué no es solo un chatbot? → La UI es la respuesta; mostrar una pantalla compuesta.
- ¿Qué se rompió? → Contar uno de la bitácora de issues. Suma credibilidad.

## Ensayos

Hora 24 (primero, con checklist-demo), hora 30 (congelado, se graba el plan B), hora
34 (en la máquina de presentación). Cada ensayo: tiempo, qué se trabó, qué frase se
cambió, en `docs/bitacora/equipo.md`.
