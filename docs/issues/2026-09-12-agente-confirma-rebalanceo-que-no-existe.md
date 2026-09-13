---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-12 15:05
resuelto: 2026-09-12 22:45
github: 16
---

# El agente confirma un rebalanceo que nunca se ejecutó: seis widgets disparan acciones que ninguna tool atiende

**Dónde:**
- `packages/catalogo/src/orden-rebalanceo/schema.ts:34` declara `confirmar_rebalanceo`, que no existe en el MCP.
- `apps/mcp/src/tools/ejecutar-decision.ts:24` solo despacha cuatro acciones: `aplicar_plan_pago`, `crear_apartado`, `cancelar_suscripcion`, `crear_tope_gasto`.
- `packages/a2ui/src/acciones.ts:42` (`esAccionDeMutacion`) trata como mutación todo lo que no empiece con `ver_` o `elegir_`, y `apps/web/src/lib/agente/historial.ts:86` le pide al agente llamar `ejecutar_decision` con ese nombre.
- Mismo problema, sin tool detrás: `distribucion-portafolio/schema.ts:35` (`rebalancear_portafolio`), `comparador-antes-despues/schema.ts:33` (`aplicar_estrategia`), `riesgo-rendimiento/schema.ts:37` (`seleccionar_instrumento`), `proyeccion-crecimiento/schema.ts:35` (`simular_inversion`), `termometro-salud-financiera/schema.ts:30` (`mejorar_salud_financiera`).

**Qué esperaba:** que un botón que promete una operación ("Confirmar rebalanceo", "Aplicar estrategia", "Invertir en NTREX") ejecute algo real y la pantalla lo refleje, o que no exista. Y que `Confirmacion` solo aparezca después de una tool que cambió estado, como pide el prompt (`apps/web/src/lib/agente/prompt.ts:134`).

**Qué pasa:** con Carmen, "¿Cómo va mi portafolio?" → `DistribucionPortafolio`; "Rebalancear al modelo" → `OrdenRebalanceo`; "Confirmar rebalanceo" → el agente solo llama `consultar_inversiones` (lectura), pinta **`Confirmacion` "Tu rebalanceo quedó ejecutado"** y dice "Tu rebalanceo quedó ejecutado con éxito sin comisiones". No se ejecutó nada: `banorte.acciones_aplicadas` quedó con 0 filas. El portafolio en Productos sigue igual.

Con los botones que suenan a vista el modelo improvisa mejor: "Mejorar mi salud financiera" lo llevó a `analizar_ahorro` y pintó el portafolio, sin inventar una operación. El riesgo está en los que prometen ejecutar.

**Cómo lo reproduje / por qué estoy seguro:** con el modelo real, en local, el 2026-09-12 a las 15:00, desde `/maya` como `usr_carmen`, tocando los botones con Playwright. Las tres respuestas del stream quedaron grabadas (tools llamadas: `panorama_inicial`, `analizar_ahorro` · `consultar_inversiones` · `consultar_inversiones`). Consulta a la base después: `select count(*) from banorte.acciones_aplicadas` → 0.

**Impacto en la demo:** no está en el guion, pero se nota si alguien lo toca: Carmen tiene la sugerencia "¿Cómo va mi portafolio?" en la consola (`apps/web/src/components/maya/consola-maya.tsx:17`), y la portada que arma Maya en Inicio manda los botones de sus tarjetas a `/maya?accion=…`. Un juez que toca "Confirmar rebalanceo" ve a la IA afirmar una operación financiera que no ocurrió, que es justo el criterio 3 de la rúbrica ("no alucina datos").

**Arreglos posibles, de menor a mayor:**
1. Renombrar las que son navegación a `ver_…`/`elegir_…` (`ver_orden_rebalanceo`, `elegir_instrumento`, `ver_proyeccion`, `ver_como_mejorar`) para que el agente las trate como vista.
2. `aplicar_estrategia` en `ComparadorAntesDespues` es la reestructura: puede disparar `aplicar_plan_pago` con el plazo.
3. Quitar el botón de `OrdenRebalanceo` mientras no haya tool, o agregar `rebalancear_portafolio` al MCP como mutación real con su lectura posterior.
4. Regla dura en el agente: si la acción no es una de las cuatro de `ejecutar_decision`, prohibido pintar `Confirmacion`.

**Solución implementada (2026-09-12):**
- Se creó e integró la tool de mutación real `rebalancear_portafolio` en MCP (`apps/mcp/src/tools/rebalancear-portafolio.ts`), con schema en `@maya/schemas` y orquestación en `ejecutar_decision`.
- Persiste en `banorte.acciones_aplicadas` (con idempotencia por `idempotencyKey`), actualizando el portafolio a `desviacionModeloPct = 0` y alineando los pesos de cada posición al objetivo.
- La lectura posterior de `ejecutar_decision` relee automáticamente con `consultar_inversiones`, cerrando el ciclo de 2 pasos.
- `OrdenRebalanceo` ahora emite `rebalancear_portafolio` (mutación real confirmada).
- Los widgets de navegación/exploración fueron renombrados a prefijos `ver_` o `elegir_` (`ver_orden_rebalanceo`, `elegir_estrategia`, `elegir_instrumento`, `elegir_plan_inversion`, `ver_como_mejorar`) para que `esAccionDeMutacion` los clasifique correctamente como vistas sin intentar llamar `ejecutar_decision` erróneamente.
- Todos los tests unitarios e integrales en MCP, Catálogo y Web pasan al 100%.

