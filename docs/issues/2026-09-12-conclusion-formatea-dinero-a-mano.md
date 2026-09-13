---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-12 19:45
resuelto-en: mismo bloque (Conclusion.datos[].montoCentavos + rechazo del `$`)
---

# El modelo formateaba el dinero a mano en `Conclusion` y llegó a pantalla `$457,09.50`

**Dónde:** `packages/catalogo/src/conclusion/schema.ts` (`DatoDeApoyo.valor`, que era
`z.string()`), y el componente que lo pintaba tal cual.

**Qué esperaba:** que un monto en pantalla saliera formateado por la interfaz, como en todo el
resto del catálogo.

**Qué pasa:** `Conclusion.datos[].valor` era la **única** prop del catálogo donde el modelo
escribía una cifra de dinero como texto, con el `describe` pidiéndolo explícitamente ("Ya
formateado y corto: '$3,193.35'"). Eso viola la regla del repo —los montos viajan en centavos
enteros y formatea quien pinta— y el 2026-09-12 salió a la pantalla de Ana:

```
Actualmente pagas $457,09.50 mensuales      ← el dato real son 457095 centavos = $4,570.95
Nueva mensualidad estimada $504,78.50
```

El destrozo es reproducible y explica los dos casos: el modelo toma el entero de centavos, lo
agrupa como si fueran pesos (`457095` → `457,095`) y después le mete el punto decimal **dentro
del número ya agrupado** → `457,09.50`.

**Por qué nadie lo detuvo:** `datos` casi siempre llega **enlazada** (`{"path":"/lectura/datos"}`),
y `revisarProps` se saltaba toda prop enlazada. Ver el issue hermano
`2026-09-12-props-enlazadas-sin-validar.md`, que es la causa de fondo.

**Empeoró por el tope de 3 tarjetas** (bloque anterior del mismo día): desde que `Conclusion` es
obligatoria en toda pantalla, este bug pasó de ocasional a sistemático.

**Cómo quedó:**

1. `DatoDeApoyo` gana `montoCentavos` para el dinero y el componente lo formatea con
   `formatearMonto`. Con eso el error es **imposible por construcción**, venga la prop enlazada o
   literal.
2. `valor` queda solo para lo que no es dinero (`+74%`, `39/100`), y un `valor` que empieza con
   `$` se **rechaza** y le vuelve al modelo con el mensaje de usar `montoCentavos`
   (`dineroEscritoAMano` en `pantalla.ts`).
3. `ejemplos/conclusion.jsonl` migró a `montoCentavos`: es few-shot, y un ejemplo que formatea a
   mano enseña a formatear a mano.
4. Regla en el prompt para el texto libre (`titular`, `detalle`), que no se puede tipar: "los
   centavos NUNCA se escriben como pesos".

**Pruebas:** `packages/catalogo/src/__tests__/props-de-vista.spec.tsx` ("Conclusion: el dinero lo
formatea el componente") y `apps/web/src/lib/agente/__tests__/props-resueltas.spec.ts` ("rechaza el
monto escrito a mano en `valor`").
