---
estado: resuelto
severidad: media
area: web
encontrado: 2026-09-12 19:40
resuelto-en: mismo bloque (el componente acota y el schema valida el rango)
---

# `SimuladorMeta` pintó una aportación por debajo de su propio piso

**Dónde:** `packages/catalogo/src/simulador-meta/` (schema y componente).

**Qué pasa:** en la pantalla de Ana del 2026-09-12 la tarjeta mostró:

```
Aportación mensual   $477.00
[slider]  $500.00 ————————————————— $6,629.05
llegas en 117 meses · 12 de junio de 2036
```

`$477` está **por debajo** de `aportacionMinimaCentavos` ($500). El punto del slider quedó pegado al
extremo izquierdo y la fecha de llegada se calculó con un número que el propio control no puede
representar. La aritmética del componente era correcta; la entrada era imposible.

**Por qué nadie lo notó, y son dos razones que se suman:**

1. Zod valida prop por prop. No había ninguna regla que relacionara `aportacionCentavos` con
   `aportacionMinimaCentavos` / `aportacionMaximaCentavos`.
2. Las tres props venían **enlazadas**, y `revisarProps` se saltaba las enlazadas (ver
   `2026-09-12-props-enlazadas-sin-validar.md`).

**Cómo quedó, en las dos capas:**

- **El componente acota** la aportación al rango antes de usarla (`aportacionUsada`), así que la
  pantalla no puede volver a mostrar un valor fuera de su slider, venga la prop enlazada o literal.
  Es la última línea y es la que garantiza que la demo no se vea mal.
- **El schema lo reporta** con dos `.refine` (que la aportación caiga en el rango, y que el piso sea
  menor que el tope), para que el modelo se entere en vez de salir bien de milagro. Con la validación
  sobre props resueltas, esto sí se dispara aunque vengan enlazadas.

**Nota sobre los `.refine` y las dos capas de validación:** los refinamientos de Zod **no** se
serializan a JSON Schema, así que el catálogo publicado (`catalogo.json`) no los expresa y la capa de
ajv no los ve. Es aceptable porque el error vuelve al modelo por la vía de Zod, pero conviene tenerlo
presente: es lo contrario del caso de `Conclusion.tono`, donde el problema era justamente que las dos
capas tenían que decir lo mismo.

**Pruebas:** `packages/catalogo/src/__tests__/props-de-vista.spec.tsx` ("SimuladorMeta: la aportacion
se acota a su propio rango", cuatro casos) y
`apps/web/src/lib/agente/__tests__/props-resueltas.spec.ts` ("caza la aportacion por debajo de su
propio piso: el caso de la captura").
