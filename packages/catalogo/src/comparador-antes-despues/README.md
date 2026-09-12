# ComparadorAntesDespues

Contrasta de manera gráfica y directa la situación financiera del usuario manteniendo su conducta habitual (pagar mínimos, deuda sin reestructurar, dinero sin invertir) frente al escenario aplicando la recomendación de Maya, cuantificando el ahorro monetario y el tiempo ganado.

## Cuándo lo elige el agente

Cuando la persona duda sobre por qué debería aceptar una recomendación financiera o para justificar el valor tangible de reestructurar una deuda o invertir capital inactivo.

## Acciones que emite

- `aplicar_estrategia`: Procede a ejecutar la recomendación seleccionada.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "ComparadorAntesDespues",
        "ancho": "amplio",
        "titulo": "Reestructura de Tarjeta Clásica",
        "ahorroNetoCentavos": 13206500,
        "ahorroTiempoMeses": 34,
        "escenarioActual": {
          "etiqueta": "Pagando el mínimo actual",
          "mensualidadCentavos": 195000,
          "costoTotalCentavos": 18945000,
          "tiempoMeses": 52,
          "descripcion": "52 meses pagando intereses altos sin reducir el capital sustancialmente."
        },
        "escenarioEstrategia": {
          "etiqueta": "Con Plan Fijo Banorte 18 meses",
          "mensualidadCentavos": 319300,
          "costoTotalCentavos": 5738500,
          "tiempoMeses": 18,
          "descripcion": "Liquidas tu deuda completa en 18 meses pagando solo una fracción de intereses."
        },
        "razon": "Reestructurar te ahorra $132,065 en intereses y terminas casi 3 años antes."
      }
    ]
  }
}
```
