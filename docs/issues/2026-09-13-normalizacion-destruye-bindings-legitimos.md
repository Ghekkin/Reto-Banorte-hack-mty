---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-13 06:17
github: 39
resuelto-en: 8060918
---

# `normalizarListaDeComponentes` sigue tratando bindings legítimos como datos faltantes en otros componentes

**Dónde:** `apps/web/src/lib/agente/pantalla.ts`, función `normalizarListaDeComponentes`. Ya
corregido para `GastoPorCategoria` (líneas ~437-467) y `DetalleCategoria` (líneas ~581-627) en este
mismo commit. El mismo patrón sigue sin `esBinding()` en, al menos: `ProyeccionPagoCredito`
(`saldoInsolutoCentavos`, `mensualidadCentavos`, `totalInteresesEstimadosCentavos`, ~293-320),
`SimuladorMeta` (`metaCentavos`, `aportacionCentavos`, ~328-331), `ComparadorAntesDespues`
(~349-365), `TarjetaDeCredito` (`saldoCentavos`, `limiteCentavos`, ~424-433),
`ResumenSuscripciones` (`totalMensualCentavos`, `totalAnualCentavos`, ~558-566), `OrdenRebalanceo`
(`valorTotalCentavos`, `comisionTotalCentavos`, ~646-649), `DiagnosticoSaludFinanciera`
(`puntajeSalud`, `montoAhorradoCentavos`, ~684-692), `DistribucionPortafolio`
(`valorTotalCentavos`, `aportadoCentavos`, ~714-728), `HistoricoInversion`
(`precioInicialCentavos`, `precioFinalCentavos`, ~739-742) y `SimuladorAportacion`
(`capitalInicialCentavos`, `aportacionMensualCentavos`, `plazoMeses`, `totalAportadoCentavos`,
`rendimientoEstimadoCentavos`, `valorFinalEstimadoCentavos`, `montoInvertidoCentavos`,
`horizonteMeses`, ~756-790).

**Qué esperaba:** que un componente con una prop enlazada al data model (`{"path": "/algo/x"}`,
el formato correcto y documentado en `packages/catalogo/ejemplos/*.jsonl`) llegue intacto a
`revisarProps`/`resolverValor`, que es donde de verdad se resuelve el binding contra `datos`.

**Qué pasa:** cada bloque de reparación revisa la prop con `Array.isArray(comp.x)` o
`comp.x === undefined` sobre el valor CRUDO, antes de que el binding se resuelva. Un binding es un
objeto `{path: string}`: `Array.isArray({path:...})` es `false` (así que un arreglo bindeado se
sobreescribe con datos de relleno fijos) y `Number({path:...})` es `NaN`, así que
`Math.round(Number(comp.x) || 0)` colapsa cualquier monto bindeado a `0`. Es el mismo mecanismo que
rompía `GastoPorCategoria`/`DetalleCategoria` (reporte de usuario, corregido en este commit), solo
que en los componentes de esta lista sigue sin corregirse.

**Cómo lo reproduje / por qué estoy seguro:** mismo código que causaba el bug de
`GastoPorCategoria`/`DetalleCategoria` (monto grande en "$0.00" con desglose de relleno al tocar
"Ver Restaurantes"), verificado con pruebas unitarias en
`apps/web/src/lib/agente/__tests__/normalizacion-gasto.spec.ts`. Los bloques listados arriba tienen
la misma forma (`Array.isArray`/`=== undefined` sin `esBinding` antes), así que un componente que
reciba esas props como binding sufre el mismo colapso a `0`/relleno; no se reprodujo cada uno con un
test para no exceder el cambio acotado de este commit (hora 34+ del reto: sin refactors).

**Impacto en la demo:** se nota igual que el bug original, cada vez que el modelo pinte alguno de
estos componentes usando un binding (la forma que enseñan los ejemplos few-shot) en vez de un
literal: el monto grande sale en 0/cifra de relleno mientras el texto de Maya dice el número real.
Relacionado con #23 (que documenta el mismo archivo inventando cifras cuando la prop está
realmente ausente); esto es un mecanismo distinto — la prop SÍ viene, pero como binding legítimo, y
la reparación la destruye igual.

## Resolución

Resuelto en `8060918` con un paso genérico para todo componente: las props que son binding (`{path}`) se apartan antes de reparar y se reponen intactas al final, y un valor calculado que da `NaN` se quita en vez de pintarse. Los escenarios de `ComparadorAntesDespues` conservan sus bindings anidados. Prueba: `DistribucionPortafolio` con `rendimientoTotalPct`, `valorTotalCentavos` y `aportadoCentavos` como bindings pasa. **Verificado con el modelo real en producción** (06:57): «¿Cómo va mi portafolio?» (Carmen) pinta en 2 pasos.
