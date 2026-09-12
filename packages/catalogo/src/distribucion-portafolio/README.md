# DistribucionPortafolio

Muestra la estructura integral de asignación de activos de un portafolio patrimonial (renta fija, renta variable, fondos, liquidez), comparando los pesos actuales con el perfil objetivo del cliente y alertando sobre posibles desviaciones.

## Cuándo lo elige el agente

Cuando el usuario pregunta "¿Cómo está dividido mi portafolio?", "¿En qué tengo invertido mi dinero?" o al sugerir una orden de rebalanceo de posiciones. Se nutre de `consultar_inversiones`.

## Acciones que emite

- `rebalancear_portafolio`: Notifica al agente la intención de ejecutar las compras/ventas necesarias para alinearse al modelo patrimonial sugerido.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "DistribucionPortafolio",
        "ancho": "amplio",
        "valorTotalCentavos": 25000000,
        "aportadoCentavos": 23000000,
        "rendimientoTotalPct": 0.087,
        "desviacionModeloPct": 0.06,
        "clases": [
          { "claseId": "deuda_gob", "nombre": "Deuda gubernamental", "tipo": "Renta fija", "montoCentavos": 11250000, "pesoPct": 0.45, "pesoObjetivoPct": 0.40 },
          { "claseId": "renta_var", "nombre": "Renta variable global (ETFs)", "tipo": "Renta variable", "montoCentavos": 7500000, "pesoPct": 0.30, "pesoObjetivoPct": 0.35 },
          { "claseId": "fondos_corp", "nombre": "Fondos deuda corporativa", "tipo": "Renta fija", "montoCentavos": 3750000, "pesoPct": 0.15, "pesoObjetivoPct": 0.15 },
          { "claseId": "efectivo", "nombre": "Efectivo / Liquidez", "tipo": "Liquidez", "montoCentavos": 2500000, "pesoPct": 0.10, "pesoObjetivoPct": 0.10 }
        ],
        "razon": "Tu portafolio asciende a $250,000 con un 45% en deuda gubernamental y una ligera sobreponderación de 5% sobre tu modelo recomendado."
      }
    ]
  }
}
```
