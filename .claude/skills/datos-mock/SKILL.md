---
name: datos-mock
description: Los datos financieros simulados viven en PostgreSQL (esquema banorte), no en el repo - tres perfiles demo con contexto opuesto, estado mutable que las acciones cambian y se reinicia, ids estables, comercios y categorias mexicanas plausibles, montos en centavos, integridad entre tablas. Invocar antes de tocar los datos o el esquema.
---

# Datos mock

Los datos son la mitad de la credibilidad de la demo. Un juez que ve "Comercio 1,
$100.00" deja de creer. Un juez que ve "OXXO Garza Sada, $187.50, 3 de septiembre"
cree que es real.

## Reglas

- **Tres perfiles demo** con nombres inventados (no de una persona real ni del equipo),
  2–4 cuentas cada uno (nómina, ahorro, inversión, crédito) y tarjetas enmascaradas
  `•••• 4821`. Ver "Tres perfiles" abajo.
- **La fuente es PostgreSQL, esquema `banorte`** (ADR 0010). No hay CSV ni datos en el
  repo, y el MCP no arranca sin `DATABASE_URL`. Lo único versionado es el **volcado para
  pruebas** (`apps/mcp/src/__tests__/datos-de-prueba.json`), que además sirve de respaldo:
  `pnpm datos:restaurar` devuelve la base a su punto de partida.
- **Ids estables y legibles**: `usr_ana`, `cta_ana_nomina`, `mov_000123`, `cred_beto_tdc`.
  Nunca UUIDs aleatorios: en la demo se leen en voz alta y en los logs.
- **Montos en centavos enteros** (`BIGINT`), columna `moneda` = `MXN` explícita. Fechas
  `YYYY-MM-DD`, timestamps ISO 8601 con offset `-06:00`. Porcentajes en decimal
  (`0.3690` = 36.90 %), nunca como texto con `%`.
- **Comercios y categorías fijas**, en las tablas `categorias` y `comercios`: Super
  (Soriana, HEB, Walmart), Conveniencia (OXXO, 7-Eleven), Servicios (CFE, Telmex, Agua
  y Drenaje), Transporte (Uber, Didi, gasolina), Suscripciones (Netflix, Spotify),
  Restaurantes, Salud, Transferencias, Nómina, Retiros. Cada movimiento referencia una
  categoría existente, y los comercios llevan sucursal ("OXXO Garza Sada").
- **Doce meses de historial**, 40–80 movimientos/mes por usuario, con patrones reales:
  nómina quincenal, renta el día 1, suscripciones el mismo día cada mes, estacionalidad
  mexicana (aguinaldo en diciembre, Buen Fin en noviembre, regreso a clases en agosto) y
  gastos atípicos marcados con `es_atipico` para que "detectar anomalías" tenga qué
  detectar.
- **Los datos ya están generados y viven en la base.** Se produjeron una vez con un
  generador determinista que se retiró con el ADR 0010. Si hay que cambiarlos, se cambian
  en la base —con una migración en `db/migraciones/` si toca el esquema— y se regenera el
  volcado con `pnpm datos:fixture`.
- **CLABE y tarjetas falsas a la vista**: CLABE de 18 dígitos que empiece en `000`,
  tarjetas enmascaradas, RFC/CURP con patrón visiblemente inventado. Nunca datos
  bancarios reales, ni "de prueba" de alguien.
- **Integridad**: la sostienen las 32 FKs y los `CHECK` del esquema, y las pruebas del
  dominio en `apps/mcp/src/__tests__/` (que cada amortización cierre en saldo cero, que
  los pesos de cada portafolio sumen 100, que los montos sean enteros).

## Tres perfiles demo, no uno

La adaptabilidad (20% de la rúbrica) se demuestra con **la misma pregunta y otro
contexto**. Un solo usuario no puede ser a la vez creíblemente precalificable a crédito,
en mora, y cliente patrimonial con portafolio. Por eso hay tres:

| Id | Quién es | Qué escenarios habilita |
|---|---|---|
| `usr_ana` | Ana Sofía Treviño Cantú, 28, asalariada, ingreso fijo | Gasto por categoría, topes, metas, hábitos, precalificación positiva |
| `usr_beto` | Alberto Ramírez Solís, 41, tarjeta al límite, en mora | Reestructura, amortización, buró castigado, gasto dominado por costo financiero |
| `usr_carmen` | Carmen Elizondo Wong, 52, ingresos variables altos | Perfilamiento de riesgo, portafolio, rebalanceo: el ángulo del **ejecutivo de cuenta** |

## Estado mutable

Las tools de acción **cambian datos**. `banorte.acciones_aplicadas` empieza vacía y es
donde escriben `aplicar_plan_pago`, `crear_tope_gasto`, `crear_apartado` y
`cancelar_suscripcion`. La **idempotencia la garantiza la base**: índice único sobre
`idempotency_key`, así que dos llamadas con la misma llave dejan una sola fila.
`pnpm reiniciar-estado` la trunca; se corre antes de cada ensayo, y el servidor que ya
esté corriendo lo nota sin reiniciarse. Los datos base nunca se mutan.

## Territorios cubiertos

Esta tanda cubre **Crédito**, **Banca personal + Educación financiera** e **Inversiones**.
**Pagos y Seguros quedan fuera** y sus tablas no existen todavía: se agregan cuando haya
un caso de uso que las pida, no antes. Razones en ADR 0007.

## Archivos

```
db/
  schema.sql        DDL de las tablas, FKs, CHECK e indices
  migraciones/      cambios al esquema, en orden y idempotentes
  reiniciar.sql     equivalente SQL de `pnpm reiniciar-estado`
apps/mcp/src/datos/
  postgres.ts       lo unico que habla con la base
  estado.ts         el estado mutable: banorte.acciones_aplicadas
  index.ts          la puerta unica: tabla(), buscar(), filtrar()
apps/mcp/src/__tests__/datos-de-prueba.json   volcado: pruebas y respaldo
scripts/
  migrar.mjs        aplica db/migraciones/*.sql
  volcar-fixture.mjs  regenera el volcado desde la base
  restaurar.mjs     repuebla la base desde el volcado
```

```bash
pnpm datos:migrar      # tras escribir una migracion
pnpm datos:fixture     # tras cambiar datos, para que las pruebas lo vean
pnpm datos:restaurar   # si la base quedo vacia (--recrear la vacia antes)
pnpm reiniciar-estado  # antes de cada ensayo
```

La conexión sale de `DATABASE_URL`. **Las pruebas nunca tocan la base**: cargan el
volcado en un `setupFiles` de vitest, así que un `pnpm test` no puede truncar el estado
de un ensayo ni depender de la red.

## Doc

`docs/como-funciona/datos-mock.md`, dos niveles. En "Para cualquiera": quiénes son los
tres perfiles demo y qué historia cuentan sus movimientos. La lógica del generador
(patrones, estacionalidad, anomalías) va en `docs/algoritmos/generacion-de-datos.md`, y
la amortización con CAT en `docs/algoritmos/amortizacion.md`.
