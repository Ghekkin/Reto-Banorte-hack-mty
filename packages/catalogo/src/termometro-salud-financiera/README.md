# TermometroSaludFinanciera

Muestra el puntaje global de salud financiera del usuario (escala 0 a 100), su calificación cualitativa (sana, estable, frágil o crítica) y el balance de sus 3 pilares clave: endeudamiento, ahorro y fondo de emergencia.

## Cuándo lo elige el agente

Cuando la persona pregunta "¿Cómo ando en mis finanzas?", "¿Cuál es mi diagnóstico?" o al inicio de una asesoría para justificar hacia dónde debe orientarse la estrategia. Procede de `diagnostico_salud_financiera`.

## Acciones que emite

- `mejorar_salud_financiera`: Lleva al usuario al siguiente paso recomendado (reestructurar deuda, recortar fugas o crear un apartado).

## Ejemplo de uso

```json
{
  "version": "v0.9.1",
  "updateComponents": {
    "surfaceId": "principal",
    "components": [
      {
        "id": "root",
        "component": "TermometroSaludFinanciera",
        "ancho": "amplio",
        "puntajeSalud": 74,
        "calificacion": "estable",
        "tendencia": "mejora",
        "cambioVsMesAnterior": 6,
        "ratioDeudaIngresoPct": 0.22,
        "tasaAhorroPct": 0.18,
        "mesesFondoEmergencia": 2.4,
        "montoAhorradoCentavos": 4500000,
        "habito": "Tu ratio de deuda está bajo control (22%), pero tu fondo de emergencia cubre solo 2.4 meses frente a los 3 recomendados.",
        "razon": "Tu salud financiera subió 6 puntos este mes y se ubica en 74/100 (nivel estable)."
      }
    ]
  }
}
```
