---
name: datos-mock
description: Cómo se generan y mantienen los datos financieros simulados - tres perfiles demo con contexto opuesto, CSV commiteados como fuente y PostgreSQL como copia cargable, estado mutable que las acciones cambian y se reinicia, ids estables, comercios y categorías mexicanas plausibles, montos en centavos, generación determinista, integridad entre archivos. Invocar antes de crear o modificar cualquier dato en db/datos.
---

# Datos mock

Los datos son la mitad de la credibilidad de la demo. Un juez que ve "Comercio 1,
$100.00" deja de creer. Un juez que ve "OXXO Garza Sada, $187.50, 3 de septiembre"
cree que es real.

## Reglas

- **Tres perfiles demo** con nombres inventados (no de una persona real ni del equipo),
  2–4 cuentas cada uno (nómina, ahorro, inversión, crédito) y tarjetas enmascaradas
  `•••• 4821`. Ver "Tres perfiles" abajo.
- **La fuente son CSV commiteados en `db/datos/`; PostgreSQL es una copia cargable.**
  Nunca se commitea un dump ni el estado de la base. Detalle en ADR 0005.
- **Ids estables y legibles**: `usr_ana`, `cta_ana_nomina`, `mov_000123`, `cred_beto_tdc`.
  Nunca UUIDs aleatorios: en la demo se leen en voz alta y en los logs.
- **Montos en centavos enteros** (`BIGINT`), columna `moneda` = `MXN` explícita. Fechas
  `YYYY-MM-DD`, timestamps ISO 8601 con offset `-06:00`. Porcentajes en decimal
  (`0.3690` = 36.90 %), nunca como texto con `%`.
- **Comercios y categorías fijas**, en `categorias.csv` y `comercios.csv`: Super
  (Soriana, HEB, Walmart), Conveniencia (OXXO, 7-Eleven), Servicios (CFE, Telmex, Agua
  y Drenaje), Transporte (Uber, Didi, gasolina), Suscripciones (Netflix, Spotify),
  Restaurantes, Salud, Transferencias, Nómina, Retiros. Cada movimiento referencia una
  categoría existente, y los comercios llevan sucursal ("OXXO Garza Sada").
- **Doce meses de historial**, 40–80 movimientos/mes por usuario, con patrones reales:
  nómina quincenal, renta el día 1, suscripciones el mismo día cada mes, estacionalidad
  mexicana (aguinaldo en diciembre, Buen Fin en noviembre, regreso a clases en agosto) y
  gastos atípicos marcados con `es_atipico` para que "detectar anomalías" tenga qué
  detectar.
- **Generación determinista**: `scripts/generar-datos.mjs` con semilla fija, Node puro
  sin dependencias. Se regenera con `node scripts/generar-datos.mjs`; los CSV generados
  **sí se commitean** (la demo no depende de correr el script).
- **CLABE y tarjetas falsas a la vista**: CLABE de 18 dígitos que empiece en `000`,
  tarjetas enmascaradas, RFC/CURP con patrón visiblemente inventado. Nunca datos
  bancarios reales, ni "de prueba" de alguien.
- **Integridad**: `scripts/validar-datos.mjs` valida que todo id referenciado exista, que
  los montos sean enteros, que cada movimiento tenga categoría válida, que cada tabla de
  amortización cierre en saldo cero y que los pesos de cada portafolio sumen 100.

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

Las tools de acción **cambian datos**. La tabla `acciones_aplicadas` empieza vacía (el
CSV trae solo el encabezado) y es donde escriben `aplicar_plan_pago`, `crear_tope_gasto`,
`crear_apartado` y `rebalancear`. `db/reiniciar.sql` la trunca y restaura los saldos; se
corre antes de cada ensayo. Los datos base nunca se mutan.

## Territorios cubiertos

Esta tanda cubre **Crédito**, **Banca personal + Educación financiera** e **Inversiones**.
**Pagos y Seguros quedan fuera** y sus tablas no existen todavía: se agregan cuando haya
un caso de uso que las pida, no antes. Razones en ADR 0005.

## Archivos

```
db/
  schema.sql        DDL de las tablas, FKs, CHECK e índices
  cargar.sql        los \copy en orden de dependencia (necesita psql)
  cargar-completo.sql  generado: esquema + INSERTs en un archivo, sin psql ni red
  reiniciar.sql     deja la demo limpia entre ensayos
  datos/            22 CSV: la fuente de verdad, commiteada
scripts/
  generar-datos.mjs            determinista, semilla fija
  validar-datos.mjs            integridad referencial y de negocio
  verificar-orden-columnas.mjs orden de columnas del CSV vs. schema.sql
  cargar-postgres.mjs          crea el esquema y sube los CSV con el driver pg
  generar-sql-completo.mjs     produce db/cargar-completo.sql
  lib/                         catalogos.mjs, perfiles.mjs, finanzas.mjs
```

**Tres rutas para cargar, equivalentes.** `cargar-postgres.mjs` (Node, no necesita psql,
carga en una transacción y verifica contra el CSV), `cargar.sql` (psql) y
`cargar-completo.sql` (un archivo, para cuando no puedes alcanzar el puerto). La conexión
sale de `POSTGRE_BANORTE_URL`.

**El orden de columnas de cada CSV tiene que coincidir con el de su tabla.** `\copy` con
`HEADER true` ignora los nombres del encabezado y mapea **por posición**, así que un orden
distinto no da error: mete los datos en la columna equivocada. Si agregas una columna,
corre `verificar-orden-columnas.mjs`.

## Doc

`docs/como-funciona/datos-mock.md`, dos niveles. En "Para cualquiera": quiénes son los
tres perfiles demo y qué historia cuentan sus movimientos. La lógica del generador
(patrones, estacionalidad, anomalías) va en `docs/algoritmos/generacion-de-datos.md`, y
la amortización con CAT en `docs/algoritmos/amortizacion.md`.
