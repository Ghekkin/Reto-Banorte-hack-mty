# ProyeccionCrecimiento

Proyecta la acumulación patrimonial a lo largo de un horizonte de meses o años, contrastando el capital aportado por el usuario contra las ganancias netas generadas por interés compuesto.

## Cuándo lo elige el agente

Cuando el usuario pregunta por planes de inversión a mediano o largo plazo ("¿Cuánto tendré en 3 años si ahorro $3,000 al mes?", "¿Cómo crecería mi dinero en un fondo de inversión?"). Dispara la acción `simular_inversion`.

## Acciones que emite

- `simular_inversion`: Envía al agente la aportación mensual configurada y el valor final estimado para proceder a la formalización o ajuste del contrato.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "ProyeccionCrecimiento",
        "ancho": "amplio",
        "capitalInicialCentavos": 5000000,
        "aportacionMensualCentavos": 300000,
        "plazoMeses": 36,
        "tasaAnualEstimadaPct": 0.105,
        "totalAportadoCentavos": 15800000,
        "rendimientoEstimadoCentavos": 3145600,
        "valorFinalEstimadoCentavos": 18945600,
        "hitos": [
          { "mes": 12, "etiqueta": "Año 1", "aportadoCentavos": 8600000, "saldoEstimadoCentavos": 9320000 },
          { "mes": 24, "etiqueta": "Año 2", "aportadoCentavos": 12200000, "saldoEstimadoCentavos": 13860000 },
          { "mes": 36, "etiqueta": "Año 3 (Meta)", "aportadoCentavos": 15800000, "saldoEstimadoCentavos": 18945600 }
        ],
        "razon": "Con $50,000 iniciales y $3,000 mensuales en instrumentos de deuda al 10.5%, acumulas más de $189,000 en 3 años."
      }
    ]
  }
}
```
