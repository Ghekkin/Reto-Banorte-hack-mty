---
verificado: 2026-09-13 15:55 (hora de Monterrey)
estado: construido
---

# Base de datos

Referencia completa del esquema `banorte`: las 22 tablas columna por columna, las 32
relaciones, los índices, las restricciones de negocio y cómo se carga y se opera.

Documentos hermanos: `datos-mock.md` explica **qué historia cuentan** los datos y quiénes
son los tres perfiles; este documento explica **cómo están guardados**. La decisión de usar
PostgreSQL **como única fuente** está en el ADR 0010 (reemplaza el mecanismo del 0007).

> **Alcance en disputa con el ADR 0004.** El ADR 0004 cierra su sección "Qué NO entra" con
> *"Inversiones con rendimiento variable. Más de dos usuarios demo."* Este esquema tiene un
> tercer perfil (Carmen) y seis tablas de Inversiones con precios variables. Son filas, no
> código: ninguna tool de las fases 1–3 las lee, así que no hay riesgo de que aparezcan en la
> demo por accidente. Pero **no tienen caso de uso asignado** y la decisión de dejarlas,
> adoptarlas o recortarlas está pendiente en
> `docs/issues/2026-09-12-alcance-datos-vs-adr-0004.md`.

## Para cualquiera

Los datos de la demo son 22 tablas dentro de una base PostgreSQL, agrupadas en cinco
bloques que corresponden a los territorios financieros que cubrimos:

- **Núcleo** — quién es cada cliente, qué cuentas tiene y qué tarjetas.
- **Banca personal** — sus movimientos (más de dos mil), las categorías de gasto, los
  comercios donde compra y sus suscripciones.
- **Crédito** — sus créditos vigentes, la tabla de pagos de cada uno, las ofertas de
  reestructura y su historial de buró.
- **Inversiones** — su perfil de riesgo, su portafolio, qué instrumentos tiene y cómo se
  han movido los precios el último año.
- **Educación financiera** — sus metas de ahorro, sus topes de gasto y un diagnóstico
  mensual de hábitos.

Hay una tabla número 23 en importancia y última en la lista: `acciones_aplicadas`. Empieza
vacía y es la única que el agente **escribe**. Cuando el usuario toca "Aplicar plan" en la
interfaz, ahí queda el registro. Vaciarla es todo lo que hace falta para dejar la demo como
estaba antes de un ensayo.

Dos cosas que valen la pena entender sin ser técnico:

**El dinero se guarda en centavos, como números enteros.** $187.50 se guarda como `18750`.
Suena raro, pero es la práctica estándar en software financiero: los decimales acumulan
errores de redondeo y basta uno para que una suma no cuadre y alguien pierda una hora
buscando por qué.

**La base se protege a sí misma.** Cada tabla lleva reglas que rechazan datos imposibles: un
movimiento con monto negativo, un crédito que debe más de lo que se prestó, una tabla de
pagos que no cierra en cero, un portafolio cuyas partes no suman el total. Si alguien
intenta meter algo incoherente, la base lo rechaza en vez de guardarlo. Eso importa porque
lo que sale en pantalla se calcula a partir de estos datos: si están mal, el agente miente
con seguridad.

## Técnico

### Datos de conexión

| | |
|---|---|
| Motor | PostgreSQL |
| Esquema | `banorte` (no `public`) |
| Variable de entorno | `DATABASE_URL` en `.env` (plantilla en `.env.example`) |
| Codificación esperada | UTF-8 |
| Zona horaria del dominio | `America/Monterrey` (−06:00) |

El esquema es `banorte` y no `public` a propósito: permite tirarlo y rehacerlo completo con
un `DROP SCHEMA ... CASCADE` sin tocar nada más de la base, que es justo lo que hace
`db/schema.sql` en su primera línea.

**Al 2026-09-12 10:40 los datos no están cargados**: el puerto de Postgres no es alcanzable
desde la máquina de desarrollo. Ver `docs/issues/2026-09-12-postgres-remoto-inalcanzable.md`.

### Convenciones de tipos

| Concepto | Tipo | Por qué |
|---|---|---|
| Dinero | `BIGINT`, sufijo `_centavos` | Enteros en centavos. Nunca `FLOAT` ni `NUMERIC` para dinero: el redondeo binario rompe las sumas |
| Porcentajes y tasas | `NUMERIC(7,4)`, sufijo `_pct` o nombre de tasa | Decimal, no texto: `0.4890` es 48.90 % |
| Variación diaria de precio | `NUMERIC(9,6)` | Necesita más decimales que un porcentaje de negocio |
| Títulos de un instrumento | `NUMERIC(18,6)` | Fracciones de título son normales en fondos |
| Ids | `TEXT` legible y estable | `usr_ana`, `mov_001869`, `cred_beto_tdc`. Nunca UUID: en la demo se leen en voz alta y salen en los logs |
| Fechas | `DATE` | Sin hora: el dominio es de días, no de instantes |
| Marcas de tiempo | `TIMESTAMPTZ` | Solo en `acciones_aplicadas.aplicada_en` |
| Enumeraciones | `TEXT` + `CHECK (x IN (...))` | En vez de `CREATE TYPE`: agregar un valor es un `ALTER TABLE` de una línea, no una migración de tipo |
| Periodo mensual | `CHAR(7)` con formato `YYYY-MM` | Se ordena bien como texto y se lee directo |
| Moneda | `CHAR(3)` con `CHECK (moneda = 'MXN')` | Explícita en toda tabla con dinero, aunque hoy solo haya una |

`TEXT` en lugar de `VARCHAR(n)`: en PostgreSQL son el mismo tipo internamente y `TEXT` evita
elegir un límite arbitrario que después estorba.

### Mapa de relaciones

```
usuarios ─┬─→ cuentas ─┬─→ tarjetas ──→ creditos ──→ amortizaciones
          │            │              └→ planes_reestructura
          │            ├─→ movimientos ──→ categorias ←── comercios
          │            ├─→ suscripciones ──→ comercios
          │            ├─→ portafolios ──→ posiciones ──→ instrumentos
          │            └─→ metas
          ├─→ buro
          ├─→ perfiles_inversion
          ├─→ topes_gasto ──→ categorias
          ├─→ diagnostico_habitos
          └─→ acciones_aplicadas

productos_credito ──→ creditos
instrumentos ─┬─→ precios_historicos
              └─→ modelos_portafolio
```

32 relaciones de clave foránea en total. `scripts/validar-datos.mjs` las verifica todas
sobre los CSV **antes** de cargar, para que un error de referencia no se descubra a media
carga.

---

## Bloque 1 · Núcleo

### `usuarios` — 3 filas

Los tres perfiles demo. PK `id`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `usr_ana`, `usr_beto`, `usr_carmen` |
| `nombre` | `TEXT` | `NOT NULL`. Inventado; ningún parecido con nadie real |
| `fecha_nacimiento` | `DATE` | `NOT NULL` |
| `edad` | `SMALLINT` | `CHECK BETWEEN 18 AND 100` |
| `rfc` | `TEXT` | `NOT NULL`. Patrón visiblemente falso |
| `curp` | `TEXT` | `NOT NULL`. Patrón visiblemente falso |
| `ocupacion` | `TEXT` | `NOT NULL` |
| `ingreso_mensual_centavos` | `BIGINT` | `CHECK > 0`. En ingresos variables es el promedio de 12 meses |
| `ingreso_es_variable` | `BOOLEAN` | `DEFAULT false`. `true` solo en Carmen |
| `estado_civil` | `TEXT` | `soltero` \| `casado` \| `union_libre` \| `divorciado` \| `viudo` |
| `dependientes` | `SMALLINT` | `CHECK >= 0` |
| `ciudad`, `estado` | `TEXT` | `NOT NULL`. Todo en Nuevo León |
| `segmento` | `TEXT` | `nomina` \| `preferente` \| `patrimonial` |
| `cliente_desde` | `DATE` | `NOT NULL` |
| `correo`, `telefono` | `TEXT` | `NOT NULL`. Dominio `@ejemplo.mx` |

### `cuentas` — 10 filas

FK → `usuarios`. Índice `ix_cuentas_usuario (usuario_id, tipo)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `cta_ana_nomina` |
| `usuario_id` | `TEXT` | FK → `usuarios(id)` |
| `tipo` | `TEXT` | `nomina` \| `ahorro` \| `inversion` \| `credito` |
| `alias` | `TEXT` | `NOT NULL`. Lo que ve el usuario |
| `clabe` | `TEXT` | `CHECK ~ '^000[0-9]{15}$'`. El prefijo `000` no existe en el catálogo del Banco de México: garantiza que ninguna CLABE apunte a una cuenta real |
| `numero_mascara` | `TEXT` | `NOT NULL` |
| `saldo_centavos` | `BIGINT` | **Sin `CHECK`**: en cuentas de crédito el saldo es la deuda y va negativo |
| `moneda` | `CHAR(3)` | `DEFAULT 'MXN'`, `CHECK = 'MXN'` |
| `fecha_apertura` | `DATE` | `NOT NULL` |
| `estatus` | `TEXT` | `activa` \| `inactiva` \| `bloqueada` |
| `es_principal` | `BOOLEAN` | `DEFAULT false`. Una por usuario; es la que usa el reporte de flujo |

### `tarjetas` — 4 filas

FK → `cuentas`, `usuarios`. Índice `ix_tarjetas_usuario (usuario_id)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `tar_beto_clasica` |
| `cuenta_id` | `TEXT` | FK → `cuentas(id)` |
| `usuario_id` | `TEXT` | FK → `usuarios(id)`. Desnormalizado a propósito: casi toda consulta filtra por usuario y evita un join |
| `marca` | `TEXT` | `visa` \| `mastercard` |
| `producto` | `TEXT` | `NOT NULL`. "Tarjeta Clásica" |
| `mascara` | `TEXT` | `NOT NULL`. `•••• 4821` |
| `tipo` | `TEXT` | `debito` \| `credito` |
| `limite_centavos` | `BIGINT` | `CHECK >= 0`. Cero en débito |
| `saldo_centavos` | `BIGINT` | `CHECK >= 0`. Es la deuda, en positivo |
| `tasa_anual`, `cat` | `NUMERIC(7,4)` | `CHECK >= 0` |
| `pago_minimo_centavos` | `BIGINT` | `CHECK >= 0`. Intereses con IVA + 1.5 % del capital |
| `pago_no_intereses_centavos` | `BIGINT` | `CHECK >= 0`. Lo que hay que pagar para no generar intereses |
| `dia_corte` | `SMALLINT` | `CHECK BETWEEN 1 AND 28`. El 28 como techo evita el problema de febrero |
| `fecha_corte`, `fecha_limite_pago` | `DATE` | `NOT NULL` |
| `dias_mora` | `SMALLINT` | `DEFAULT 0`, `CHECK >= 0` |
| `estatus` | `TEXT` | `activa` \| `bloqueada` \| `cancelada` |

**`ck_tarjeta_saldo_bajo_limite`** — `tipo = 'debito' OR saldo <= limite`. Una tarjeta de
crédito no puede deber más que su límite; las de débito quedan exentas porque su límite es 0.

---

## Bloque 2 · Banca personal

### `categorias` — 18 filas

Catálogo escrito a mano. PK `id`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `cat_restaurantes` |
| `nombre` | `TEXT` | `NOT NULL`. Lo que se muestra en la gráfica |
| `grupo` | `TEXT` | `ingreso` \| `vivienda` \| `alimentacion` \| `transporte` \| `servicios` \| `entretenimiento` \| `salud` \| `financiero` \| `otros` |
| `es_esencial` | `BOOLEAN` | `NOT NULL`. Divide esencial vs. discrecional en el diagnóstico. Intereses y comisiones cuentan como esencial: el usuario no puede dejar de pagarlos |
| `es_ingreso` | `BOOLEAN` | `DEFAULT false`. Nómina, honorarios, rendimientos |
| `color` | `TEXT` | `NOT NULL`. Hex, para que la gráfica no invente colores |
| `icono` | `TEXT` | `NOT NULL`. Nombre del icono en el catálogo A2UI |

### `comercios` — 53 filas

FK → `categorias`. Índice `ix_comercios_categoria`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `com_oxxo_garza_sada` |
| `nombre` | `TEXT` | `NOT NULL`. **Con sucursal**: "HEB Valle Oriente", no "HEB" |
| `razon_social` | `TEXT` | `NOT NULL`. Como aparecería en un estado de cuenta real |
| `categoria_id` | `TEXT` | FK → `categorias(id)` |
| `ciudad` | `TEXT` | **Nullable**: Uber, Netflix y Amazon no tienen sucursal |
| `giro` | `TEXT` | `NOT NULL`. Determina el canal de pago admisible: nadie paga Mercado Libre en efectivo |

### `movimientos` — 2 265 filas

La tabla que sostiene la demo. FK → `cuentas`, `usuarios`, `categorias`, `comercios`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `mov_001869`, o `mov_atip_004` en los atípicos |
| `cuenta_id` | `TEXT` | FK → `cuentas(id)` |
| `usuario_id` | `TEXT` | FK → `usuarios(id)`. Desnormalizado: es el filtro más frecuente |
| `fecha` | `DATE` | `NOT NULL`. Fecha de operación |
| `fecha_valor` | `DATE` | `NOT NULL`. Fecha de aplicación; hoy siempre igual a `fecha` |
| `tipo` | `TEXT` | `cargo` \| `abono` |
| `monto_centavos` | `BIGINT` | `CHECK > 0`. **Siempre positivo**: el signo lo da `tipo`. Evita la pregunta de si un cargo se guarda en negativo |
| `moneda` | `CHAR(3)` | `CHECK = 'MXN'` |
| `categoria_id` | `TEXT` | FK → `categorias(id)`. `NOT NULL`: no hay movimientos sin categorizar |
| `comercio_id` | `TEXT` | FK → `comercios(id)`. **Nullable**: una nómina o una renta no tienen comercio |
| `descripcion` | `TEXT` | `NOT NULL`. El texto que se lee en pantalla |
| `canal` | `TEXT` | `tarjeta` \| `spei` \| `domiciliacion` \| `efectivo` \| `app` \| `sucursal` \| `cajero` |
| `referencia` | `TEXT` | `NOT NULL`. `COM000000123` |
| `es_recurrente` | `BOOLEAN` | `DEFAULT false`. Renta, suscripciones, nómina |
| `es_atipico` | `BOOLEAN` | `DEFAULT false`. **Sin esto, "detectar anomalías" no tiene qué detectar.** 8 filas en total |
| `saldo_posterior_centavos` | `BIGINT` | `NOT NULL`. Saldo de la cuenta después de este movimiento |

**Índices** — son los que la demo va a pegar de verdad:

| Índice | Definición | Para qué |
|---|---|---|
| `ix_movimientos_usuario_fecha` | `(usuario_id, fecha DESC)` | "Mis movimientos del mes" |
| `ix_movimientos_cuenta_fecha` | `(cuenta_id, fecha DESC)` | Estado de cuenta y encadenamiento de saldos |
| `ix_movimientos_categoria` | `(usuario_id, categoria_id, fecha DESC)` | Gasto por categoría |
| `ix_movimientos_atipicos` | `(usuario_id, fecha DESC) WHERE es_atipico` | Índice **parcial**: 8 de 2 265 filas, así que ocupa nada y responde inmediato |

`saldo_posterior_centavos` es una **desnormalización deliberada**: se podría calcular con
una suma acumulada por ventana, pero cada consulta de movimientos tendría que recorrer todo
el historial de la cuenta. Está materializado y `validar-datos.mjs` verifica que encadene
movimiento a movimiento y que el último coincida con `cuentas.saldo_centavos`.

### `suscripciones` — 15 filas

FK → `usuarios`, `cuentas`, `comercios`. Índice parcial `ix_suscripciones_usuario (usuario_id) WHERE activa`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `sus_ana_netflix` |
| `usuario_id`, `cuenta_id`, `comercio_id` | `TEXT` | FKs |
| `concepto` | `TEXT` | `NOT NULL`. "Netflix Estándar" |
| `monto_centavos` | `BIGINT` | `CHECK > 0` |
| `dia_cargo` | `SMALLINT` | `CHECK BETWEEN 1 AND 28` |
| `periodicidad` | `TEXT` | `mensual` \| `anual` |
| `activa` | `BOOLEAN` | `DEFAULT true` |
| `fecha_inicio` | `DATE` | `NOT NULL` |
| `fecha_cancelacion` | `DATE` | **Nullable**. Beto canceló el gimnasio en marzo de 2026; el generador deja de cobrarlo desde esa fecha |

Esta tabla es la **declaración**; los cargos concretos están en `movimientos` con
`es_recurrente = true`. Están las dos porque la UI necesita listar "tus suscripciones" sin
deducirlas de un patrón en el historial.

---

## Bloque 3 · Crédito

### `productos_credito` — 8 filas

Catálogo ofertable, escrito a mano. PK `id`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `prod_hipotecario` |
| `tipo` | `TEXT` | `tarjeta` \| `personal` \| `nomina` \| `auto` \| `hipotecario` |
| `nombre`, `descripcion` | `TEXT` | `NOT NULL` |
| `tasa_anual_min`, `tasa_anual_max` | `NUMERIC(7,4)` | Rango ofertable |
| `cat_promedio` | `NUMERIC(7,4)` | `NOT NULL` |
| `plazo_min_meses`, `plazo_max_meses` | `SMALLINT` | `CHECK min > 0` |
| `monto_min_centavos`, `monto_max_centavos` | `BIGINT` | `CHECK min > 0` |
| `comision_apertura` | `NUMERIC(7,4)` | `CHECK >= 0`. Entra al cálculo del CAT |
| `ingreso_minimo_centavos` | `BIGINT` | `NOT NULL`. Filtro de precalificación |
| `score_minimo` | `SMALLINT` | `CHECK BETWEEN 300 AND 850`. Filtro de precalificación |
| `requiere_garantia` | `BOOLEAN` | `DEFAULT false` |

Tres `CHECK` de coherencia de rangos: `ck_producto_rango_tasa`, `ck_producto_rango_plazo`,
`ck_producto_rango_monto`, todos de la forma `max >= min`. `ingreso_minimo_centavos` y
`score_minimo` existen para que **la precalificación sea un filtro sobre esta tabla**, no un
número que el agente invente.

### `creditos` — 5 filas

FK → `usuarios`, `productos_credito`, `tarjetas`. Índice `ix_creditos_usuario (usuario_id, estatus)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `cred_beto_tdc` |
| `usuario_id`, `producto_id` | `TEXT` | FKs |
| `tarjeta_id` | `TEXT` | FK → `tarjetas(id)`. **Nullable**: solo en créditos revolventes. Si no es `NULL`, este crédito **no tiene** tabla de amortización |
| `alias` | `TEXT` | `NOT NULL` |
| `monto_original_centavos` | `BIGINT` | `CHECK > 0`. En revolventes es el límite |
| `saldo_insoluto_centavos` | `BIGINT` | `CHECK >= 0` |
| `tasa_anual`, `cat` | `NUMERIC(7,4)` | Derivados por el generador, no escritos a mano |
| `plazo_meses` | `SMALLINT` | `CHECK > 0`. `1` en revolventes |
| `pagos_realizados` | `SMALLINT` | `CHECK >= 0` |
| `mensualidad_centavos` | `BIGINT` | `CHECK > 0` |
| `fecha_contratacion`, `fecha_proximo_pago` | `DATE` | `NOT NULL` |
| `dias_mora` | `SMALLINT` | `DEFAULT 0` |
| `estatus` | `TEXT` | `vigente` \| `al_corriente` \| `vencido` \| `liquidado` \| `reestructurado` |

`ck_credito_pagos_en_plazo` (`pagos_realizados <= plazo_meses`) y
`ck_credito_saldo_bajo_monto` (`saldo_insoluto <= monto_original`).

### `amortizaciones` — 348 filas

PK compuesta `(credito_id, numero_pago)`. Índice parcial
`ix_amortizaciones_pendientes (credito_id, fecha) WHERE estatus <> 'pagado'`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `credito_id` | `TEXT` | FK → `creditos(id)`, parte de la PK |
| `numero_pago` | `SMALLINT` | `CHECK > 0`, parte de la PK |
| `fecha` | `DATE` | `NOT NULL` |
| `saldo_inicial_centavos` | `BIGINT` | `CHECK >= 0` |
| `capital_centavos` | `BIGINT` | `CHECK >= 0` |
| `interes_centavos` | `BIGINT` | `CHECK >= 0`. Sin IVA |
| `iva_interes_centavos` | `BIGINT` | `CHECK >= 0`. 16 % del interés |
| `mensualidad_centavos` | `BIGINT` | `CHECK > 0` |
| `saldo_final_centavos` | `BIGINT` | `CHECK >= 0` |
| `estatus` | `TEXT` | `pagado` \| `pendiente` \| `vencido` |
| `fecha_pago` | `DATE` | **Nullable**: solo en los pagados |

**Las dos identidades que hacen auditable la tabla**, y son `CHECK` de la base, no una
promesa del generador:

```sql
ck_amortizacion_cuadra       saldo_final = saldo_inicial - capital
ck_amortizacion_mensualidad  mensualidad = capital + interes + iva_interes
```

`validar-datos.mjs` añade lo que un `CHECK` de una fila no puede ver: que el primer
`saldo_inicial` sea el monto original, que la última fila cierre en **exactamente 0**, que
`creditos.saldo_insoluto_centavos` sea el saldo que la tabla deja tras `pagos_realizados`, y
que el número de filas `pagado` coincida con ese contador.

### `planes_reestructura` — 7 filas

Ofertas precalculadas. FK → `usuarios`, `tarjetas`. `UNIQUE (tarjeta_id, plazo_meses)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `plan_beto_clasica_18m` |
| `usuario_id`, `tarjeta_id` | `TEXT` | FKs |
| `plazo_meses` | `SMALLINT` | `CHECK > 0`. Beto 12/18/24/36; Carmen 6/12/18 |
| `saldo_a_diferir_centavos` | `BIGINT` | `CHECK > 0` |
| `tasa_anual`, `cat` | `NUMERIC(7,4)` | La tasa del plan, menor que la de la tarjeta |
| `mensualidad_centavos` | `BIGINT` | `CHECK > 0` |
| `total_a_pagar_centavos` | `BIGINT` | `CHECK > 0` |
| `intereses_totales_centavos` | `BIGINT` | `CHECK >= 0` |
| `ahorro_vs_minimo_centavos` | `BIGINT` | **Sin `CHECK`**: un plazo malo puede dar ahorro negativo, y eso es información, no un error |
| `meses_vs_minimo` | `SMALLINT` | Meses que se ahorra frente a pagar el mínimo |
| `es_recomendado` | `BOOLEAN` | `DEFAULT false`. Uno por tarjeta como máximo |
| `vigente_hasta` | `DATE` | `NOT NULL` |

`ahorro_vs_minimo_centavos` está **materializado** y no se calcula en la UI: es el número que
decide la conversación, así que vive donde se puede auditar.

### `buro` — 3 filas

Una fila por usuario; la PK **es** `usuario_id`, que fuerza la relación uno a uno.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `usuario_id` | `TEXT` | PK y FK → `usuarios(id)` |
| `score` | `SMALLINT` | `CHECK BETWEEN 300 AND 850`. Rango estándar |
| `calificacion` | `TEXT` | `excelente` \| `bueno` \| `regular` \| `bajo` \| `muy_bajo` |
| `consultas_12m`, `cuentas_abiertas`, `atrasos_12m` | `SMALLINT` | `CHECK >= 0` |
| `pagos_puntuales_pct` | `NUMERIC(7,4)` | `CHECK BETWEEN 0 AND 1` |
| `deuda_total_centavos` | `BIGINT` | `CHECK >= 0`. Suma de los saldos insolutos |
| `pago_mensual_comprometido_centavos` | `BIGINT` | `CHECK >= 0`. Suma de las mensualidades |
| `capacidad_pago_mensual_centavos` | `BIGINT` | **Sin `CHECK`**: es 35 % del ingreso menos lo comprometido, y puede ser negativa en alguien sobreendeudado |
| `nivel_endeudamiento_pct` | `NUMERIC(7,4)` | `CHECK >= 0` |
| `precalificado` | `BOOLEAN` | `NOT NULL`. Capacidad > $1,000, score ≥ 620 y sin atrasos |
| `precalificado_hasta_centavos` | `BIGINT` | `CHECK >= 0`. 24 mensualidades de la capacidad libre; `0` si no precalifica |
| `fecha_consulta` | `DATE` | `NOT NULL` |

---

## Bloque 4 · Inversiones

### `instrumentos` — 16 filas

Catálogo escrito a mano, con `precio_actual_centavos` derivado. PK `id`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `inst_cetes_28` |
| `nombre`, `clave`, `emisora` | `TEXT` | `NOT NULL`. `clave` es el ticker: `CETES28`, `NAFTRAC` |
| `tipo` | `TEXT` | `deuda_gubernamental` \| `deuda_corporativa` \| `pagare` \| `fondo_deuda` \| `fondo_renta_variable` \| `etf` \| `renta_variable` |
| `moneda` | `CHAR(3)` | `DEFAULT 'MXN'` |
| `plazo_dias` | `SMALLINT` | **Nullable**: los fondos y las acciones no vencen |
| `rendimiento_anual_esperado` | `NUMERIC(7,4)` | **Sin `CHECK`**: puede ser negativo |
| `volatilidad_anual` | `NUMERIC(7,4)` | `CHECK >= 0`. Genera la forma de la serie de precios |
| `riesgo` | `SMALLINT` | `CHECK BETWEEN 1 AND 5` |
| `liquidez` | `TEXT` | `inmediata` \| `24h` \| `48h` \| `al_vencimiento` |
| `monto_minimo_centavos` | `BIGINT` | `CHECK > 0` |
| `precio_actual_centavos` | `BIGINT` | `CHECK > 0`. **Debe ser el último cierre de `precios_historicos`**; lo verifica `validar-datos.mjs` |

### `perfiles_inversion` — 3 filas

PK `usuario_id`, uno a uno con `usuarios`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `usuario_id` | `TEXT` | PK y FK |
| `perfil` | `TEXT` | `conservador` \| `moderado` \| `agresivo` |
| `puntaje_cuestionario` | `SMALLINT` | `CHECK BETWEEN 0 AND 100` |
| `horizonte_meses` | `SMALLINT` | `CHECK > 0` |
| `tolerancia_perdida_pct` | `NUMERIC(7,4)` | `CHECK BETWEEN 0 AND 1` |
| `objetivo` | `TEXT` | `NOT NULL`. En palabras del cliente |
| `experiencia` | `TEXT` | `ninguna` \| `basica` \| `intermedia` \| `avanzada` |
| `fecha_perfilamiento`, `vigente_hasta` | `DATE` | `NOT NULL` |
| `ejecutivo` | `TEXT` | **Nullable**. `NULL` = autoservicio. **Esta columna habilita el escenario del ejecutivo de cuenta**: solo Carmen tiene una asignada |

Beto tiene perfil pero **no tiene portafolio**, a propósito: es el caso en que el agente debe
decir "primero salgamos de la deuda" en vez de vender un producto de inversión.

### `modelos_portafolio` — 24 filas

Asignación objetivo por perfil. PK compuesta `(perfil, instrumento_id)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `perfil` | `TEXT` | `conservador` \| `moderado` \| `agresivo`, parte de la PK |
| `instrumento_id` | `TEXT` | FK → `instrumentos(id)`, parte de la PK |
| `peso_objetivo_pct` | `NUMERIC(7,4)` | `CHECK > 0 AND <= 1` |

**Los pesos de cada perfil deben sumar exactamente 1.** Un `CHECK` no puede expresar una
condición que abarca varias filas, así que lo verifica `validar-datos.mjs`. Si no sumaran 1,
el rebalanceo propondría moverse a un objetivo imposible.

### `portafolios` — 2 filas

FK → `usuarios`, `cuentas`. Índice `ix_portafolios_usuario`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `port_carmen` |
| `usuario_id`, `cuenta_id` | `TEXT` | FKs |
| `nombre` | `TEXT` | `NOT NULL` |
| `perfil` | `TEXT` | `conservador` \| `moderado` \| `agresivo` |
| `valor_actual_centavos` | `BIGINT` | `CHECK >= 0`. Suma de las posiciones a mercado |
| `aportado_centavos` | `BIGINT` | `CHECK >= 0`. Suma de los costos |
| `rendimiento_acumulado_centavos` | `BIGINT` | **Sin `CHECK`**: puede ser negativo |
| `rendimiento_pct` | `NUMERIC(7,4)` | Puede ser negativo |
| `fecha_apertura` | `DATE` | `NOT NULL` |
| `estatus` | `TEXT` | `activo` \| `cerrado` |
| `desviacion_modelo_pct` | `NUMERIC(7,4)` | `CHECK >= 0`. Tracking error contra el modelo: **es lo que dispara la sugerencia de rebalanceo** |

**`ck_portafolio_cuadra`** — `valor_actual = aportado + rendimiento_acumulado`. Impide el
error clásico de actualizar el valor de mercado y olvidar el rendimiento.

### `posiciones` — 16 filas

FK → `portafolios`, `instrumentos`. `UNIQUE (portafolio_id, instrumento_id)`.
Índice `ix_posiciones_portafolio`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. `pos_003` |
| `portafolio_id`, `instrumento_id` | `TEXT` | FKs, únicos en conjunto |
| `titulos` | `NUMERIC(18,6)` | `CHECK > 0`. Fracciones son normales en fondos |
| `precio_promedio_compra_centavos` | `BIGINT` | `CHECK > 0` |
| `precio_actual_centavos` | `BIGINT` | `CHECK > 0`. Debe ser el último cierre del instrumento |
| `costo_centavos` | `BIGINT` | `CHECK > 0` |
| `valor_mercado_centavos` | `BIGINT` | `CHECK >= 0` |
| `plusvalia_centavos` | `BIGINT` | **Sin `CHECK`**: negativa si hay minusvalía |
| `peso_pct` | `NUMERIC(7,4)` | `CHECK > 0 AND <= 1`. Sobre valor de mercado |
| `peso_objetivo_pct` | `NUMERIC(7,4)` | Copiado del modelo del perfil, para comparar sin join |
| `fecha_compra` | `DATE` | `NOT NULL` |

**`ck_posicion_plusvalia`** — `plusvalia = valor_mercado - costo`. Además,
`validar-datos.mjs` verifica que los `peso_pct` de cada portafolio sumen 1 (tolerancia
0.0002 por el redondeo a cuatro decimales).

### `precios_historicos` — 848 filas

Serie semanal de 52 semanas + el punto inicial, por cada uno de los 16 instrumentos.
PK compuesta `(instrumento_id, fecha)`. Índice `ix_precios_fecha (fecha DESC)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `instrumento_id` | `TEXT` | FK → `instrumentos(id)`, parte de la PK |
| `fecha` | `DATE` | Parte de la PK. Lunes, desde 2025-09-15 |
| `precio_cierre_centavos` | `BIGINT` | `CHECK > 0` |
| `variacion_pct` | `NUMERIC(9,6)` | Variación contra el cierre anterior. `0` en el primer punto |

La PK compuesta **es** la restricción de unicidad que importa: no puede haber dos cierres
del mismo instrumento el mismo día.

---

## Bloque 5 · Educación financiera

### `metas` — 5 filas

FK → `usuarios`, `cuentas`. Índice `ix_metas_usuario (usuario_id, estatus)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. **Prefijo obligatorio `meta_base_`**, ver "Estado mutable" |
| `usuario_id`, `cuenta_origen_id` | `TEXT` | FKs |
| `nombre` | `TEXT` | `NOT NULL`. "Fondo de emergencia" |
| `monto_objetivo_centavos` | `BIGINT` | `CHECK > 0` |
| `monto_actual_centavos` | `BIGINT` | `CHECK >= 0` |
| `fecha_objetivo` | `DATE` | `NOT NULL` |
| `aportacion_sugerida_centavos` | `BIGINT` | `CHECK > 0` |
| `frecuencia` | `TEXT` | `semanal` \| `quincenal` \| `mensual` |
| `apartado_automatico` | `BOOLEAN` | `DEFAULT false`. Lo activa la acción `crear_apartado` |
| `estatus` | `TEXT` | `activa` \| `cumplida` \| `pausada` \| `cancelada` |
| `fecha_creacion` | `DATE` | `NOT NULL` |

### `topes_gasto` — 4 filas

FK → `usuarios`, `categorias`. `UNIQUE (usuario_id, categoria_id, periodo)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `TEXT` | PK. **Prefijo obligatorio `tope_base_`** |
| `usuario_id`, `categoria_id` | `TEXT` | FKs |
| `monto_limite_centavos` | `BIGINT` | `CHECK > 0` |
| `periodo` | `TEXT` | `semanal` \| `mensual` |
| `gastado_actual_centavos` | `BIGINT` | `CHECK >= 0`. Lo mueve la demo; `reiniciar.sql` lo vuelve a 0 |
| `alertar_en_pct` | `NUMERIC(7,4)` | `CHECK BETWEEN 0 AND 1`. Umbral de la barra de avance |
| `estatus` | `TEXT` | `dentro` \| `en_alerta` \| `excedido` \| `inactivo` |
| `fecha_creacion` | `DATE` | `NOT NULL` |

El `UNIQUE` impide dos topes de la misma categoría y periodo para el mismo usuario, que es
justo el error que la acción `crear_tope_gasto` podría cometer si se toca dos veces el botón.

### `diagnostico_habitos` — 33 filas

3 usuarios × 11 meses cerrados. PK compuesta `(usuario_id, periodo)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `usuario_id` | `TEXT` | FK, parte de la PK |
| `periodo` | `CHAR(7)` | `YYYY-MM`, parte de la PK |
| `ingreso_centavos`, `gasto_centavos` | `BIGINT` | `CHECK >= 0` |
| `ahorro_centavos` | `BIGINT` | **Sin `CHECK`**: negativo si gastó más de lo que ingresó |
| `tasa_ahorro_pct` | `NUMERIC(7,4)` | Puede ser negativa |
| `ratio_deuda_ingreso_pct` | `NUMERIC(7,4)` | `CHECK >= 0` |
| `gasto_esencial_pct`, `gasto_discrecional_pct` | `NUMERIC(7,4)` | `CHECK BETWEEN 0 AND 1`. Deben sumar 1 |
| `meses_fondo_emergencia` | `NUMERIC(6,2)` | `CHECK >= 0` |
| `puntaje_salud` | `SMALLINT` | `CHECK BETWEEN 0 AND 100` |
| `habito_detectado` | `TEXT` | `NOT NULL`. Frase lista para mostrar |

**El mes en curso no está.** La demo corre el día 12, así que septiembre tiene medio mes de
ingreso: incluirlo dispararía falsas alarmas del tipo "gastas más de lo que ingresas". La
pregunta "¿en qué se me fue el dinero este mes?" se responde leyendo `movimientos`, no esta
tabla.

---

## Estado mutable

### `acciones_aplicadas` — 0 filas al cargar

La **única** tabla que el agente escribe. Índice `ix_acciones_usuario (usuario_id, aplicada_en DESC)`.

| Columna | Tipo | Restricciones y notas |
|---|---|---|
| `id` | `BIGSERIAL` | PK. La genera Postgres |
| `usuario_id` | `TEXT` | FK → `usuarios(id)` |
| `accion` | `TEXT` | `aplicar_plan_pago` \| `crear_tope_gasto` \| `crear_apartado` \| `rebalancear` \| `cancelar_suscripcion` (0001) \| `rebalancear_portafolio` \| `confirmar_rebalanceo` (0003) \| `programar_abono_capital` (0005) \| `registrar_gasto_externo` (0006). `schema.sql` trae solo los cuatro primeros; las migraciones rehacen el `CHECK` completo |
| `objeto_tipo` | `TEXT` | `tarjeta` \| `credito` \| `categoria` \| `meta` \| `portafolio` \| `suscripcion` (0001) |
| `objeto_id` | `TEXT` | **Sin FK**: apunta a cinco tablas distintas según `objeto_tipo`. Una FK polimórfica no se puede declarar en SQL; la integridad la garantiza la tool que escribe |
| `contexto` | `JSONB` | `NOT NULL`. El `context` que llegó en el mensaje `action` de A2UI, tal cual (ADR 0003) |
| `resultado` | `JSONB` | `NOT NULL`. Lo que la tool devolvió |
| `aplicada_en` | `TIMESTAMPTZ` | `DEFAULT now()` |

`JSONB` y no `JSON`: se indexa y se consulta, y aquí no importa conservar el orden de las
llaves.

### `pantallas_inicio` — 0 filas al cargar (migración 0002)

La portada que Maya armó para cada persona (`docs/como-funciona/inicio-personalizado.md`).
Una fila por usuario; la escribe la web, no el MCP. `reiniciar.sql` no la toca: al
reiniciar cambia la `huella` y la portada queda desactualizada sola.

| Columna | Tipo | Notas |
|---|---|---|
| `usuario_id` | `TEXT` | PK, FK → `usuarios(id)` |
| `huella` | `TEXT` | Con qué datos se armó: `v1|c18|a:<acciones>|m:<movimientos>` (`lib/inicio/huella.ts`) |
| `mensajes` | `JSONB` | Los tres mensajes A2UI validados |
| `texto`, `razon` | `TEXT` | Lo que Maya dice y por qué esta portada |
| `sugerencias`, `tools` | `JSONB` | Arreglos de texto |
| `modelo`, `entrada_tokens`, `salida_tokens`, `cache_tokens`, `ms` | | Trazabilidad de la generación |
| `generada_en` | `TIMESTAMPTZ` | `DEFAULT now()` |

### Estado por dispositivo (migración 0007, ADR 0012)

Cada visitante de la demo tiene su propio estado (`docs/como-funciona/estado-por-dispositivo.md`):

| Cambio | Notas |
|---|---|
| `acciones_aplicadas.dispositivo_id` | `TEXT NOT NULL DEFAULT 'comun'`. El MCP filtra por el dispositivo de la llamada. En un dispositivo, `idempotency_key` se guarda como `<dispositivo>:<llave>` para que el índice único no choque entre visitantes. Índice `(dispositivo_id, usuario_id, id)` para la huella |
| `pantallas_por_dispositivo` | PK `(dispositivo_id, usuario_id)`, FK `usuario_id` → `usuarios(id)`. `huella TEXT`, `pantalla JSONB` (la portada completa, sin lo que va en columnas), `generada_en`, `ajustada_en`. La portada de un dispositivo que ya se apartó de la común; la común sigue en `pantallas_inicio`. `pnpm reiniciar-estado` la vacía |
| `corridas.dispositivo_id`, `conversaciones.dispositivo_id` | `TEXT`, `null` = estado común. Quién hizo qué |

Todo aditivo: el código anterior sigue funcionando contra la misma base.

## Historia (migración 0004)

Siete tablas que no son datos del negocio sino **lo que pasó**: `corridas`,
`corrida_pasos`, `corrida_tools` y `prompts` (cada turno y cada portada del modelo, con todo
su detalle), `conversaciones` y `mensajes_chat` (el chat), y `registros` (los logs de web,
agente, Inicio y MCP). Las columnas y cómo se escriben están en
`docs/como-funciona/corridas-en-db.md`; se leen con `pnpm corridas`.

Tres reglas que las distinguen del resto del esquema:

- **El MCP no las carga a memoria** (`TABLAS_DE_HISTORIA` en `apps/mcp/src/datos/postgres.ts`):
  crecen con cada turno y ninguna tool las lee.
- **No entran al volcado de pruebas** (`scripts/volcar-fixture.mjs`).
- **`reiniciar.sql` no las toca**: reiniciar la demo no borra la historia de los ensayos.

### El contrato del prefijo `_base_`

`db/reiniciar.sql` borra de `metas` y `topes_gasto` **todo lo que no lleve el prefijo
`meta_base_` / `tope_base_`**. La regla es simple: lo sembrado lleva prefijo, lo que creó una
acción durante un ensayo no.

Esto es frágil por naturaleza —es una convención de nombres, no una restricción de la base—
así que `validar-datos.mjs` **falla** si un dato sembrado no lleva su prefijo. Sin esa
comprobación, el primer reinicio se llevaría un dato base y nadie se daría cuenta hasta que
una pantalla apareciera vacía en la demo.

---

## Cargar y operar

La conexión sale de **`DATABASE_URL`** en `.env` (plantilla en `.env.example`).

Ya no hay "cargar": desde el ADR 0010 la base **es** la fuente y está cargada. Lo que
queda es cómo cambiarla y cómo recuperarla si alguien la vacía.

### Runbook

| Cuándo | Comando |
|---|---|
| Cambié el esquema | Escribe `db/migraciones/NNNN-loquesea.sql` y corre `pnpm datos:migrar` |
| Ver qué hay en la base | `psql "$DATABASE_URL" -c '\dt banorte.*'` |
| La base quedó vacía o a medias | `pnpm datos:restaurar` (o `--recrear` para vaciar y rellenar) |
| Cambié los datos y quiero que las pruebas lo vean | `pnpm datos:fixture` |
| Qué hizo el modelo en un turno, qué dijo el chat, qué falló | `pnpm corridas` (ver `corridas-en-db.md`) |
| **Antes de cada ensayo de demo** | `pnpm reiniciar-estado` |

Las migraciones son **idempotentes** (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`):
correrlas dos veces no hace daño, que es lo que uno necesita a las 3 am.

### TLS

La instancia del proyecto habla en claro dentro de la red del VPS y por el puerto 5437
hacia fuera. Si algún día se pone detrás de TLS con certificado propio, hay que decidir
qué hace `pg` con la verificación; hoy no se desactiva en ningún sitio.

---

## Decisiones de diseño y sus trade-offs

| Decisión | A favor | En contra |
|---|---|---|
| Esquema `banorte`, no `public` | Se tira y se rehace completo sin tocar el resto de la base | Toda consulta necesita el prefijo o `search_path` |
| Dinero en `BIGINT` de centavos | Sin errores de redondeo; sumas exactas | Hay que dividir entre 100 al presentar; un `SELECT` crudo se lee raro |
| Enums como `TEXT` + `CHECK` | Agregar un valor es un `ALTER` de una línea | Sin la seguridad de tipo de un `ENUM` nativo; se repite la lista en cada tabla |
| Ids `TEXT` legibles | Se leen en voz alta en la demo y en los logs; los datos se depuran a ojo | No sirve para producción con volumen; hay que generarlos sin colisión |
| `usuario_id` desnormalizado en `tarjetas` y `movimientos` | El filtro más frecuente evita un join | Puede quedar inconsistente con `cuenta_id`; nadie lo verifica hoy |
| `saldo_posterior_centavos` materializado | El estado de cuenta no recalcula el historial completo | Insertar un movimiento a media serie obliga a recalcular hacia adelante |
| `peso_objetivo_pct` copiado en `posiciones` | Comparar real vs. objetivo sin join a `modelos_portafolio` | Si cambia el modelo, las posiciones quedan desactualizadas |
| `ahorro_vs_minimo_centavos` precalculado | El número que vende la demo se audita en la base | Si cambia la fórmula del pago mínimo, hay que regenerar |
| `objeto_id` sin FK en `acciones_aplicadas` | Una sola tabla de bitácora para cinco tipos de objeto | FK polimórfica: la base **no** garantiza que el objeto exista |
| Sin triggers ni vistas | El esquema se entiende leyéndolo una vez; nada pasa "por magia" | Las invariantes entre tablas viven en un script de Node, no en la base |
| Prefijo `_base_` como contrato de reinicio | `reiniciar.sql` es cuatro líneas y corre en un segundo | Es una convención de nombres, no una restricción; se apoya en el validador |

### Lo que este esquema NO tiene

- **Sin fallback.** Es deliberado (ADR 0010): si la base no responde, el MCP no arranca.
  Un servidor que contesta sin datos se descubre en la demo.
- **Sin Pagos ni Seguros.** Nada de transferencias a terceros, cobros, conciliación,
  cotizaciones, coberturas ni siniestros. Sus tablas no existen y no se diseñaron: se
  agregan cuando haya un caso de uso que las pida (ADR 0007).
- **Migraciones mínimas.** `db/migraciones/` se aplica en orden con `pnpm datos:migrar` y
  cada archivo es idempotente, pero no hay tabla de versiones aplicadas ni rollback: se
  releen todas cada vez. Para 36 horas alcanza; en producción no.
- **Sin usuarios ni roles de base de datos.** Todo corre con el usuario de la cadena de
  conexión. Sin RLS, sin permisos por tabla, sin usuario de solo lectura para el MCP.
- **Sin auditoría de lectura.** `acciones_aplicadas` registra escrituras; nadie registra
  quién consultó qué.
- **Sin soft delete ni versionado de filas.** Nada guarda el estado anterior de un registro
  modificado.
- **Una sola moneda y una sola zona horaria.** La columna `moneda` existe y está restringida
  a `MXN`; el día que entre otra divisa habría que agregar tipos de cambio.

## Cómo se probó

| Comprobación | Herramienta | Resultado al 2026-09-13 15:55 |
|---|---|---|
| El esquema existe y tiene datos | `psql` / `pnpm datos:restaurar` | 22 tablas, 3 690 filas |
| El MCP arranca contra la base | `pnpm --filter @maya/mcp start` | `22 tablas desde postgres`, 15 tools |
| Las tools leen de la base | `pnpm humo` | Verde, incluido el ciclo de acción completo |
| Una acción se persiste | `aplicar_plan_pago` + `select` en `acciones_aplicadas` | 1 fila con su `idempotency_key` |
| El reinicio surte efecto sin reiniciar el servidor | `pnpm reiniciar-estado` + `consultar_plan` | `hayPlan: false` |
| 103 pruebas del MCP sin tocar la base | `pnpm --filter @maya/mcp test` | Verde, contra el volcado |

real**. Está verificado estructuralmente y los datos cumplen todas las restricciones que
declara, pero hasta que alguien corra `schema.sql` contra una base viva, un error de sintaxis
o un tipo mal elegido siguen siendo posibles.
