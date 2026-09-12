---
name: datos-mock
description: Cómo se generan y mantienen los datos financieros simulados - un solo usuario demo, ids estables, comercios y categorías mexicanas plausibles, montos en centavos, generación determinista, integridad entre archivos. Invocar antes de crear o modificar cualquier dato en apps/mcp/data.
---

# Datos mock

Los datos son la mitad de la credibilidad de la demo. Un juez que ve "Comercio 1,
$100.00" deja de creer. Un juez que ve "OXXO Garza Sada, $187.50, 3 de septiembre"
cree que es real.

## Reglas

- **Un solo usuario demo**, con nombre inventado (no de una persona real ni del
  equipo), 2–3 cuentas (nómina, ahorro, crédito) y una tarjeta enmascarada `•••• 4821`.
- **Ids estables y legibles**: `cta_nomina`, `cta_ahorro`, `mov_000123`, `cred_001`.
  Nunca UUIDs aleatorios: en la demo se leen en voz alta y en los logs.
- **Montos en centavos enteros**, campo `moneda: "MXN"` explícito. Fechas ISO 8601.
- **Comercios y categorías fijas**, en un solo archivo `categorias.json`: Super
  (Soriana, HEB, Walmart), Conveniencia (OXXO, 7-Eleven), Servicios (CFE, Telmex, Agua
  y Drenaje), Transporte (Uber, Didi, gasolina), Suscripciones (Netflix, Spotify),
  Restaurantes, Salud, Transferencias, Nómina, Retiros. Cada movimiento referencia una
  categoría existente.
- **Seis meses de historial**, 40–80 movimientos/mes, con patrones reales: nómina
  quincenal, renta el día 1, suscripciones el mismo día cada mes, un par de gastos
  atípicos para que "detectar anomalías" tenga qué detectar.
- **Generación determinista**: `apps/mcp/scripts/generar-datos.ts` con semilla fija.
  Se regenera con `pnpm --filter mcp generar-datos`; los JSON generados **sí se
  commitean** (la demo no depende de correr el script).
- **CLABE y tarjetas falsas a la vista**: CLABE de 18 dígitos que empiece en `000`,
  tarjetas enmascaradas. Nunca datos bancarios reales, ni "de prueba" de alguien.
- **Integridad**: un test (`apps/mcp/src/__tests__/datos.spec.ts`) valida que todo id
  referenciado existe, que los montos son enteros, que cada movimiento tiene categoría
  válida y que los JSON pasan los schemas de `packages/schemas`.

## Archivos

```
apps/mcp/data/
  usuario.json        el usuario demo y sus cuentas
  movimientos.json    generado
  categorias.json     fijo, a mano
  productos.json      créditos/inversiones ofertables, si el caso lo pide
```

## Doc

`docs/como-funciona/datos-mock.md`, dos niveles. En "Para cualquiera": quién es el
usuario demo y qué historia cuentan sus movimientos. Si el generador tiene lógica
(patrones, anomalías), también `docs/algoritmos/generacion-de-datos.md`.
