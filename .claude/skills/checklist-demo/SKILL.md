---
name: checklist-demo
description: Corre y registra la verificación previa a un ensayo de demo o al pitch - entorno, arranque, cada paso del guion, plan B. Invocar antes de cada ensayo y antes de presentar.
---

# Checklist de demo

Corre `docs/demo/checklist-previa.md` completa, en orden. No se salta nada por "eso
ya estaba bien hace una hora".

## Pasos

1. Lee `docs/demo/guion-demo.md`. Si la sección "Guion literal" está vacía, la demo
   no está definida: dilo y para.
2. Verifica entorno: repo en `main` al último commit, `.env` presente, dependencias
   instaladas, script de arranque levanta todo, cada `/health` responde.
3. `pnpm --filter mcp reiniciar-estado`. Luego ejecuta el guion **con los prompts
   literales**, en orden. Para cada paso anota: renderizó lo esperado sí/no, error en
   consola sí/no, tiempo. El guion debe cubrir, explícitamente y en este orden, lo que
   el jurado va a buscar: **intención → UI generada → interacción → acción que cambia
   algo → nueva UI**, y un segundo usuario demo que obtenga otra interfaz con la misma
   pregunta (adaptabilidad).
4. Un prompt fuera de guion: el agente responde algo razonable sin romper nada.
5. Plan B: la grabación abre y se ve; los prompts están en un archivo de texto.
6. Anota la corrida en la tabla "Registro de corridas" del checklist con hora, quién
   y resultado.
7. Todo lo que falló: issue con `severidad: critica` o `alta` (skill
   `registrar-issue`). Si no se arregla en 10 minutos, se decide con el usuario si el
   guion lo rodea.
8. **Si todo pasó**, corre `scripts/marcar-estable.sh`: mueve la etiqueta `estable` a
   este commit y la sube. Es el punto al que se vuelve si `main` se rompe después.
9. Entrada en `docs/bitacora/equipo.md`: "ensayo N, resultado, qué se rompió, estable en <hash>".

## Momentos fijos (sugeridos en `preguntas-para-manana.md`)

- Hora 24: primer ensayo completo.
- Hora 30: congelar features, grabar plan B.
- Hora 34: último ensayo en la máquina de presentación.
