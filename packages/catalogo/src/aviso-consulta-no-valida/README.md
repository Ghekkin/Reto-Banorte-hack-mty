# AvisoConsultaNoValida

Orienta al usuario con claridad pedagógica y datos cuantitativos cuando formula una consulta que no aplica a su situación actual (ej. reestructurar tarjeta de crédito sin tener tarjeta deudora), que resulta financieramente contraproducente (ej. invertir dinero teniendo deuda activa en mora con un CAT superior al 60%) o que se encuentra fuera del catálogo regulatorio formal de Banorte (criptomonedas, forex especulativo, apuestas).

## Cuándo lo elige el agente

El agente lo elige tras invocar `orientar_consulta_no_valida` cuando detecta que la solicitud no es procedente o viable. Presenta el motivo cuantitativo y sugiere rutas alternativas beneficiosas para el cliente.

## Tipos de invalidez

Cada aviso dice por qué la consulta no procede, con una etiqueta y un ícono propios. Los valores
son los mismos que devuelve `orientar_consulta_no_valida` en `tipoInvalidez`: si la tool devolviera
uno que el componente no acepta, el aviso se rechazaría en cada intento (issue #41).

| `tipoInvalidez` | Cuándo lo devuelve la tool | Etiqueta |
|---|---|---|
| `deuda_prioritaria` | Quiere invertir con la tarjeta en mora o arriba del 80 % del límite | Prioridad Financiera |
| `producto_no_aplica` | Pide algo de un producto que no tiene (reestructurar sin tarjeta, cancelar sin suscripciones) | Situación al Corriente |
| `fuera_de_alcance` | Algo que la regulación o la política de Banorte no permite (cripto, apuestas, pirámides, forex) | Fuera de Catálogo Regulado |
| `sin_datos_suficientes` | Ningún caso anterior aplica | Información Adicional |

Técnico: el enum vive dos veces, en `packages/schemas/src/tools/orientar-consulta-no-valida.ts`
(`TipoInvalidez`) y en `schema.ts` de este componente, porque `@maya/catalogo` no depende de
`@maya/schemas`. Los amarra `apps/web/src/lib/agente/__tests__/contrato-aviso-consulta.spec.ts`: todo
valor de la tool valida en el componente y se pinta con su etiqueta. Un valor nuevo va en los dos
enums, en `ICONOS_POR_TIPO`/`ETIQUETAS_POR_TIPO` de `componente.tsx` y en esa prueba.

## Acciones que emite

- `simular_plan`: Dirige al usuario a simular una reestructura o plan de pagos si su prioridad es liquidar deuda.
- `simular_meta`: Dirige a crear una meta de ahorro si el usuario no tiene deudas y buscaba opciones para su dinero.
- `consultar_movimientos`: Permite revisar movimientos o cargos recientes.
- `preguntar`: Emite una pregunta o alternativa textual sugerida hacia la conversación.

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "AvisoConsultaNoValida",
        "ancho": "amplio",
        "tipoInvalidez": "deuda_prioritaria",
        "titulo": "Recomendación prioritaria: Atiende tu deuda antes de invertir",
        "explicacion": "Tu tarjeta Banorte presenta un saldo deudor al 62.1% de CAT anual. Cada peso destinado a liquidar deuda rinde más que cualquier pagaré o fondo del mercado.",
        "datoClave": "Tasa de interés de tarjeta: 62.1% CAT",
        "montoReferenciaCentavos": 4820000,
        "etiquetaMonto": "Saldo deudor actual",
        "alternativasSugeridas": [
          "Ver plan de pagos a mensualidades fijas",
          "Apartar $500 para un fondo de contingencia",
          "¿En qué categorías gasté de más este mes?"
        ],
        "accionSugerida": {
          "nombre": "simular_plan",
          "etiqueta": "Ver plan de pagos fijos",
          "context": { "prioridad": "liquidar_deuda" }
        },
        "razon": "Antes de arriesgar capital en inversiones, liquidar una tasa del 62.1% ofrece un ahorro garantizado."
      }
    ]
  }
}
```
