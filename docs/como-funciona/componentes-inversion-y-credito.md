---
verificado: 2026-09-12 14:40
estado: construido
---

# Nuevos Componentes A2UI: Inversión, Crédito, Diagnóstico y Fugas

Este documento describe los **10 nuevos componentes del catálogo A2UI** desarrollados para el Reto Banorte (Hack Monterrey 2026). Estos componentes extienden el sistema para cubrir el viaje patrimonial, de financiamiento, diagnóstico holístico y optimización de gastos, permitiendo al agente de IA generar interfaces financieras interactivas, explicables y con ciclo de acción cerrado.

Todos los componentes se construyen sobre **shadcn/ui**, usan exclusivamente la **paleta de tokens de Banorte**, cumplen la regla de **altura táctil mínima de 48 px (`min-h-12`)** y se visualizan en la galería interactiva en `/catalogo`.

**Responsivos, 2026-09-12 (14:40).** Los diez se adaptan al ancho de SU tarjeta (container queries), no al de la pantalla, y el "¿Por qué veo esto?" viene plegado en una línea que se abre al tocarla (`PieTarjeta`). Donde el componente es ancho usa el espacio: `ProyeccionPagoCredito` y `ProyeccionCrecimiento` ponen la gráfica a la izquierda y fichas/controles a la derecha desde 48rem de tarjeta; `TermometroSaludFinanciera` y `EscenariosInversion` pasan a fila desde 28rem; `DistribucionPortafolio` pone la dona junto a la lista desde 32rem; `RiesgoRendimiento` pone las opciones en dos columnas desde 48rem. Lo que se describe abajo como "en móvil/escritorio" se lee como "tarjeta angosta/ancha". El acomodo entre tarjetas está en [`docs/algoritmos/acomodo-del-lienzo.md`](../algoritmos/acomodo-del-lienzo.md).

**Pulido del 2026-09-12 (13:10).** Los diez se revisaron con capturas del navegador a 1280 px y a 390 px y se reescribieron con tres reglas: (1) la anatomía de tarjeta del sistema —etiqueta chica, el número grande, una línea de detalle, cuerpo, pie con un solo botón píldora y la razón—; (2) donde el dato es una serie, hay una gráfica de Recharts (`@/components/ui/chart`) con etiquetas directas y ningún número que viva solo en el tooltip; (3) fuera lo que gritaba sin informar: títulos en mayúsculas, cajas con borde dentro de la tarjeta, iconos de chispas y alerta, montos en rojo. El módulo compartido es `packages/catalogo/src/graficas.tsx` y las decisiones (forma por tipo de dato, orden de colores validado, serie calibrada del slider, referencias de los pilares) están en [`docs/algoritmos/graficas-del-catalogo.md`](../algoritmos/graficas-del-catalogo.md).

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
- **Etiqueta**: nombre del instrumento y clave (`Certificados de la Tesorería 28 días · CETES28`).
- **Cifra principal**: `$1,114.00`, el precio de cierre.
- **Detalle**: `+11.4 %` en `text-exito` con el periodo y el precio inicial (`inició en $1,000.00`).
- **Curva de área** (`AreaChart`): la serie de precios con eje de fechas legible (`20 jun`, `4 jul`…), eje Y oculto, línea en oscuro (`--chart-1`) y el **punto de cierre en rojo con su etiqueta directa** (`$1,114`). Sustituye a las barras con base en el mínimo, que exageraban el cambio.
- **Pie**: botón en contorno `Ver detalle del instrumento` (píldora, 48 px) y la razón.

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
- **Etiqueta**: `En 36 meses (3 años) · 10.5 % anual estimado`.
- **Cifra principal**: el cierre proyectado (`$189,456.00`), que cambia con el slider.
- **Detalle**: `+$31,456.00 de rendimiento sobre $158,000.00 aportados` (rendimiento en `text-exito`).
- **La separación** (`AreaChart` con `stackId`, rehecha el 2026-09-12 por feedback del usuario): lo aportado es una línea oscura casi sin relleno y el rendimiento la franja roja entre esa línea y la curva de arriba. **Cada hito lleva su valor escrito sobre el punto** (`$92.3k`, `$138.7k`, `$189.5k`), el cierre dice `$158k aportados` debajo de la línea oscura (solo en tarjetas de 28rem o más), y el eje Y da la escala con tres marcas. El eje X marca `Hoy` y los hitos. Leyenda debajo.
- **Fichas de hitos**: una por hito con el total en ese mes y, en escritorio, lo aportado en formato corto (`$86k aportados`). Salen de la **misma serie** que la curva (calibrada con la tool), así que ya no contradicen al encabezado.
- **Slider**: `Aportación mensual` con el monto en `text-xl`, de `$100` a `$20,000` (o 4× la aportación inicial).
- **Pie**: botón `Invertir con este plan` y la razón.

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
- **Etiqueta**: `Escenario esperado a 24 meses (2 años) · inviertes $100,000.00`.
- **Cifra principal**: valor final del escenario activo (`$120,560.00`).
- **Detalle**: `+$20,560.00 · 9.8 % anual`.
- **Selector de 3 opciones** (`role="radiogroup"`): nombre y tasa en una línea, monto final debajo; la activa lleva borde y fondo de tinte, igual que una opción de `PlanDePago`. Sin iconos ni colores por escenario.
- **Descripción** del escenario activo en una línea gris.
- **Pie**: botón `Elegir escenario esperado` y la razón.

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
- **Etiqueta**: `Tu portafolio · 4 clases de activo`, con badge `6 % fuera del modelo` cuando la desviación pasa de 5 %.
- **Cifra principal**: `$250,000.00`.
- **Detalle**: `+8.7 % de rendimiento sobre $230,000.00 aportados`.
- **Dona** (`PieChart`, 160 px) con el total compacto al centro (`$250 k`), separación de 2 px entre segmentos y colores por clase en orden oscuro → rojo → gris → plata (el par rojo / rojo claro no pasa el validador de daltonismo).
- **Lista de clases** al lado de la dona (debajo, en móvil): cuadro de color, nombre, monto y `45 % · objetivo 40 %`; el objetivo se marca en negro cuando la clase se desvía 3 puntos o más. Sin barras por fila: la dona ya es la proporción.
- **Pie**: botón `Rebalancear al modelo` y la razón.

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
- **Etiqueta**: `Perfil moderado · tolera riesgo hasta 3 de 5`.
- **Cifra principal**: la tasa de la opción seleccionada (`11.8 %`), que cambia con la selección.
- **Detalle**: `anual estimado con Fondo Deuda Estratégica · +$5,900.00 al año sobre $50,000.00`.
- **Grupo de radios** (`RadioGroup`, el mismo patrón que `PlanDePago`): cada opción es un `<label>` de 48 px con el nombre, el badge `Sugerido` en tinte, **cinco puntos de riesgo** (los llenos son el nivel) con su palabra (`riesgo bajo`), la clave en escritorio, y a la derecha la tasa con `anual`. Una opción por encima de la tolerancia dice `supera tu perfil` en `text-advertencia` y sus puntos van en ese color.
- **Pie**: botón `Invertir en NTREX` y la razón.

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
- **Etiqueta**: `Crédito de Nómina Banorte · 20 meses restantes`, con badge `24.5 % anual`.
- **Cifra principal**: `$55,783.00` de saldo.
- **Detalle**: `de saldo · pagas $3,250.00 al mes`.
- **Curva del saldo** (`AreaChart`, rehecha el 2026-09-12 por feedback del usuario): de hoy a la liquidación, **con el saldo de cada hito escrito sobre su punto** (`$53.7k`, `$41.5k`, `$24.8k`, `$0`), eje Y de tres marcas para la escala y el eje X con cada hito en meses desde hoy (`Hoy`, `6 meses`, `1 año`, `20 meses`; las marcas que se pisarían en una tarjeta angosta se esconden, nunca la primera ni la última). La tool real numera los pagos desde la contratación (23, 27, 31, 36 a quien ya lleva 22), así que "hoy" es el pago anterior al primer hito y la curva no se aplasta a la derecha.
- **Fichas de hitos** (2 columnas en tarjeta angosta, 4 desde 36rem, otra vez 2 cuando comparten tarjeta con la curva): `Próximo pago $53,673.00`, … `Liquidación final $0.00`, y debajo de cada una **de qué se compone ese pago**: una barra capital / interés y `$1,140 de interés · 35 %` … `$70 de interés · 2 %`. Es lo que una amortización enseña y una curva no: el pago es el mismo, el interés baja. Si la tool manda una fecha (`2026-10-20`) en vez de etiqueta, se pinta `20 de octubre`.
- **Barra de dos segmentos** (capital en oscuro, intereses en rojo) con su leyenda con montos y el porcentaje (`Intereses $14,217.00 · 20 % de lo que pagarás`): la respuesta a "¿cuánto pagaré de puros intereses?".
- **Oportunidad de ahorro** como una frase con el monto en `text-exito`, sin caja de color (solo si la tool mandó el dato; hoy ninguna lo hace).
- **Pie**: la razón. Sin botón: `simular_abono_capital` no lo atiende ninguna tool.

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
- **Etiqueta**: `Orden de rebalanceo · Estrategia Balanceada Carmen`, con badge `2 operaciones`.
- **Cifra principal**: `$250,000.00`.
- **Detalle**: `en el portafolio · sin comisión` (en `text-exito`; si hay comisión, el monto).
- **Lista de operaciones**: badge `Venta` (tinte) o `Compra` (verde suave), clave del instrumento y clase de activo, monto y `45 % → 40 %`. Sin cuadros de icono ni título en mayúsculas.
- **Pie**: botón `Confirmar rebalanceo` y la razón.

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
- **Etiqueta**: el título de la comparativa (`Reestructura de Tarjeta Clásica`).
- **Cifra principal**: el ahorro (`$132,065.00`), en negro.
- **Detalle**: `de ahorro con la estrategia · terminas 34 meses antes`.
- **Dos barras horizontales en la misma escala**: `Pagando el mínimo actual $189,450.00` en rojo (lo que duele) y `Con Plan Fijo Banorte 18 meses $57,385.00` en oscuro, cada una con `52 meses · $1,950.00 al mes` debajo. Sustituyen a las dos tarjetas de texto.
- **Descripción** de la estrategia en una línea.
- **Pie**: botón `Aplicar estrategia` y la razón.

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
- **Etiqueta**: `Salud financiera`, con badge de calificación (`Estable` en verde suave; `Frágil`/`Crítica` en tinte).
- **Medio arco** (`RadialBarChart`, 192 × 96 px) con el puntaje adentro en `text-4xl` (`74 / 100`); el arco va en oscuro cuando la calificación es estable o sana y en rojo cuando no.
- **Al lado del arco**: `+6 puntos vs. el mes anterior` en `text-exito` y `Ahorro líquido $45,000.00`.
- **Tres pilares** (una fila cada uno en móvil, tres columnas en escritorio): `Endeudamiento 22 %`, `Ahorro mensual 18 %`, `Fondo de emergencia 2.4 meses`, cada uno con una barra medida contra **su referencia** (máx. 35 %, meta 20 %, meta 3 meses) escrita debajo; la barra va en rojo si el pilar está fuera de su referencia.
- **Hábito** detectado como un párrafo normal, sin caja ni icono.
- **Pie**: botón `Mejorar mi salud financiera` y la razón.

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
- **Etiqueta**: `Suscripciones · 3 cargos recurrentes`, con badge `1 sin uso`.
- **Cifra principal**: `$13,776.00` al año, **en negro**: el rojo es de la marca, no de "esto está mal".
- **Detalle**: `al año · $1,148.00 al mes, 4.5 % de tu ingreso`.
- **Lista de suscripciones** separada por líneas (sin cajas): concepto, `comercio · periodicidad`, badge `Sin uso hace 3 meses` en tinte cuando aplica, el monto y el botón `Cancelar`. **Solo la que lleva meses sin uso tiene el botón rojo**; las demás lo tienen en contorno. En móvil el botón baja a su propia fila, a lo ancho.
- **Pie**: la razón.

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
   pnpm --filter @maya/catalogo test   # 91 pruebas en verde (2026-09-12 13:10)
   pnpm typecheck                      # Verificación completa de tipos en 5 paquetes
   ```

