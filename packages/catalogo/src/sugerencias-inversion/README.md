# SugerenciasInversion

Muestra sugerencias de inversión y alternativas financieras adaptadas al estado financiero del cliente (flujo mensual libre, deudas y objetivos). Si el cliente tiene deudas con intereses críticos, el widget destaca prioritariamente la liquidación de deuda como la inversión con mayor rendimiento garantizado. Si tiene capacidad de ahorro libre, presenta instrumentos formales de Banorte (pagarés a plazo fijo, fondos de liquidez gubernamental NTEGUB, fondos de renta variable NTEIPC o coberturas).

## Cuándo lo elige el agente

El agente lo elige tras consultar `consultar_sugerencias_inversion` cuando el cliente pregunta cómo invertir su dinero, qué hacer con un remanente o aguinaldo, o qué opciones existen para hacer crecer su capital.

## Acciones que emite

- `simular_meta`: Dirige a aperturar o simular una meta de ahorro formal.
- `simular_plan`: Dirige al simulador de plan de pagos si la recomendación prioritaria es liquidar deuda.
- `orden_rebalanceo`: Ejecuta rebalanceo en portafolios patrimoniales.
- `preguntar`: Emite una pregunta o selección directa sobre el instrumento elegido.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "SugerenciasInversion",
        "ancho": "amplio",
        "estadoFinanciero": "requiere_fondo_emergencia",
        "perfilInversionista": "conservador",
        "capacidadMensualCentavos": 1550000,
        "montoRecomendadoCentavos": 500000,
        "motivo": "Cuentas con capacidad de ahorro libre y sin deudas de crédito. Recomendamos instrumentos de liquidez diaria y bajo riesgo.",
        "sugerencias": [
          {
            "id": "sug_pagare_28d",
            "titulo": "Pagaré Bancario Banorte a 28 días",
            "tipo": "instrumento",
            "descripcion": "Tasa fija garantizada y pago de rendimientos al vencimiento del plazo. Respaldado por el IPAB.",
            "rendimientoEstimadoAnualPct": 0.108,
            "plazoMinimo": "28 días",
            "nivelRiesgo": "muy_bajo",
            "badge": "Ideal para iniciar",
            "recomendado": true
          },
          {
            "id": "sug_fondo_liquidez_diaria",
            "titulo": "Fondo Deuda Gubernamental Banorte (NTEGUB)",
            "tipo": "instrumento",
            "descripcion": "Invierte en deuda gubernamental con retiros diarios de lunes a viernes.",
            "rendimientoEstimadoAnualPct": 0.112,
            "plazoMinimo": "Diaria",
            "nivelRiesgo": "muy_bajo",
            "badge": "Disponibilidad 24/7",
            "recomendado": false
          }
        ],
        "siguientePaso": "Comienza con un Pagaré a 28 días o programa un apartado de ahorro quincenal para crear el hábito.",
        "razon": "Tienes $15,500 libres al mes y ningún adeudo: es el momento perfecto para poner a trabajar tu dinero en pagarés seguros."
      }
    ]
  }
}
```
