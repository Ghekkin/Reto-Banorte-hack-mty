---
name: "datos-mock-postgres"
created: "2026-09-12T03:17:39.022Z"
status: pending
---

# Plan: datos mock en CSV para PostgreSQL

## Decisiones tomadas

| Decisión                  | Valor                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| Formato de entrega        | **CSV** listos para `\copy`; tú los cargas a Postgres                   |
| Usuarios demo             | **3 perfiles**                                                          |
| Historial                 | **12 meses** (2025-09 → 2026-09)                                        |
| Territorios en esta tanda | **Crédito**, **Banca personal + Educación financiera**, **Inversiones** |
| Fuera de esta tanda       | **Pagos**, **Seguros** (tablas diseñadas, sin filas)                    |

### Por qué esos tres

`docs/reto/casos-de-uso.md` puntúa **Crédito** (reestructura, 16) y **Banca personal / Educación** (gasto + tope, 16) como los dos mejores, y su recomendación es combinarlos en una sola demo. **Inversiones** entra por tu requisito del ángulo no-retail: el mismo agente sirve a un **ejecutivo de cuenta** que perfila a un cliente y le arma un portafolio — perfilamiento, modelo objetivo, rebalanceo. Eso da tres audiencias distintas (endeudado, ahorrador, ejecutivo) sobre el mismo servidor MCP, que es exactamente lo que la rúbrica llama adaptabilidad.

Pagos y Seguros quedan fuera porque sus casos puntúan 14 y 13, sus datos son los más laboriosos (conciliación, coberturas) y no aportan una pantalla que los otros tres no den ya.

## Los 3 perfiles

| Perfil                                                                                     | Quién es                                                      | Qué escenarios habilita                                                                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ana Sofía Treviño Cantú**, 28, diseñadora asalariada, ingreso fijo $32,000/mes           | Sana pero sin control: gasta todo, no ahorra sistemáticamente | Gasto por categoría, topes, metas, diagnóstico de hábitos, precalificación positiva, primer portafolio conservador                              |
| **Alberto "Beto" Ramírez Solís**, 41, empleado, ingreso $24,500/mes, 2 dependientes        | Tarjeta al límite, 12 días de mora, paga mínimos              | Reestructura de tarjeta, amortización, buró castigado, precalificación negativa, gasto dominado por costo financiero                            |
| **Carmen Elizondo Wong**, 52, profesionista independiente, ingresos variables $60–140k/mes | Cliente patrimonial atendida por ejecutivo                    | Perfilamiento de riesgo, portafolio diversificado con plusvalía y minusvalía, rebalanceo contra modelo, simulación, crédito hipotecario vigente |

Nombres inventados, sin parecido con nadie del equipo. CLABE de 18 dígitos que empieza en `000`, tarjetas enmascaradas `•••• 4821`, RFC/CURP con patrón visiblemente falso.

## Los 22 archivos CSV

Orden de carga = orden de la tabla (respeta las FKs).

### Núcleo — 3 archivos

| # | Archivo        | Filas aprox. | Columnas clave                                                                                                                              |
| - | -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `usuarios.csv` | 3            | `id`, `nombre`, `edad`, `ocupacion`, `ingreso_mensual_centavos`, `dependientes`, `ciudad`, `segmento`, `cliente_desde`                      |
| 2 | `cuentas.csv`  | 9            | `id`, `usuario_id`, `tipo` (nomina/ahorro/inversion/credito), `alias`, `clabe`, `saldo_centavos`, `moneda`, `estatus`                       |
| 3 | `tarjetas.csv` | 4            | `id`, `cuenta_id`, `mascara`, `tipo`, `limite_centavos`, `saldo_centavos`, `tasa_anual`, `pago_minimo_centavos`, `fecha_corte`, `dias_mora` |

### Banca personal — 4 archivos

| # | Archivo             | Filas aprox. | Notas                                                                                                                                |
| - | ------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 4 | `categorias.csv`    | 14           | `grupo`, `es_esencial` — habilita el split esencial/discrecional del diagnóstico                                                     |
| 5 | `comercios.csv`     | \~45         | Con sucursal: "OXXO Garza Sada", "HEB Valle Oriente", "CFE"                                                                          |
| 6 | `movimientos.csv`   | **\~2,200**  | `fecha`, `tipo`, `monto_centavos`, `categoria_id`, `comercio_id`, `canal`, `es_recurrente`, `es_atipico`, `saldo_posterior_centavos` |
| 7 | `suscripciones.csv` | 11           | Cargo el mismo día cada mes; el generador las materializa en movimientos                                                             |

`movimientos.csv` es el archivo que sostiene la demo: nómina quincenal, renta el día 1, suscripciones en fecha fija, estacionalidad mexicana (aguinaldo en diciembre, Buen Fin en noviembre, regreso a clases en agosto) y **6 gastos atípicos marcados** para que "detectar anomalías" tenga qué detectar.

### Crédito — 5 archivos

| #  | Archivo                   | Filas aprox. | Notas                                                                                                      |
| -- | ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| 8  | `productos_credito.csv`   | 8            | Catálogo ofertable: tasas, CAT, plazos, monto e ingreso mínimo                                             |
| 9  | `creditos.csv`            | 5            | Vigentes: `saldo_insoluto`, `tasa_anual`, `cat`, `pagos_realizados`, `mensualidad`, `dias_mora`            |
| 10 | `amortizaciones.csv`      | \~260        | Por pago: `capital`, `interes`, `iva_interes`, `saldo_final`, `estatus`                                    |
| 11 | `planes_reestructura.csv` | 9            | 3 plazos (12/18/24) × 3 escenarios, con `ahorro_vs_minimo` precalculado                                    |
| 12 | `buro.csv`                | 3            | `score`, `pagos_puntuales_pct`, `nivel_endeudamiento_pct`, `capacidad_pago_mensual`, `precalificado_hasta` |

### Inversiones — 4 archivos

| #  | Archivo                  | Filas aprox. | Notas                                                                                  |
| -- | ------------------------ | ------------ | -------------------------------------------------------------------------------------- |
| 13 | `instrumentos.csv`       | 16           | CETES, bonos, pagarés, fondos, ETFs; `riesgo` 1–5, `volatilidad_anual`, `monto_minimo` |
| 14 | `modelos_portafolio.csv` | 24           | Asignación objetivo por perfil → habilita "rebalancear"                                |
| 15 | `portafolios.csv`        | 3            | `valor_actual`, `aportado`, `rendimiento_pct`                                          |
| 16 | `posiciones.csv`         | 22           | `titulos`, `precio_promedio_compra`, `precio_actual`, `peso_pct`, `plusvalia_centavos` |
| 17 | `precios_historicos.csv` | \~830        | Semanal, 12 meses × 16 instrumentos — alimenta las gráficas                            |

`perfiles_inversion.csv` (#18, 3 filas) guarda el resultado del cuestionario: `perfil`, `puntaje`, `horizonte_meses`, `tolerancia_perdida_pct`, `vigencia`.

### Educación financiera — 3 archivos

| #  | Archivo                   | Filas | Notas                                                                                                      |
| -- | ------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| 19 | `metas.csv`               | 5     | `monto_objetivo`, `monto_actual`, `fecha_objetivo`, `aportacion_sugerida`                                  |
| 20 | `topes_gasto.csv`         | 4     | `categoria_id`, `monto_limite`, `periodo`, `gastado_actual`                                                |
| 21 | `diagnostico_habitos.csv` | 36    | 3 usuarios × 12 meses: `tasa_ahorro_pct`, `ratio_deuda_ingreso`, `meses_fondo_emergencia`, `puntaje_salud` |

### Estado mutable — 1 archivo

| #  | Archivo                  | Filas               | Notas                                                                                                                                                 |
| -- | ------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22 | `acciones_aplicadas.csv` | 0 (solo encabezado) | Lo que escriben las tools de acción: `aplicar_plan_pago`, `crear_tope_gasto`, `crear_apartado`, `rebalancear`. Truncar esta tabla = reiniciar la demo |

**Total: \~3,500 filas en 22 archivos.**

## Convenciones de los CSV

- UTF-8 **sin BOM**, encabezado en la primera línea, separador `,`, comillas dobles solo cuando hace falta, salto de línea `\n`.
- **Montos enteros en centavos** (`BIGINT`), nunca decimales; columna `moneda` = `MXN`.
- Fechas `YYYY-MM-DD`, timestamps ISO 8601 con offset `-06:00`.
- Booleanos `true`/`false`; `NULL` = campo vacío.
- **Ids estables y legibles**: `usr_ana`, `cta_ana_nomina`, `tar_beto_clasica`, `mov_000487`, `cred_beto_tdc`, `inst_cetes_28`, `pos_carmen_003`. Nunca UUIDs.
- Porcentajes como `NUMERIC(7,4)` en decimal (`0.3690` = 36.90 %), no como texto.

## Entregables además de los CSV

1. **`db/schema.sql`** — DDL de las 22 tablas con PKs, FKs, `CHECK` en enums y los índices que las tools van a necesitar (`movimientos(usuario_id, fecha)`, `precios_historicos(instrumento_id, fecha)`).
2. **`db/cargar.sql`** — los 22 `\copy` en orden de dependencia, para que la carga sea un solo comando.
3. **`db/reiniciar.sql`** — `TRUNCATE acciones_aplicadas` + restaurar saldos, para dejar la demo limpia entre ensayos.
4. **Generador determinista** `scripts/generar-datos.ts` con semilla fija: mismo comando, mismos bytes. Los CSV **se commitean**; la demo no depende de correr el script.
5. **Test de integridad**: toda FK resuelve, montos enteros, `saldo_posterior` coherente con la secuencia de movimientos, cada amortización cierra en saldo 0, los `peso_pct` de cada portafolio suman 100, ningún movimiento sin categoría válida.

## Desviaciones que hay que registrar

La skill `datos-mock` y `CLAUDE.md` hoy describen algo distinto y quedarían mintiendo:

| Dice hoy                 | Va a decir                                |
| ------------------------ | ----------------------------------------- |
| JSON en `apps/mcp/data/` | CSV en `db/datos/` + Postgres como fuente |
| **Un** usuario demo      | **Tres** perfiles                         |
| **6** meses de historial | **12** meses                              |
| 4 archivos de datos      | 22 archivos                               |

Se corrigen en el mismo commit, y Postgres como dependencia nueva necesita **ADR 0005** (ni el 0001 ni el 0002 mencionan base de datos: hoy el contrato asume mocks en memoria). Nota de riesgo: mover el mock a Postgres añade una dependencia a la ruta crítica de la demo, así que las tools deben conservar un fallback a CSV en memoria si la conexión falla — con eso el flag `FEATURE_POSTGRES` apagado deja la demo idéntica.

## Lo que este plan NO incluye

- Pagos (transferencias, cobros, conciliación) y Seguros (cotización, coberturas, siniestros): sin filas en esta tanda.
- Las tools MCP que leen estas tablas (va por skill `tool-mcp`) ni los schemas Zod (skill `cambiar-schema`).
- El despliegue del Postgres: tú cargas los CSV.
