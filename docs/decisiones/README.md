# Decisiones de arquitectura (ADR)

Una decisión importante se escribe **antes o en el momento** de ejecutarla, no
después. El objetivo no es justificar: es que a las 3 am nadie reabra una discusión
ya cerrada por no saber que se cerró.

## Formato

Archivo `NNNN-slug-corto.md`, numerado en orden. Nunca se borra ni se edita el fondo:
si una decisión cambia, se escribe una nueva que la reemplaza y la vieja se marca
`estado: reemplazada por NNNN`.

```markdown
---
estado: aceptada        # propuesta | aceptada | reemplazada por NNNN
fecha: 2026-09-10
---

# Título: la decisión en una frase

## Contexto
Qué problema había y qué restricciones pesaban.

## Decisión
Qué se decidió. En imperativo, sin ambigüedad.

## Alternativas descartadas
Qué más se consideró y por qué no.

## Consecuencias
Qué gana el equipo, qué pierde, qué hay que vigilar.
```
