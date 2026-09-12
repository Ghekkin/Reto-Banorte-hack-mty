# RiesgoRendimiento

Permite visualizar y comparar instrumentos de inversión organizados por su nivel de riesgo y su rendimiento anual esperado, contrastándolos con la tolerancia máxima del perfil del inversionista.

## Cuándo lo elige el agente

Cuando el cliente busca invertir y pregunta "¿Qué opciones tengo y cuánto riesgo implican?", "¿Hay algo que pague más que CETES?", o para recomendar el producto óptimo según su perfil de riesgo. Procede de `consultar_catalogo_inversiones`.

## Acciones que emite

- `seleccionar_instrumento`: Notifica al agente el instrumento seleccionado para continuar con el flujo de contratación o simulación detallada.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "RiesgoRendimiento",
        "ancho": "amplio",
        "perfilInversionista": "Moderado",
        "toleranciaRiesgoMax": 3,
        "montoReferenciaCentavos": 5000000,
        "instrumentos": [
          { "id": "inst_cetes_28", "clave": "CETES28", "nombre": "CETES 28 días", "tipo": "Deuda gubernamental", "riesgo": 1, "rendimientoAnualEsperado": 0.111, "recomendado": false },
          { "id": "inst_pagare_91", "clave": "PAGARE91", "nombre": "Pagaré Banorte 91 días", "tipo": "Pagaré bancario", "riesgo": 1, "rendimientoAnualEsperado": 0.104, "recomendado": false },
          { "id": "inst_fondo_deuda", "clave": "NTREX", "nombre": "Fondo Deuda Estratégica", "tipo": "Fondo de deuda", "riesgo": 2, "rendimientoAnualEsperado": 0.118, "recomendado": true },
          { "id": "inst_fondo_mixto", "clave": "NTRGLOB", "nombre": "Fondo Balanceado Global", "tipo": "Fondo mixto", "riesgo": 3, "rendimientoAnualEsperado": 0.135, "recomendado": false },
          { "id": "inst_naftrac", "clave": "NAFTRAC", "nombre": "ETF IPC México", "tipo": "Renta variable", "riesgo": 4, "rendimientoAnualEsperado": 0.162, "recomendado": false }
        ],
        "razon": "Para tu perfil Moderado y $50,000, el Fondo Deuda Estratégica (NTREX) te ofrece 11.8% anual con riesgo bajo (2/5)."
      }
    ]
  }
}
```
