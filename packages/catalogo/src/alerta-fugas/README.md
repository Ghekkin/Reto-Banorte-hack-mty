# AlertaFugas

Detecta cargos periódicos y suscripciones mensuales que el usuario no utiliza activamente ("fugas de dinero"), cuantifica el ahorro anual al cancelarlas y ofrece un botón de acción directo para dar de baja el servicio sin salir de la conversación.

## Cuándo lo elige el agente

Cuando el cliente pregunta "¿En qué estoy gastando de más?", "¿Por qué no me alcanza el sueldo?" o al auditar cargos fijos de la cuenta. Procede de `detectar_fugas` y emite `cancelar_suscripcion`.

## Acciones que emite

- `cancelar_suscripcion`: Solicita al agente dar de baja la suscripción señalada.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "AlertaFugas",
        "ancho": "amplio",
        "totalMensualCentavos": 114800,
        "totalAnualCentavos": 1377600,
        "pctDelIngreso": 0.045,
        "fugas": [
          {
            "id": "sus_gym_smart",
            "concepto": "Membresía Smart Fit",
            "comercio": "Smart Fit Monterrey",
            "montoCentavos": 59900,
            "sinUsoReciente": true,
            "periodicidad": "mensual",
            "mesesSinUso": 3
          },
          {
            "id": "sus_stream_max",
            "concepto": "Max Streaming HBO",
            "comercio": "Warner Media",
            "montoCentavos": 19900,
            "sinUsoReciente": false,
            "periodicidad": "mensual"
          },
          {
            "id": "sus_musica_spotify",
            "concepto": "Spotify Premium Familiar",
            "comercio": "Spotify México",
            "montoCentavos": 35000,
            "sinUsoReciente": false,
            "periodicidad": "mensual"
          }
        ],
        "razon": "Detectamos $13,776 al año en suscripciones, incluyendo tu gimnasio sin visitas en los últimos 3 meses."
      }
    ]
  }
}
```
