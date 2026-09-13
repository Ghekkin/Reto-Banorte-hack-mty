# ProyeccionCrecimiento

Proyecta la acumulación patrimonial a lo largo de un horizonte de meses o años, contrastando el capital aportado por el usuario contra las ganancias netas generadas por interés compuesto.

## Cuándo lo elige el agente

**Hoy, nunca.** Ninguna tool del MCP devuelve la proyección que esta tarjeta necesita
(`totalAportadoCentavos`, `rendimientoEstimadoCentavos`, `valorFinalEstimadoCentavos`, `hitos`), y
esas cifras no se calculan a mano (issue #19). Su `cuandoUsarlo` lo dice así, y para "¿cuánto
crecería mi dinero si invierto?" manda al modelo a `SugerenciasInversion`
(`consultar_sugerencias_inversion`) o `RiesgoRendimiento` (`consultar_catalogo_inversiones`). La
tarjeta queda en el catálogo, con su ejemplo, para cuando exista una tool que la alimente.

## Acciones que emite

- `elegir_plan_inversion`: envía al agente la aportación mensual elegida en el slider y el valor final simulado.

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
