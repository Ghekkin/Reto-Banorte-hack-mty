# `Confirmacion`

**Cuándo lo elige el agente**: justo después de que una tool de acción cambió el
estado. Es la prueba visible de que el ciclo se cerró (paso 3 del reto).

Genérico a propósito: la fase 1 lo usa para "plan aplicado" y la fase 3 para
"apartado creado" (ADR 0004).

## Props

| Prop | Para qué |
|---|---|
| `titulo` | Lo que pasó, en pasado |
| `detalle` | El dato que lo prueba |
| `montoCentavos` / `etiquetaMonto` | El número grande, si lo hay |
| `siguientePaso` | Qué puede hacer ahora la persona |
| `tono` | `exito` tras una acción; `informativo` para un aviso |
| `ancho`, `razon` | Comunes a todo el catálogo |

## Mensaje de ejemplo

Ver `packages/catalogo/ejemplos/confirmacion.jsonl`.

Las props van **planas** junto a `id` y `component`, como manda la spec v0.9.1
(`spec/v0_9_1/catalogs/basic/catalog.json`), no anidadas en un objeto `props`.

```json
{
  "id": "root",
  "component": "Confirmacion",
  "ancho": "normal",
  "titulo": "Tu plan quedó activo",
  "detalle": "18 mensualidades de $3,389.00 a partir del 5 de octubre.",
  "montoCentavos": { "path": "/plan/mensualidadCentavos" },
  "etiquetaMonto": "Pago mensual",
  "razon": "Aplicaste la reestructura a 18 meses; así queda tu pago."
}
```

## Estados

- **Cargando**: skeleton del tamaño final (el data model puede llegar después).
- **Vacío**: no aplica — sin `titulo` no se emite el componente.
- **Error**: lo emite el agente como `Confirmacion` con `tono: "informativo"` y el
  detalle del fallo; los errores de protocolo no llegan aquí (contrato agente↔cliente).
