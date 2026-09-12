# Documentación — empieza aquí

Este índice es la puerta de entrada. Si un documento no está enlazado desde aquí,
nadie lo va a leer: **todo doc nuevo se agrega a este índice en el mismo commit.**

Todo lo necesario para retomar el trabajo está en el repo. Nadie debería tener que
preguntar en el chat "¿en qué ibas?": lo dice el tablero y lo dice la bitácora de cada
quien.

## Cómo está organizada

| Carpeta / archivo | Responde a | Regla |
|---|---|---|
| `tablero.md` | ¿Quién está en qué ahora mismo? ¿Qué está bloqueado? | Cada quien edita solo su fila |
| `bitacora/` | ¿Qué pasó, cuándo, y dónde se quedó cada quien? | `equipo.md` para decisiones; `<nombre>.md` para cada persona |
| `equipo/` | ¿Quién es dueño de qué y cómo tocamos lo ajeno? | Roles = responsabilidad, no territorio |
| `reto/` | ¿Qué nos pidieron y qué falta por confirmar? | Se actualiza el día 1 cuando den detalles |
| `decisiones/` | ¿Por qué se hizo así y no de otra forma? | Un archivo por decisión (ADR), numerado, nunca se borra |
| `arquitectura/` | ¿Cómo encajan las piezas? | Diagramas en texto/mermaid, sin capturas |
| `como-funciona/` | ¿Qué hace cada feature y cómo? | **Dos niveles**: para cualquiera + técnico |
| `algoritmos/` | ¿Cómo funciona esta lógica no trivial? | Idea en palabras, pasos, entradas/salidas, límites |
| `issues/` | ¿Qué está roto o es deuda conocida? | Un archivo por hallazgo + issue en GitHub |
| `demo/` | ¿Qué vamos a mostrar y cómo verificamos que funciona? | Guion + checklist previa |

## Índice

### Coordinación
- [Tablero](tablero.md) — quién está en qué, bloqueos, siguiente
- [Roles](equipo/roles.md) — los cuatro roles y cómo tocar dominio ajeno
- [Bitácoras](bitacora/README.md) — cómo funcionan · [Equipo](bitacora/equipo.md)

### Reto
- [Contexto del reto](reto/contexto-del-reto.md) — lo que sabemos hoy y la hipótesis de solución
- [Preguntas para el día 1](reto/preguntas-para-manana.md) — lo que hay que confirmar cuando den detalles
- [Premios objetivo](reto/premios-objetivo.md) — qué premios laterales vale la pena perseguir y cuáles no

### Decisiones
- [Cómo se escribe una decisión](decisiones/README.md)
- [0001 — Todo en TypeScript](decisiones/0001-stack-typescript.md)
- [0002 — Python solo detrás de una tool](decisiones/0002-python-solo-detras-de-una-tool.md)

### Arquitectura
- [Visión general](arquitectura/vision-general.md) — las piezas y cómo se hablan
- [Deploy](arquitectura/deploy.md) — URLs, servidor y commit desplegado (cuando exista)

### Cómo funciona
- [Reglas y plantilla](como-funciona/README.md)

### Algoritmos
- [Reglas y plantilla](algoritmos/README.md)

### Issues
- [Registro de hallazgos](issues/index.md)

### Demo
- [Guion de la demo](demo/guion-demo.md)
- [Checklist previa](demo/checklist-previa.md)
- [Pitch](demo/pitch.md) — guion hablado, frase por pantalla, preguntas de jueces

## Reglas de escritura (resumen; el detalle está en la skill `documentar`)

1. **Escribe para alguien que llega sin contexto.** Rutas de archivo concretas, nombres
   de función, nombres de schema. El resumen ejecutivo va primero, pero no sustituye
   lo técnico.
2. **Dos niveles en el mismo documento.** Primero "para cualquiera" (sin código, sin
   jerga), después "técnico". Un juez lee lo primero; un compañero que va a tocar el
   código lee lo segundo.
3. **Cada afirmación de estado lleva fecha y hora.** "Funciona la transferencia" no
   sirve; "Al 2026-09-12 03:40 la transferencia funciona con mock, no con Python" sí.
4. **Lo que existe y lo que se planea van separados.** Un doc nunca describe algo que
   todavía no se construyó como si ya existiera. Si es plan, dice "plan" en el título.
5. **Nada de capturas de pantalla.** Envejecen a la primera iteración. Describe el
   flujo y apunta al componente.
6. **Nombres en kebab-case, español, sin acentos.**
