---
estado: aceptada
fecha: 2026-09-13
---

# 0011 — En Inicio, las cifras de una tarjeta solo las pone el MCP; el modelo elige qué consultar

> Complementa el ADR 0003 (A2UI como protocolo) y el ciclo LIVE (`docs/como-funciona/ciclo-live.md`).
> No cambia el protocolo: cambia **quién escribe los valores** que viajan en él.

## Contexto

En la revisión de la demo con Banorte salieron dos cosas:

1. **Preguntar en Inicio se sentía como cambiar de diapositiva.** `preguntarEnInicio` rearmaba
   la portada completa, así que cada pregunta borraba las tres tarjetas y pintaba otras.
   Banorte pidió poder preguntarle **a una tarjeta** y que esa misma tarjeta cambiara.
2. El equipo puso una condición encima: **los datos que se muestren después del cambio tienen
   que salir del MCP, no de Gemini**.

La segunda ya era un problema antes de la primera. `pintar_pantalla` y `ajustar_pantalla`
reciben las props (y el data model) **escritas por el modelo**, que copia —o no— lo que
devolvieron las tools. Las validaciones revisan la **forma** (schema Zod, JSON Schema oficial,
rutas existentes), nunca el **valor**. En las portadas que estaban guardadas en la base el
2026-09-13 aparecen casos concretos:

- la conclusión de Beto decía «Crédito Nómina (restante) **$2,954,065**»; la tool devuelve
  `2954065` **centavos**, o sea $29,540.65. El modelo leyó centavos como pesos;
- `TermometroSaludFinanciera.montoAhorradoCentavos` ("ahorro acumulado") no lo devolvía
  **ninguna** tool: el modelo lo estimaba.

## Decisión

**En Inicio con `FEATURE_WIDGETS_VIVOS=1`, cada tarjeta es un *widget* con una *fuente*, y
ninguna cifra de una tarjeta la escribe el modelo.**

1. **El modelo elige, el MCP contesta, el código acomoda.** El modelo manda la fuente de cada
   tarjeta (`plan_de_pago`, `gasto_del_mes`…) y sus parámetros (un periodo, plazos a cotizar,
   un id). El servidor llama la tool del MCP y un **adaptador** —función pura en
   `apps/web/src/lib/widgets/fuentes.ts`— convierte la salida en las props del componente.
2. **Los parámetros son entradas, nunca resultados.** Cada fuente declara con Zod `.strict()`
   qué acepta; una llave desconocida (`saldoCentavos`, `usuarioId`) se rechaza. Las variantes
   de vista son enums o conteos. La única cifra que el modelo puede mandar es la **entrada de
   una simulación** que la persona pidió («si ahorro 3,000 al mes»), y lo que se pinta es lo que
   el MCP devuelve con ella.
3. **`usuarioId` sale de la sesión** y solo se consultan tools de lectura de una lista blanca
   (`consultor.ts`).
4. **Las cifras de la `Conclusion` van por referencia** (`{widget, campo}`) y el servidor las
   formatea; cuando la tarjeta cambia, la cifra la sigue.
5. **Los números en prosa pasan por un verificador** (`cifras.ts`): toda cifra del texto tiene
   que existir en lo que el MCP devolvió en ese turno, con el redondeo mostrado. Si no, vuelve
   al modelo; en el último intento, la oración se quita.
6. **Cada widget guarda su procedencia** (tool, argumentos, sha256 del resultado) y un
   **auditor** vuelve a consultar el MCP después de cada cambio y compara prop por prop antes
   de mostrarlo y guardarlo. Una diferencia no se pinta.
7. **Una pregunta cambia una tarjeta, no el dashboard.** Las salidas del turno en Inicio son
   `modificar_widget`, `reemplazar_widget` y `responder`; no existe una que rearme todo.

## Alternativas descartadas

- **Validar los valores que escribe el modelo contra las tools.** Obligaría a saber, para cada
  prop de cada componente, de qué campo de qué tool debería salir: es escribir el adaptador de
  todos modos, pero después y como policía. Mejor que el adaptador sea el único camino.
- **Enlaces A2UI a un data model con las salidas crudas de las tools** (`{path}`). Respeta el
  protocolo, pero las props de los componentes no tienen la forma de las salidas (renombres,
  ordenes, derivados como el total de intereses) y el modelo seguiría eligiendo rutas a mano.
  Los adaptadores dan props ya validadas contra el catálogo.
- **Un clasificador previo para decidir qué tarjeta tocar.** Otra llamada, otro punto de falla.
  Igual que en el ciclo LIVE, la tool que elige el modelo es la clasificación.

## Consecuencias

- **Más barato y más rápido**: el modelo ya no copia miles de tokens de datos a las props.
  Medido el 2026-09-13 con `gemini-3.5-flash-lite`: la portada pasó de ~22 000 tokens de
  entrada y 1 000–1 800 de salida (7.7–11.6 s) a ~7 000–8 500 de entrada y 300–400 de salida
  (2–6 s). Una pregunta sobre una tarjeta cierra en 1.1–2.4 s cuando el proveedor responde normal.
- **Cada componente nuevo en Inicio necesita su adaptador.** Un componente sin fuente no puede
  aparecer en una portada de widgets. Hoy hay 13 fuentes para 12 componentes.
- **El MCP ganó lo que faltaba**: `diagnostico_salud_financiera.ahorroLiquidoCentavos` y la tool
  de lectura `simular_rebalanceo`, para que `TermometroSaludFinanciera` y `OrdenRebalanceo`
  no dependieran de cifras del modelo.
- **`/maya` todavía no sigue esta regla**: la conversación usa `pintar_pantalla` y
  `ajustar_pantalla` con props escritas por el modelo. Queda registrado en
  `docs/issues/2026-09-13-cifras-escritas-por-el-modelo-en-maya.md`.
- Con el flag en `0`, nada cambia. Las dos portadas conviven en la misma base: una portada de
  widgets es A2UI normal que el modo anterior pinta sin problema.
