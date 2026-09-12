# OrdenRebalanceo

Presenta la propuesta de operaciones de compra y venta necesarias para realinear la asignación de activos de un portafolio al modelo patrimonial recomendado, mostrando el monto por operación y la variación en porcentaje.

## Cuándo lo elige el agente

Tras mostrar `DistribucionPortafolio` y recibir la intención del usuario de rebalancear, el agente proyecta las transacciones requeridas y solicita confirmación. Procede de `consultar_inversiones`.

## Acciones que emite

- `confirmar_rebalanceo`: Ejecuta las órdenes de compra/venta en la cuenta patrimonial.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "OrdenRebalanceo",
        "ancho": "amplio",
        "portafolioId": "port_carmen_estrategico",
        "nombrePortafolio": "Estrategia Balanceada Carmen",
        "valorTotalCentavos": 25000000,
        "comisionTotalCentavos": 0,
        "movimientos": [
          {
            "tipo": "venta",
            "claseActivo": "Deuda gubernamental",
            "instrumentoClave": "CETES28",
            "montoCentavos": 1250000,
            "pesoAnteriorPct": 0.45,
            "pesoNuevoPct": 0.40
          },
          {
            "tipo": "compra",
            "claseActivo": "Renta variable global",
            "instrumentoClave": "NAFTRAC",
            "montoCentavos": 1250000,
            "pesoAnteriorPct": 0.30,
            "pesoNuevoPct": 0.35
          }
        ],
        "razon": "Rebalancear $12,500 de CETES a NAFTRAC devuelve tu portafolio a la ponderación 40/35 recomendada sin costo de comisión."
      }
    ]
  }
}
```
