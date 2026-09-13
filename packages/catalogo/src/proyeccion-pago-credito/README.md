# ProyeccionPagoCredito

Cuánto falta para terminar de pagar un crédito a plazo (nómina, personal o auto), de qué se compone
lo que falta (capital e intereses) y, **desde el chat, cómo quedaría pagando más al mes**. La misma
tarjeta se ajusta en su lugar: no se pinta otra.

## Cuándo lo elige el agente

- «¿Cuánto me falta para terminar mi crédito?», «¿cuánto pagaré de puros intereses?»: se pinta con
  `consultar_creditos` (`incluirAmortizacion: true`).
- Con la tarjeta ya en pantalla, «¿y si pago $4,500 al mes?» o «quiero liquidarlo en 12 meses»: el
  agente llama `simular_pago_credito` y, si `posible`, **ajusta esta tarjeta** con `ajustar_pantalla`.
  Si no es posible, no la toca y dice el `motivo`.

## Los tres momentos de la misma tarjeta

| Momento | Qué manda el agente | Qué se ve |
|---|---|---|
| Como va | Los datos de `consultar_creditos` | Saldo, curva, hitos, capital / intereses. Sin botón |
| Simulada | `mensualidadCentavos`, `plazoRestanteMeses`, `totalInteresesEstimadosCentavos`, `fechaLiquidacion`, `amortizacionResumen` de `simulado`; `antes` = `actual`; `mensualidadContratoCentavos`; `aviso` si no es null; `programado: false` | Los tres números se resaltan 1.5 s; «Terminas en 15 meses (antes 20), en diciembre de 2027», «Pagas $3,856.48 menos de intereses», «$3,533.97 del contrato + $966.03 a capital»; aviso ámbar si lo hay; botón «Programar este pago» |
| Programada | Lo mismo con `despues` y `antes` de `programar_abono_capital`, y `programado: true` | Badge «Abono programado», sin botón, los números aplicados con su diferencia |

El botón aparece **solo** si hay `antes`, su mensualidad es distinta de la de ahora y no está
programado. Si la comparación empeora (pagar menos que un abono ya programado), las frases dicen
«más» y no van en verde.

## Props nuevas (todas opcionales)

| Prop | Qué es |
|---|---|
| `antes` | `{ mensualidadCentavos, plazoRestanteMeses, totalInteresesEstimadosCentavos }`: el escenario anterior. Acepta el `actual` de la tool entero |
| `mensualidadContratoCentavos` | La del contrato; si la mensualidad la pasa, se dice cuánto va a capital |
| `programado` | `true` tras `programar_abono_capital` aplicado |
| `aviso` | El `aviso` de `simular_pago_credito`, tal cual |
| `fechaLiquidacion` | Fecha ISO del último pago, del escenario |
| `etiquetaBoton` | Default «Programar este pago» |

`ahorroConAbonoCapitalCentavos` queda por compatibilidad; ya no se usa.

## Acciones que emite

- `programar_abono_capital`, con `{ creditoId, mensualidadCentavos }` en el `context` (más la
  `idempotencyKey` que pone el motor). El host la declara por default al pintar la tarjeta.

## Ejemplos

- `ejemplos/proyeccion-pago-credito.jsonl`: como va (es el que el agente ve como few-shot).
- `ejemplos/variantes/proyeccion-pago-credito-simulado.jsonl` y `…-programado.jsonl`: los otros dos
  momentos. Viven en `variantes/` para que el prompt no los lea (le enseñarían a pintar la tarjeta
  ya simulada); la galería `/catalogo` sí los pinta.

El componente simulado, como queda tras los parches:

```json
{
  "id": "credito",
  "component": "ProyeccionPagoCredito",
  "creditoId": { "path": "/credito/creditoId" },
  "alias": { "path": "/credito/alias" },
  "saldoInsolutoCentavos": { "path": "/credito/saldoInsolutoCentavos" },
  "mensualidadCentavos": { "path": "/credito/mensualidadCentavos" },
  "tasaAnualPct": { "path": "/credito/tasaAnualPct" },
  "plazoRestanteMeses": { "path": "/credito/plazoRestanteMeses" },
  "totalInteresesEstimadosCentavos": { "path": "/credito/totalInteresesEstimadosCentavos" },
  "fechaLiquidacion": { "path": "/credito/fechaLiquidacion" },
  "amortizacionResumen": { "path": "/credito/amortizacionResumen" },
  "antes": { "mensualidadCentavos": 353397, "plazoRestanteMeses": 20, "totalInteresesEstimadosCentavos": 1489628 },
  "mensualidadContratoCentavos": 353397,
  "programado": false,
  "aviso": "Con $4,500.00 al mes, tus deudas se llevarían el 38 % de tu ingreso: más de lo que buró estima que puedes pagar.",
  "razon": "Pagando $4,500.00 al mes, lo que pasa de tu mensualidad va a capital y terminas 5 meses antes.",
  "action": { "event": { "name": "programar_abono_capital", "context": {} } }
}
```

Con el ejemplo enlazado al data model, los números del escenario se parchean con `parchesDatos`
(`/credito/mensualidadCentavos`…) y `antes`, `aviso`, `programado` y `mensualidadContratoCentavos`
con `parchesComponentes`, porque no están enlazados.
