# RendimientoHistorico

Muestra la evolución del precio y el rendimiento acumulado de un instrumento o fondo de inversión en el tiempo (semanas o meses), permitiendo visualizar tendencias y saltos de plusvalía sin depender de tooltips.

## Cuándo lo elige el agente

Cuando el usuario pregunta por el historial de un instrumento ("¿Cómo le ha ido a CETES?", "¿Cuánto ha subido el fondo de renta variable en el año?", "Muestra el histórico de Naftrac"). Requiere previa llamada a `consultar_historico_inversion`.

## Acciones que emite

- `ver_detalle_instrumento`: Lleva a la ficha completa del instrumento financiero con métricas de volatilidad y prospecto.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "RendimientoHistorico",
        "ancho": "amplio",
        "instrumentoId": "inst_cetes_28",
        "nombre": "Certificados de la Tesorería 28 días",
        "clave": "CETES28",
        "tipo": "Deuda Gubernamental",
        "periodo": "Últimas 12 semanas",
        "precioInicialCentavos": 1000,
        "precioFinalCentavos": 1114,
        "rendimientoPeriodoPct": 0.114,
        "puntos": [
          { "fecha": "2026-06-20", "precioCentavos": 1000, "variacionPct": 0 },
          { "fecha": "2026-07-04", "precioCentavos": 1022, "variacionPct": 0.022 },
          { "fecha": "2026-07-18", "precioCentavos": 1045, "variacionPct": 0.022 },
          { "fecha": "2026-08-01", "precioCentavos": 1068, "variacionPct": 0.022 },
          { "fecha": "2026-08-15", "precioCentavos": 1091, "variacionPct": 0.021 },
          { "fecha": "2026-08-29", "precioCentavos": 1114, "variacionPct": 0.021 }
        ],
        "razon": "Consultaste el rendimiento de CETES a 28 días durante el último trimestre, que acumula +11.4% anualizado."
      }
    ]
  }
}
```
