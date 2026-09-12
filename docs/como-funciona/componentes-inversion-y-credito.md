---
verificado: 2026-09-12 11:05
estado: construido
---

# Nuevos Componentes A2UI: Inversión, Crédito, Diagnóstico y Fugas

Este documento describe los **10 nuevos componentes del catálogo A2UI** desarrollados para el Reto Banorte (Hack Monterrey 2026). Estos componentes extienden el sistema para cubrir el viaje patrimonial, de financiamiento, diagnóstico holístico y optimización de gastos, permitiendo al agente de IA generar interfaces financieras interactivas, explicables y con ciclo de acción cerrado.

Todos los componentes se construyen sobre **shadcn/ui**, usan exclusivamente la **paleta de tokens de Banorte**, cumplen la regla de **altura táctil mínima de 48 px (`min-h-12`)** y se visualizan en la galería interactiva en `/catalogo`.

---

## Índice de Componentes

### Inversiones y Patrimonio
1. [RendimientoHistorico](#1-rendimientohistorico) — Historial y evolución de precios
2. [ProyeccionCrecimiento](#2-proyeccioncrecimiento) — Crecimiento patrimonial con interés compuesto
3. [EscenariosInversion](#3-escenariosinversion) — Comparativa pesimista, esperado y optimista
4. [DistribucionPortafolio](#4-distribucionportafolio) — Asignación de activos por clases
5. [RiesgoRendimiento](#5-riesgorendimiento) — Matriz comparativa de riesgo vs. retorno
6. [OrdenRebalanceo](#6-ordenrebalanceo) — Ejecución de compra/venta para rebalanceo

### Crédito y Estrategia
7. [ProyeccionPagoCredito](#7-proyeccionpagocredito) — Trayectoria de amortización de deuda e intereses
8. [ComparadorAntesDespues](#8-comparadorantesdespues) — Contraste "Camino actual vs. Con Maya"

### Diagnóstico y Optimización
9. [TermometroSaludFinanciera](#9-termometrosaludfinanciera) — Score 0–100 y 3 pilares clave
10. [AlertaFugas](#10-alertafugas) — Detección de fugas y cancelación de suscripciones en 1 clic


---

## 1. RendimientoHistorico

### Propósito
Permite al usuario consultar el comportamiento y plusvalía acumulada de un instrumento o fondo de inversión a lo largo del tiempo (semanas o meses), visualizando puntos clave sin recurrir a tooltips invisibles en dispositivos móviles.

- **Herramienta MCP asociada**: `consultar_historico_inversion`
- **Acción A2UI emitida**: `ver_detalle_instrumento`

### Datos de Ejemplo (Data Model)
```json
{
  "historico": {
    "instrumentoId": "inst_cetes_28",
    "nombre": "Certificados de la Tesorería 28 días",
    "clave": "CETES28",
    "tipo": "Deuda Gubernamental",
    "periodo": "Últimas 12 semanas",
    "precioInicialCentavos": 100000,
    "precioFinalCentavos": 111400,
    "rendimientoPeriodoPct": 0.114,
    "puntos": [
      { "fecha": "2026-06-20", "precioCentavos": 100000, "variacionPct": 0 },
      { "fecha": "2026-07-04", "precioCentavos": 102200, "variacionPct": 0.022 },
      { "fecha": "2026-07-18", "precioCentavos": 104500, "variacionPct": 0.022 },
      { "fecha": "2026-08-01", "precioCentavos": 106800, "variacionPct": 0.022 },
      { "fecha": "2026-08-15", "precioCentavos": 109100, "variacionPct": 0.021 },
      { "fecha": "2026-08-29", "precioCentavos": 111400, "variacionPct": 0.021 }
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `$1,114.00` con indicador en verde `+11.4%` (`text-exito`).
- **Contexto**: Inició en `$1,000.00` hace 12 semanas.
- **Gráfica de barras adaptativa**: Barras proporcionales con el punto más reciente destacado en rojo Banorte (`bg-primary`).
- **Botón de acción**: `Ver detalle del instrumento` (min-h-12).

---

## 2. ProyeccionCrecimiento

### Propósito
Muestra cómo crece el patrimonio al sumar aportaciones periódicas más el rendimiento generado por el interés compuesto a lo largo de un horizonte de meses o años, incluyendo un slider interactivo para simular aportaciones en el cliente.

- **Herramienta MCP asociada**: `proyectar_ahorro` / `consultar_catalogo_inversiones`
- **Acción A2UI emitida**: `simular_inversion`

### Datos de Ejemplo (Data Model)
```json
{
  "proyeccion": {
    "capitalInicialCentavos": 5000000,
    "aportacionMensualCentavos": 300000,
    "plazoMeses": 36,
    "tasaAnualEstimadaPct": 0.105,
    "totalAportadoCentavos": 15800000,
    "rendimientoEstimadoCentavos": 3145600,
    "valorFinalEstimadoCentavos": 18945600,
    "hitos": [
      { "mes": 12, "etiqueta": "Año 1", "aportadoCentavos": 8600000, "saldoEstimadoCentavos": 9320000 },
      { "mes": 24, "etiqueta": "Año 2", "aportadoCentavos": 12200000, "saldoEstimadoCentavos": 13860000 },
      { "mes": 36, "etiqueta": "Año 3 (Meta)", "aportadoCentavos": 15800000, "saldoEstimadoCentavos": 18945600 }
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: Saldo final acumulado de `$189,456.00` (`text-3xl`).
- **Ganancia en intereses**: `+$31,456.00` en verde con icono de chispa.
- **Barra compuesta segmentada**: Proporción de dinero aportado (`bg-chart-1`) vs. rendimientos generados (`bg-primary`).
- **Slider táctil**: Permite ajustar la aportación mensual de `$500` a `$20,000` con recálculo dinámico.
- **Hitos temporales**: Desglose por año (Año 1, Año 2, Meta final).
- **Botón de acción**: `Invertir con este plan`.

---

## 3. EscenariosInversion

### Propósito
Presenta simultáneamente tres escenarios de retorno de inversión (pesimista, esperado y optimista) calculados a partir de volatilidades y trayectorias de tasas de mercado, permitiendo al cliente elegir la postura de riesgo que mejor le acomode.

- **Herramienta MCP asociada**: `consultar_inversiones` / `simular_reestructura`
- **Acción A2UI emitida**: `elegir_escenario`

### Datos de Ejemplo (Data Model)
```json
{
  "escenarios": {
    "montoInvertidoCentavos": 10000000,
    "horizonteMeses": 24,
    "pesimista": {
      "tasaAnualPct": 0.055,
      "valorFinalCentavos": 11130000,
      "rendimientoCentavos": 1130000,
      "descripcion": "Si las tasas de referencia disminuyen y la inflación se estabiliza."
    },
    "esperado": {
      "tasaAnualPct": 0.098,
      "valorFinalCentavos": 12056000,
      "rendimientoCentavos": 2056000,
      "descripcion": "Bajo la curva proyectada de CETES y fondos de deuda corporativa Banorte."
    },
    "optimista": {
      "tasaAnualPct": 0.142,
      "valorFinalCentavos": 13042000,
      "rendimientoCentavos": 3042000,
      "descripcion": "Si la porción en renta variable y bonos a tasa fija supera el consenso de analistas."
    },
    "inicial": "esperado"
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: Valor final del escenario activo (por ejemplo, `$120,560.00` en esperado).
- **Ganancia esperada**: `+$20,560.00` (`9.8%` anual).
- **Selector táctil de 3 tarjetas**:
  1. *Pesimista* (5.5% anual → `$111,300.00`)
  2. *Esperado* (9.8% anual → `$120,560.00`, resaltado con borde rojo Banorte)
  3. *Optimista* (14.2% anual → `$130,420.00`)
- **Botón de confirmación**: `Elegir escenario Esperado`.

---

## 4. DistribucionPortafolio

### Propósito
Resuelve el seguimiento patrimonial integral (la necesidad identificada en el viaje de Carmen): visualiza el desglose de activos en la cartera del cliente (deuda, acciones, fondos, efectivo), comparando la asignación real frente al modelo recomendado y alertando sobre desbalanceos.

- **Herramienta MCP asociada**: `consultar_inversiones`
- **Acción A2UI emitida**: `rebalancear_portafolio`

### Datos de Ejemplo (Data Model)
```json
{
  "portafolio": {
    "valorTotalCentavos": 25000000,
    "aportadoCentavos": 23000000,
    "rendimientoTotalPct": 0.087,
    "desviacionModeloPct": 0.06,
    "clases": [
      {
        "claseId": "deuda_gob",
        "nombre": "Deuda gubernamental",
        "tipo": "Renta fija",
        "montoCentavos": 11250000,
        "pesoPct": 0.45,
        "pesoObjetivoPct": 0.40
      },
      {
        "claseId": "renta_var",
        "nombre": "Renta variable global (ETFs)",
        "tipo": "Renta variable",
        "montoCentavos": 7500000,
        "pesoPct": 0.30,
        "pesoObjetivoPct": 0.35
      },
      {
        "claseId": "fondos_corp",
        "nombre": "Fondos deuda corporativa",
        "tipo": "Renta fija",
        "montoCentavos": 3750000,
        "pesoPct": 0.15,
        "pesoObjetivoPct": 0.15
      },
      {
        "claseId": "efectivo",
        "nombre": "Efectivo / Liquidez",
        "tipo": "Liquidez",
        "montoCentavos": 2500000,
        "pesoPct": 0.10,
        "pesoObjetivoPct": 0.10
      }
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `$250,000.00` con `+8.7%` de rendimiento global.
- **Badge de advertencia**: "Desviación 6.0%" cuando el portafolio difiere del perfil objetivo.
- **Barra continua multicolor**: Tramos proporcionales por clase usando tokens de paleta Banorte.
- **Lista de activos táctil**: Monto en pesos de cada posición y barra de progreso individual.
- **Botón de acción**: `Rebalancear al modelo recomendado`.

---

## 5. RiesgoRendimiento

### Propósito
Organiza y clasifica alternativas de inversión en una escala de riesgo del 1 (muy conservador) al 5 (alto riesgo / renta variable) cruzada con su tasa esperada anual, identificando la mejor recomendación para el perfil del inversionista.

- **Herramienta MCP asociada**: `consultar_catalogo_inversiones`
- **Acción A2UI emitida**: `seleccionar_instrumento`

### Datos de Ejemplo (Data Model)
```json
{
  "catalogo": {
    "perfilInversionista": "Moderado",
    "toleranciaRiesgoMax": 3,
    "montoReferenciaCentavos": 5000000,
    "instrumentoSeleccionadoId": "inst_fondo_deuda",
    "instrumentos": [
      {
        "id": "inst_cetes_28",
        "clave": "CETES28",
        "nombre": "CETES 28 días",
        "tipo": "Deuda gubernamental",
        "riesgo": 1,
        "rendimientoAnualEsperado": 0.111,
        "recomendado": false
      },
      {
        "id": "inst_pagare_91",
        "clave": "PAGARE91",
        "nombre": "Pagaré Banorte 91 días",
        "tipo": "Pagaré bancario",
        "riesgo": 1,
        "rendimientoAnualEsperado": 0.104,
        "recomendado": false
      },
      {
        "id": "inst_fondo_deuda",
        "clave": "NTREX",
        "nombre": "Fondo Deuda Estratégica",
        "tipo": "Fondo de deuda",
        "riesgo": 2,
        "rendimientoAnualEsperado": 0.118,
        "recomendado": true
      },
      {
        "id": "inst_fondo_mixto",
        "clave": "NTRGLOB",
        "nombre": "Fondo Balanceado Global",
        "tipo": "Fondo mixto",
        "riesgo": 3,
        "rendimientoAnualEsperado": 0.135,
        "recomendado": false
      },
      {
        "id": "inst_naftrac",
        "clave": "NAFTRAC",
        "nombre": "ETF IPC México",
        "tipo": "Renta variable",
        "riesgo": 4,
        "rendimientoAnualEsperado": 0.162,
        "recomendado": false
      }
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `11.8%` anual en la opción sugerida (`Fondo Deuda Estratégica NTREX`), calculando una ganancia de `+$5,900.00/año` para un capital base de `$50,000.00`.
- **Lista ordenada por riesgo**: Cuadros numerados del 1 al 5 indicando el nivel de riesgo.
- **Badges contextuales**: Badge rojo Banorte "Sugerido" en el producto ideal, y alerta "Alto riesgo" en opciones que superen la tolerancia del perfil.
- **Botón de acción**: `Invertir en NTREX`.

---

## 6. ProyeccionPagoCredito

### Propósito
Proyecta la extinción paulatina de un crédito vigente (nómina, personal o automotriz), descomponiendo la deuda entre capital vivo e intereses acumulados futuros, y cuantificando el ahorro financiero alcanzable al realizar abonos directos a capital.

- **Herramienta MCP asociada**: `consultar_creditos` / `simular_reestructura`
- **Acción A2UI emitida**: `simular_abono_capital`

### Datos de Ejemplo (Data Model)
```json
{
  "credito": {
    "creditoId": "cred_nomina_01",
    "alias": "Crédito de Nómina Banorte",
    "saldoInsolutoCentavos": 5578300,
    "mensualidadCentavos": 325000,
    "tasaAnualPct": 0.245,
    "plazoRestanteMeses": 20,
    "totalInteresesEstimadosCentavos": 1421700,
    "ahorroConAbonoCapitalCentavos": 485000,
    "amortizacionResumen": [
      {
        "numeroPago": 1,
        "periodo": "Próximo pago",
        "capitalCentavos": 211000,
        "interesCentavos": 114000,
        "saldoFinalCentavos": 5367300
      },
      {
        "numeroPago": 6,
        "periodo": "En 6 meses",
        "capitalCentavos": 238000,
        "interesCentavos": 87000,
        "saldoFinalCentavos": 4150000
      },
      {
        "numeroPago": 12,
        "periodo": "En 1 año",
        "capitalCentavos": 275000,
        "interesCentavos": 50000,
        "saldoFinalCentavos": 2480000
      },
      {
        "numeroPago": 20,
        "periodo": "Liquidación final",
        "capitalCentavos": 318000,
        "interesCentavos": 7000,
        "saldoFinalCentavos": 0
      }
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `$55,783.00` de saldo insoluto pendiente en tipografía destacada (`monto text-3xl`).
- **Mensualidad**: `$3,250.00` fija mensual a 20 meses.
- **Barra de contraste de deuda**: Capital restante (80%) en gris oscuro frente a intereses proyectados (20%) en rojo Banorte (`$14,217.00`).
- **Tarjeta de oportunidad de ahorro**: Destaca en verde (`text-exito`) el beneficio de `$4,850.00` si se abona a capital.
- **Hitos cronológicos de amortización**: Fila a fila mostrando la caída del saldo (Próximo pago, 6 meses, 1 año, Liquidación).
- **Botón de acción**: `Simular abono a capital`.

---

## 7. OrdenRebalanceo

### Propósito
Complementa a `DistribucionPortafolio`. Cuando el usuario decide rebalancear, el agente presenta la orden preliminar de ejecución mostrando las compras y ventas necesarias para alinear los pesos de su cartera al modelo patrimonial.

- **Herramienta MCP asociada**: `consultar_inversiones`
- **Acción A2UI emitida**: `confirmar_rebalanceo`

### Datos de Ejemplo (Data Model)
```json
{
  "orden": {
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
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `$250,000.00` de valor patrimonial total.
- **Comisiones**: `Sin costo ($0.00 MXN)` destacado en verde.
- **Lista de operaciones**: Indicadores visuales de Venta (rojo) y Compra (verde) con claves de instrumento y transición de porcentajes (`45% → 40%`).
- **Botón de acción**: `Confirmar y rebalancear portafolio`.

---

## 8. ComparadorAntesDespues

### Propósito
Permite al usuario contrastar de forma contundente su situación financiera actual (status quo sin cambios) frente al impacto de adoptar la estrategia sugerida por Maya, cuantificando el ahorro monetario neto y el tiempo ganado.

- **Herramienta MCP asociada**: `simular_reestructura` / `proyectar_ahorro`
- **Acción A2UI emitida**: `aplicar_estrategia`

### Datos de Ejemplo (Data Model)
```json
{
  "comparativa": {
    "titulo": "Reestructura de Tarjeta Clásica",
    "ahorroNetoCentavos": 13206500,
    "ahorroTiempoMeses": 34,
    "actual": {
      "etiqueta": "Pagando el mínimo actual",
      "mensualidadCentavos": 195000,
      "costoTotalCentavos": 18945000,
      "tiempoMeses": 52,
      "descripcion": "52 meses pagando intereses altos sin reducir el capital sustancialmente."
    },
    "estrategia": {
      "etiqueta": "Con Plan Fijo Banorte 18 meses",
      "mensualidadCentavos": 319300,
      "costoTotalCentavos": 5738500,
      "tiempoMeses": 18,
      "descripcion": "Liquidas tu deuda completa en 18 meses pagando solo una fracción de intereses."
    }
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `+$132,065.00` en verde como ahorro neto obtenido.
- **Tiempo ganado**: `34 meses` menos pagando deuda.
- **Tarjetas comparativas**:
  - *Camino actual*: Costo total de `$189,450.00` en 52 meses.
  - *Estrategia Maya*: Costo total de `$57,385.00` en 18 meses (resaltado con borde Banorte).
- **Botón de acción**: `Aplicar estrategia recomendada`.

---

## 9. TermometroSaludFinanciera

### Propósito
Ofrece un diagnóstico integral del estado financiero del usuario (escala del 0 al 100) y desglosa sus 3 pilares clave: endeudamiento, capacidad de ahorro y cobertura del fondo de emergencia.

- **Herramienta MCP asociada**: `diagnostico_salud_financiera`
- **Acción A2UI emitida**: `mejorar_salud_financiera`

### Datos de Ejemplo (Data Model)
```json
{
  "diagnostico": {
    "puntajeSalud": 74,
    "calificacion": "estable",
    "tendencia": "mejora",
    "cambioVsMesAnterior": 6,
    "ratioDeudaIngresoPct": 0.22,
    "tasaAhorroPct": 0.18,
    "mesesFondoEmergencia": 2.4,
    "montoAhorradoCentavos": 4500000,
    "habito": "Tu ratio de deuda está bajo control (22%), pero tu fondo de emergencia cubre solo 2.4 meses frente a los 3 recomendados."
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `74 / 100` con badge cualitativo `Estable` y tendencia `+6 pts vs. mes anterior`.
- **Saldo de ahorro líquido**: `$45,000.00`.
- **Barras de pilares**:
  - *Endeudamiento*: `22.0%` (dentro de límites saludables).
  - *Ahorro mensual*: `18.0%` (destacado en verde).
  - *Fondo de emergencia*: `2.4 meses` de cobertura.
- **Caja de recomendación IA**: Explicación del hábito financiero detectado.
- **Botón de acción**: `Mejorar mi salud financiera`.

---

## 10. AlertaFugas

### Propósito
Detecta gastos hormiga recurrentes y suscripciones sin uso reciente, calcula el ahorro anual que generaría su cancelación y permite dar de baja el cargo con un solo clic.

- **Herramienta MCP asociada**: `detectar_fugas` / `cancelar_suscripcion`
- **Acción A2UI emitida**: `cancelar_suscripcion`

### Datos de Ejemplo (Data Model)
```json
{
  "fugas": {
    "totalMensualCentavos": 114800,
    "totalAnualCentavos": 1377600,
    "pctDelIngreso": 0.045,
    "lista": [
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
    ]
  }
}
```

### Elementos Visuales en Pantalla
- **Cifra principal**: `$13,776.00` de fuga anual potencial en rojo Banorte.
- **Badge de alerta**: `1 sin uso reciente`.
- **Lista de suscripciones**: Cada fila muestra concepto, comercio, monto mensual y un botón destructivo `Cancelar` para eliminar la fuga de inmediato.

---

## Cómo Probar y Visualizar en la Galería

1. **En el navegador**:
   Abre la galería en `http://localhost:3000/catalogo`. Encontrarás los **18 componentes propios** (los 8 originales + los 10 nuevos) renderizados en vivo mediante el motor A2UI oficial (`procesarVarios` + `<Superficie>`).

2. **Interacciones en vivo**:
   - Cada componente incluye su visualización con datos de ejemplo y su vista de esqueleto en carga.
   - Al hacer clic en los botones de acción, el panel inferior captura en tiempo real el mensaje A2UI que viajaría hacia el agente (`client_to_server.json`).
   - Puedes desplegar las props del schema y el archivo `.jsonl` fuente de cada tarjeta.

3. **Verificación automatizada**:
   ```bash
   pnpm --filter @maya/catalogo test   # 87 pruebas en verde
   pnpm typecheck                      # Verificación completa de tipos en 5 paquetes
   ```

