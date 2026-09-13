---
estado: resuelto
severidad: alta
area: web
github: 18
encontrado: 2026-09-13 01:28
---

# El prompt del agente pide props y tools que se revirtieron: cada turno gastaba una petición en reintentar

**Dónde:** `apps/web/src/lib/agente/prompt.ts:111-112` y `:123-124`, entrados en `df5dfae`
(sáb 23:40) junto con el trabajo que `e7dda81` revirtió.

**Qué esperaba:** que el prompt describa el `Conclusion` y las tools que existen en `main`.

**Qué pasa:** tres instrucciones apuntaban al commit revertido:

1. "En `Conclusion.datos` el dinero va en `montoCentavos`": el schema de `main`
   (`packages/catalogo/src/conclusion/schema.ts`) exige `valor` como texto. El modelo
   obedecía al prompt, la pantalla se rechazaba con
   `Conclusion (conclusion): datos.0.valor Invalid input: expected string, received undefined`
   y el turno gastaba **una petición completa (~29k tokens) en reintentar**. Pasó en 3 de 3
   turnos medidos.
2. "`ProyeccionPagoCredito` ... -> `simular_credito`": esa tool no existe en el MCP.
3. "`ProyeccionCrecimiento` y `EscenariosInversion` -> `proyectar_inversion`": tampoco existe.

**Cómo lo reproduje:** tres turnos reales ("quiero pagar menos intereses", Beto dos veces y
Ana), leyendo las líneas `error` del stream. Tras corregir el prompt, los mismos tres
turnos bajan de 3 a 2 peticiones y `pnpm probar-guion` pasa 10 de 10.

**Impacto en la demo:** se notaba: cada pantalla tardaba un paso más, y un turno que
necesitara otro reintento se quedaba sin pasos.
