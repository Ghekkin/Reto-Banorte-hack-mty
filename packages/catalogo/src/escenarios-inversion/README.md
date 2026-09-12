# EscenariosInversion

Compara tres escenarios de rendimiento (pesimista, esperado y optimista) para un monto y horizonte dados, permitiendo al usuario ponderar el riesgo de mercado frente a los retornos esperados.

## Cuándo lo elige el agente

Cuando el usuario pregunta "¿Qué pasa si las tasas bajan o el mercado cae?", "¿Cuánto es lo menos y lo más que podría ganar?", o al definir su horizonte de inversión patrimonial. Dispara `elegir_escenario`.

## Acciones que emite

- `elegir_escenario`: Notifica al agente cuál escenario (pesimista, esperado u optimista) se alinea con la expectativa del usuario.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "EscenariosInversion",
        "ancho": "amplio",
        "montoInvertidoCentavos": 10000000,
        "horizonteMeses": 24,
        "escenarioPesimista": {
          "tasaAnualPct": 0.055,
          "valorFinalCentavos": 11130000,
          "rendimientoCentavos": 1130000,
          "descripcion": "Si las tasas de referencia disminuyen y la inflación se estabiliza."
        },
        "escenarioEsperado": {
          "tasaAnualPct": 0.098,
          "valorFinalCentavos": 12056000,
          "rendimientoCentavos": 2056000,
          "descripcion": "Bajo la curva proyectada de CETES y fondos de deuda corporativa Banorte."
        },
        "escenarioOptimista": {
          "tasaAnualPct": 0.142,
          "valorFinalCentavos": 13042000,
          "rendimientoCentavos": 3042000,
          "descripcion": "Si la porción en renta variable y bonos a tasa fija supera el consenso de analistas."
        },
        "escenarioInicial": "esperado",
        "razon": "Comparamos los 3 escenarios para $100,000 a 24 meses para que tomes una decisión informada considerando la variabilidad del mercado."
      }
    ]
  }
}
```
