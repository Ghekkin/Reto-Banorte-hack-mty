# Algoritmos y lógica no trivial

Toda lógica que no sea "leer y devolver" se documenta aquí: scoring, ranking,
categorización, heurísticas de qué componente elegir, reglas de negocio con más de dos
condiciones, parsing, cualquier modelo (en TS o Python).

El criterio: **si alguien tendría que leer el código con atención para explicar qué
hace, va aquí.**

## Plantilla

```markdown
---
verificado: 2026-09-11 14:30
implementado-en: apps/mcp/src/lib/<archivo>.ts   # ruta exacta
lenguaje: typescript                             # typescript | python
---

# <Nombre del algoritmo>

## Para cualquiera

Qué problema resuelve y cuál es la idea en una analogía o en dos frases. Sin fórmulas.

## La idea

Por qué funciona. Qué intuición hay detrás. Si es un modelo, qué aprende y de qué.

## Paso a paso

1. Recibe X.
2. Calcula Y porque Z.
3. Devuelve W.

## Entradas y salidas

| Entrada | Tipo | Ejemplo |
|---|---|---|

| Salida | Tipo | Ejemplo |
|---|---|---|

## Parámetros y umbrales

Cada número mágico, de dónde salió y qué pasa si se mueve.

## Límites y supuestos

Qué NO maneja. Con qué datos falla. Qué se asumió para que fuera viable en 36 horas.

## Cómo se probó

Casos concretos con resultado esperado. Idealmente un test en el repo, con ruta.
```
