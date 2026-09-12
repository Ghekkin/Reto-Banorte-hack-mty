# ProyeccionPagoCredito

Visualiza la amortización integral de un crédito (personal, nómina o auto), descomponiendo la deuda entre capital vivo e intereses futuros, y calculando los beneficios de realizar abonos a capital.

## Cuándo lo elige el agente

Cuando el usuario pregunta "¿Cuánto me falta para terminar mi crédito?", "¿Cuánto terminaré pagando en total entre capital e intereses?", o cuando expresa interés en anticipar pagos para reducir el costo financiero. Procede de `consultar_creditos`.

## Acciones que emite

- `simular_abono_capital`: Permite al agente abrir un simulador de pago anticipado para recalcular el nuevo plazo o la nueva mensualidad reducida.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "ProyeccionPagoCredito",
        "ancho": "amplio",
        "creditoId": "cred_nomina_01",
        "alias": "Crédito de Nómina Banorte",
        "saldoInsolutoCentavos": 5578300,
        "mensualidadCentavos": 325000,
        "tasaAnualPct": 0.245,
        "plazoRestanteMeses": 20,
        "totalInteresesEstimadosCentavos": 1421700,
        "ahorroConAbonoCapitalCentavos": 485000,
        "amortizacionResumen": [
          { "numeroPago": 1, "periodo": "Próximo pago", "capitalCentavos": 211000, "interesCentavos": 114000, "saldoFinalCentavos": 5367300 },
          { "numeroPago": 6, "periodo": "En 6 meses", "capitalCentavos": 238000, "interesCentavos": 87000, "saldoFinalCentavos": 4150000 },
          { "numeroPago": 12, "periodo": "En 1 año", "capitalCentavos": 275000, "interesCentavos": 50000, "saldoFinalCentavos": 2480000 },
          { "numeroPago": 20, "periodo": "Liquidación final", "capitalCentavos": 318000, "interesCentavos": 7000, "saldoFinalCentavos": 0 }
        ],
        "razon": "Te restan 20 mensualidades de $3,250 de tu crédito de nómina. Un abono de $10,000 a capital te ahorraría $4,850 en intereses futuros."
      }
    ]
  }
}
```
