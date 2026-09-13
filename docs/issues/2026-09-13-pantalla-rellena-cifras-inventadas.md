---
estado: resuelto
severidad: alta
area: web
encontrado: 2026-09-13 03:10
github: 23
resuelto-en: 8060918
---

# `pantalla.ts` rellena las props que el modelo omite con cifras inventadas (saldo $47,386, mensualidad $5,500, 27.9 %)

**Dónde:** `apps/web/src/lib/agente/pantalla.ts:144-165` y `:285-320` (`ProyeccionPagoCredito`),
`:166-210` y `:340-380` (`ComparadorAntesDespues`, que además lee `datos.simular_credito`, una tool
que no existe), `:326-330` (`SimuladorMeta`) y `:755-805` (`ProyeccionCrecimiento`/escenarios).

**Qué esperaba:** que una pantalla con props faltantes se rechace y el modelo la corrija con datos
de una tool (regla del prompt: «Nunca inventes un número»), o que el relleno salga SOLO de lo que
devolvió una tool en el turno.

**Qué pasa:** la normalización completa lo que falta con literales fijos cuando la tool no trajo el
dato: `saldoInsolutoCentavos ?? 4738600` (el saldo de la TARJETA de Beto), `mensualidadCentavos ??
550000`, `tasaAnualPct ?? 0.279`, `plazoRestanteMeses ?? 12`, `totalInteresesEstimadosCentavos ??
500000`, dos hitos de amortización fijos; `metaCentavos ?? 5578308`, `aportacionCentavos ?? 200000`;
y en `ComparadorAntesDespues`, ahorro, meses y costos por defecto con la frase «Pagando $5,500 al mes
terminas 2 meses antes». La pantalla pasa la validación y la persona ve cifras que no son suyas.

**Cómo lo reproduje / por qué estoy seguro:** lectura del código al preparar los ajustes en vivo del
crédito (`docs/como-funciona/ajustes-en-vivo.md`): si el modelo pinta `"ProyeccionPagoCredito"` como
string o sin `consultar_creditos` en el turno, `datos.consultar_creditos` no existe, `cred` es `{}` y
todos los `??` caen al literal. Carmen o Ana verían el saldo de la tarjeta de Beto.

**Impacto en la demo:** se nota si el modelo omite props en el paso de Ana (crédito o simulador): la
tarjeta sale con números falsos que además ya no cuadran con lo que diga el texto; y un ajuste en
vivo encima compararía «antes» contra una cifra inventada.

## Resolución

Resuelto en `8060918`. `normalizarListaDeComponentes` ya no inventa ningún número: se fueron el saldo 4738600, la mensualidad 550000, la tasa 0.279, los intereses 500000, la meta 5578308, los portafolios, fugas, movimientos y planes de relleno, y la lectura de `simular_credito` (tool inexistente). Las props que faltan salen de `propsDelMcp`, que corre el adaptador de widgets (`widgets/fuentes.ts`) sobre el resultado real de la tool del turno (también anidado en `analizar_ahorro`/`analizar_gasto`); `ComparadorAntesDespues` se arma con `simular_pago_credito` o `simular_reestructura`. Si la tool no está en el turno, la prop queda vacía y la validación le pide al modelo consultarla. Prueba: todo componente del catálogo normalizado sin datos no produce ni un número (`normalizacion-sin-cifras-inventadas.spec.ts`, 37; 31 fallan contra el código anterior). Algoritmo: `docs/algoritmos/normalizacion-de-pantalla.md`.
