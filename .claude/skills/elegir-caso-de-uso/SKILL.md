---
name: elegir-caso-de-uso
description: Decisión del caso de uso del reto en menos de 45 minutos con la rúbrica oficial como criterio - matriz, elección, ADR 0004 con el flujo accionable, los componentes del catálogo y las tools que implica, y arranque en paralelo de los cuatro roles. Invocar al arrancar el desarrollo.
---

# Elegir el caso de uso

Timebox: **45 minutos**. Si a los 45 no hay acuerdo, decide el rol `demo`. El consejo
oficial manda: **"elijan un problema pequeño y resuélvanlo completo. Un solo flujo
financiero, con una UI que de verdad cambia y una acción que de verdad ocurre, vale
más que cinco pantallas a medias."**

## Pasos

1. **Lee** `docs/reto/contexto-del-reto.md` (dominio, ejemplo oficial, reglas) y
   `docs/reto/rubrica-y-entregables.md`. La rúbrica es el criterio; no hay otro.
2. **Candidatos**: ya hay cinco puntuados en `docs/reto/casos-de-uso.md`, cada uno
   con flujo accionable, componentes, tools y cómo mostrar adaptabilidad, más una
   recomendación. Parte de ahí: se pueden ajustar puntajes o agregar uno, no empezar
   de cero. Un candidato sin acción real queda fuera antes de puntuar.
3. **Matriz** en `docs/decisiones/0004-caso-de-uso.md`, puntúa 1–3:
   - **Utilidad real** (25%): ¿resuelve un problema que una persona reconoce?
   - **Adaptabilidad visible** (20%): ¿la misma pregunta con otro contexto produce otra
     interfaz? ¿Intenciones distintas producen ≥3 componentes distintos?
   - **Cambio real demostrable** (regla 3): ¿la acción muta estado y se ve después?
   - **Datos sintéticos creíbles** en 2 horas.
   - **Riesgo técnico bajo**: nada que dependa de una API externa que no controlamos.
   - **Innovación** (10%): ¿hay un ángulo que los demás equipos no van a tener?
4. **Elige** el mayor. Empate: gana el que tenga la acción más clara.
5. **Cierra el ADR 0004** con: historia de usuario en una frase; los **dos usuarios
   demo** con contexto distinto (para demostrar adaptabilidad); los **3–4 componentes
   del catálogo** (nombre en PascalCase, para qué intención); las **tools** de lectura
   y **la tool de acción** (nombres `snake_case`); el flujo accionable paso a paso;
   qué NO entra.
6. **Reparte de inmediato** en `docs/tablero.md`:
   - `contrato`: spike `@a2ui/react` con un componente propio (ADR 0003) → schemas de
     tools → agente.
   - `mcp`: datos sintéticos con estado mutable → tools de lectura → tool de acción.
   - `web`: tokens visuales → primer componente del catálogo con `.jsonl` de ejemplo.
   - `demo`: guion literal con los prompts, cuentas de servicios, `README.md` raíz.
7. `docs/reto/contexto-del-reto.md`: la sección de decisiones apunta al ADR 0004.
   Entrada `decisión` en `docs/bitacora/equipo.md`.

## Señales de que la elección está mal

- La "acción" es mostrar otra pantalla, no cambiar un estado.
- Se explica con texto y la UI es decoración.
- Nadie sabe describir qué cambia si el usuario tiene otro saldo.
- Necesita autenticación real, API bancaria real o un modelo entrenado por nosotros.
