---
estado: resuelto
severidad: alta
area: mcp
encontrado: 2026-09-12 19:20
resuelto-en: mismo bloque (tools proyectar_inversion y simular_credito)
---

# Había componentes del catálogo cuyas cifras ninguna tool calculaba, y el modelo las inventaba

**Dónde:** el cruce entre `packages/catalogo` y `apps/mcp/src/tools`.

**Qué esperaba:** que todo número en pantalla saliera de una tool, como dice la regla 2 del prompt.

**Qué pasa:** tres tarjetas pedían cifras **calculadas** que ninguna tool producía, así que el
modelo las escribía de memoria. Se descubrió al investigar el `$504,785` que Ana vio en pantalla,
pero el caso del crédito era el menos grave de los tres.

## 1. La mensualidad de un plazo distinto (el que se vio)

Ana preguntó cómo terminar su crédito en un año. **Ninguna tool contestaba eso:**
`simular_reestructura` exige `tarjetaId` y **lanza** si la persona no tiene tarjeta
(`simular-reestructura.ts:29`), y `consultar_creditos` solo lee lo pactado —su amortización sale de
la tabla, no se recalcula. El modelo hizo la cuenta mental y escribió `$504,785 al mes`. La
respuesta correcta era **$5,503.20**; ni convirtiendo bien sus centavos acertaba ($5,047.85).

La matemática ya estaba entera en `dominio/finanzas.ts`: `mensualidad()` y `tablaAmortizacion()` no
saben nada de tarjetas. El hueco era de **exposición**, no de cálculo.

## 2. Y 3. Las tarjetas de inversión (peor, y no se veía)

`ProyeccionCrecimiento` exige **siete** props numéricas (`totalAportadoCentavos`,
`rendimientoEstimadoCentavos`, `valorFinalEstimadoCentavos`, `tasaAnualEstimadaPct`, los `hitos`…) y
`EscenariosInversion` **tres escenarios completos**. No existía ninguna función de valor futuro en
todo el servidor: los únicos `Math.pow` de `finanzas.ts` son de crédito, y `proyectar_ahorro` es
lineal a propósito.

Y encima: `ProyeccionCrecimiento` simula el interés compuesto **en el navegador** y luego
**calibra** su curva contra el cierre recibido (`factor = rendimientoEsperado / simulado`,
`componente.tsx:329`). O sea, la gráfica se doblaba para no contradecir una cifra inventada. No se
notaba porque el interés compuesto mental cae en un rango creíble — al contrario del `$504,785`, que
se delató solo. `ProyeccionCrecimiento` está en la portada esperada de Carmen
(`scripts/probar-inicio.mjs`): estaba en la ruta de la demo.

**Cómo quedó:**

- **`simular_credito`** (lectura): contesta las tres direcciones de la misma amortización —
  `plazoObjetivoMeses`, `mensualidadObjetivoCentavos` y `abonoExtraMensualCentavos`, exactamente una
  por llamada. Reusa `mensualidad()` y la nueva `mesesParaLiquidar()`, que es la inversa. Con esto
  `ProyeccionPagoCredito.ahorroConAbonoCapitalCentavos` **ya tiene quien lo calcule** (su describe
  decía "hoy ninguna tool lo hace, déjalo fuera en vez de estimarlo").
- **`proyectar_inversion`** (lectura): interés compuesto con la **misma fórmula que el componente**
  (aportación al inicio del mes), los hitos, y los tres escenarios derivados de `volatilidadAnual`,
  que ya estaba en la tabla `instrumentos`. El escenario adverso **puede perder** y se reporta con
  signo negativo, con una `advertencia` explícita.
- El `cuandoUsarlo` de las dos tarjetas de inversión ahora dice "**ya llamaste
  proyectar_inversion**", calcado de `SimuladorMeta` ("ya llamaste proyectar_ahorro"), que es la
  única señal que el modelo lee para saber que un componente tiene dueño.
- Tabla **componente → tool** en el prompt, con la regla dura de que una mensualidad, un plazo, unos
  intereses o un valor futuro no se hacen de cabeza: se piden.
- Y un arreglo de honestidad en el componente: `rendimiento = Math.max(0, …)` aplastaba una pérdida
  a cero, así que un escenario perdedor se veía plano. Una proyección que nunca pierde es propaganda.

**El ancla de las pruebas:** `simular_credito` para Ana a **15 meses** (su plazo restante) devuelve
**exactamente** los 457095 centavos que trae guardados en la base. Si alguien toca la fórmula, eso
truena, y es justo lo que debe pasar.

**Verificado por HTTP contra el MCP y la base real:**

```
simular_credito     Ana, 12 meses  -> mensualidadNueva 550320 ($5,503.20), ahorro 252578, adelanta 3 meses
proyectar_inversion Carmen, 60 meses, $5,000/mes -> valorFinal 631041390, y el pesimista PIERDE $116,267
```
