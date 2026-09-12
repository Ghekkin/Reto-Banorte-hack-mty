---
estado: resuelto
severidad: critica
area: infra
encontrado: 2026-09-12 12:40
github: 12
resuelto-en: fuera del codigo — tope de gasto ampliado en AI Studio, verificado 2026-09-12 12:10
---

# La demo está caída: el proyecto de Gemini pasó su tope de gasto mensual

**Dónde:** producción (`https://maya.157.173.204.174.sslip.io/api/agente`) y cualquier
entorno que use la llave actual.

**Qué esperaba:** que un prompt del guion devuelva mensajes A2UI.

**Qué pasa:** el turno llama `panorama_inicial` y muere en el modelo:

```
{"tipo":"error","codigo":"modelo","mensaje":"Failed after 3 attempts. Last error:
Your project has exceeded its monthly spending cap. Please go to AI Studio at
https://ai.studio/spend to manage your project spend cap."}
```

La interfaz no se rompe: sale el aviso y el stream cierra limpio. Pero **no se construye
ninguna pantalla**, que es el producto entero. El paso del CI "un prompt del guion contra
la URL publica" ya lo está marcando en rojo, que es justo para lo que existe.

**No es del código.** Es el tope de gasto del proyecto de Google AI Studio. El commit
`737f0a1` (el que marcamos `estable`) pasó el ensayo completo a las 12:00 con el mismo
código.

**Impacto en la demo: la rompe entera.** Sin modelo no hay interpretación, no hay
interfaz generada y no hay ciclo.

## Cómo se destraba (hace falta una persona con acceso)

Por orden de preferencia:

1. **Subir el tope de gasto** del proyecto en https://ai.studio/spend. Es lo más rápido y
   no toca el repo.
2. **Usar el respaldo del ADR 0005**: poner `ANTHROPIC_API_KEY` y `MODELO=claude` en las
   variables de `maya-web` en Coolify, y redesplegar. El código ya lo soporta sin cambios
   (`apps/web/src/lib/agente/modelo.ts`); hoy `ANTHROPIC_API_KEY` está **vacía** en el
   `.env` y no está en el servidor, por eso no se puede cambiar solo.
3. **Otra llave de Gemini** de un proyecto distinto, en la misma variable.

Mientras tanto, el plan B de la demo es **la grabación**, que todavía no está hecha: es
ahora la tarea más urgente del rol `demo`.
