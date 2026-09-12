-- Reto Banorte — Hack Monterrey 2026
-- Esquema de los datos mock. Ver ADR 0005 y docs/como-funciona/datos-mock.md.
--
-- Convenciones:
--   * Todo monto es BIGINT en CENTAVOS. Nunca NUMERIC para dinero.
--   * Todo porcentaje es NUMERIC(7,4) en decimal: 0.3690 = 36.90 %.
--   * Ids son TEXT legibles y estables (usr_ana, mov_000487), nunca UUID.
--   * Fechas DATE; los timestamps llevan zona (America/Monterrey, -06:00).
--
-- Territorios cubiertos: Credito, Banca personal + Educacion financiera, Inversiones.
-- Pagos y Seguros quedan fuera de esta tanda a proposito (ADR 0005).

DROP SCHEMA IF EXISTS banorte CASCADE;
CREATE SCHEMA banorte;
SET search_path TO banorte;

-- ===========================================================================
-- NUCLEO
-- ===========================================================================

CREATE TABLE usuarios (
    id                        TEXT PRIMARY KEY,
    nombre                    TEXT        NOT NULL,
    fecha_nacimiento          DATE        NOT NULL,
    edad                      SMALLINT    NOT NULL CHECK (edad BETWEEN 18 AND 100),
    rfc                       TEXT        NOT NULL,
    curp                      TEXT        NOT NULL,
    ocupacion                 TEXT        NOT NULL,
    -- Para Carmen (ingresos variables) es el promedio de los ultimos 12 meses.
    ingreso_mensual_centavos  BIGINT      NOT NULL CHECK (ingreso_mensual_centavos > 0),
    ingreso_es_variable       BOOLEAN     NOT NULL DEFAULT false,
    estado_civil              TEXT        NOT NULL CHECK (estado_civil IN ('soltero','casado','union_libre','divorciado','viudo')),
    dependientes              SMALLINT    NOT NULL CHECK (dependientes >= 0),
    ciudad                    TEXT        NOT NULL,
    estado                    TEXT        NOT NULL,
    segmento                  TEXT        NOT NULL CHECK (segmento IN ('nomina','preferente','patrimonial')),
    cliente_desde             DATE        NOT NULL,
    correo                    TEXT        NOT NULL,
    telefono                  TEXT        NOT NULL
);

CREATE TABLE cuentas (
    id                  TEXT PRIMARY KEY,
    usuario_id          TEXT     NOT NULL REFERENCES usuarios(id),
    tipo                TEXT     NOT NULL CHECK (tipo IN ('nomina','ahorro','inversion','credito')),
    alias               TEXT     NOT NULL,
    clabe               TEXT     NOT NULL CHECK (clabe ~ '^000[0-9]{15}$'),  -- CLABE falsa a la vista
    numero_mascara      TEXT     NOT NULL,
    -- En cuentas de credito el saldo es la deuda, y por eso puede ser negativo.
    saldo_centavos      BIGINT   NOT NULL,
    moneda              CHAR(3)  NOT NULL DEFAULT 'MXN' CHECK (moneda = 'MXN'),
    fecha_apertura      DATE     NOT NULL,
    estatus             TEXT     NOT NULL CHECK (estatus IN ('activa','inactiva','bloqueada')),
    es_principal        BOOLEAN  NOT NULL DEFAULT false
);

CREATE INDEX ix_cuentas_usuario ON cuentas (usuario_id, tipo);

CREATE TABLE tarjetas (
    id                     TEXT PRIMARY KEY,
    cuenta_id              TEXT          NOT NULL REFERENCES cuentas(id),
    usuario_id             TEXT          NOT NULL REFERENCES usuarios(id),
    marca                  TEXT          NOT NULL CHECK (marca IN ('visa','mastercard')),
    producto               TEXT          NOT NULL,
    mascara                TEXT          NOT NULL,     -- '•••• 4821'
    tipo                   TEXT          NOT NULL CHECK (tipo IN ('debito','credito')),
    limite_centavos        BIGINT        NOT NULL CHECK (limite_centavos >= 0),
    saldo_centavos         BIGINT        NOT NULL CHECK (saldo_centavos >= 0),
    tasa_anual             NUMERIC(7,4)  NOT NULL CHECK (tasa_anual >= 0),
    cat                    NUMERIC(7,4)  NOT NULL CHECK (cat >= 0),
    pago_minimo_centavos   BIGINT        NOT NULL CHECK (pago_minimo_centavos >= 0),
    pago_no_intereses_centavos BIGINT    NOT NULL CHECK (pago_no_intereses_centavos >= 0),
    dia_corte              SMALLINT      NOT NULL CHECK (dia_corte BETWEEN 1 AND 28),
    fecha_corte            DATE          NOT NULL,
    fecha_limite_pago      DATE          NOT NULL,
    dias_mora              SMALLINT      NOT NULL DEFAULT 0 CHECK (dias_mora >= 0),
    estatus                TEXT          NOT NULL CHECK (estatus IN ('activa','bloqueada','cancelada')),
    -- Una tarjeta no puede deber mas de su limite.
    CONSTRAINT ck_tarjeta_saldo_bajo_limite CHECK (tipo = 'debito' OR saldo_centavos <= limite_centavos)
);

CREATE INDEX ix_tarjetas_usuario ON tarjetas (usuario_id);

-- ===========================================================================
-- BANCA PERSONAL
-- ===========================================================================

CREATE TABLE categorias (
    id           TEXT PRIMARY KEY,
    nombre       TEXT     NOT NULL,
    grupo        TEXT     NOT NULL CHECK (grupo IN ('ingreso','vivienda','alimentacion','transporte','servicios','entretenimiento','salud','financiero','otros')),
    -- Divide el gasto en esencial vs discrecional: lo usa el diagnostico de habitos.
    es_esencial  BOOLEAN  NOT NULL,
    es_ingreso   BOOLEAN  NOT NULL DEFAULT false,
    color        TEXT     NOT NULL,
    icono        TEXT     NOT NULL
);

CREATE TABLE comercios (
    id            TEXT PRIMARY KEY,
    nombre        TEXT NOT NULL,          -- 'OXXO Garza Sada', con sucursal
    razon_social  TEXT NOT NULL,
    categoria_id  TEXT NOT NULL REFERENCES categorias(id),
    ciudad        TEXT,
    giro          TEXT NOT NULL
);

CREATE INDEX ix_comercios_categoria ON comercios (categoria_id);

CREATE TABLE movimientos (
    id                        TEXT PRIMARY KEY,
    cuenta_id                 TEXT     NOT NULL REFERENCES cuentas(id),
    usuario_id                TEXT     NOT NULL REFERENCES usuarios(id),
    fecha                     DATE     NOT NULL,
    fecha_valor               DATE     NOT NULL,
    tipo                      TEXT     NOT NULL CHECK (tipo IN ('cargo','abono')),
    monto_centavos            BIGINT   NOT NULL CHECK (monto_centavos > 0),  -- siempre positivo; el signo lo da `tipo`
    moneda                    CHAR(3)  NOT NULL DEFAULT 'MXN' CHECK (moneda = 'MXN'),
    categoria_id              TEXT     NOT NULL REFERENCES categorias(id),
    comercio_id               TEXT              REFERENCES comercios(id),
    descripcion               TEXT     NOT NULL,
    canal                     TEXT     NOT NULL CHECK (canal IN ('tarjeta','spei','domiciliacion','efectivo','app','sucursal','cajero')),
    referencia                TEXT     NOT NULL,
    es_recurrente             BOOLEAN  NOT NULL DEFAULT false,
    es_atipico                BOOLEAN  NOT NULL DEFAULT false,  -- lo que 'detectar anomalias' debe encontrar
    saldo_posterior_centavos  BIGINT   NOT NULL
);

-- El indice que mas van a pegar las tools de gasto por periodo.
CREATE INDEX ix_movimientos_usuario_fecha ON movimientos (usuario_id, fecha DESC);
CREATE INDEX ix_movimientos_cuenta_fecha  ON movimientos (cuenta_id, fecha DESC);
CREATE INDEX ix_movimientos_categoria     ON movimientos (usuario_id, categoria_id, fecha DESC);
CREATE INDEX ix_movimientos_atipicos      ON movimientos (usuario_id, fecha DESC) WHERE es_atipico;

CREATE TABLE suscripciones (
    id               TEXT PRIMARY KEY,
    usuario_id       TEXT     NOT NULL REFERENCES usuarios(id),
    cuenta_id        TEXT     NOT NULL REFERENCES cuentas(id),
    comercio_id      TEXT     NOT NULL REFERENCES comercios(id),
    concepto         TEXT     NOT NULL,
    monto_centavos   BIGINT   NOT NULL CHECK (monto_centavos > 0),
    dia_cargo        SMALLINT NOT NULL CHECK (dia_cargo BETWEEN 1 AND 28),
    periodicidad     TEXT     NOT NULL CHECK (periodicidad IN ('mensual','anual')),
    activa           BOOLEAN  NOT NULL DEFAULT true,
    fecha_inicio     DATE     NOT NULL,
    fecha_cancelacion DATE
);

CREATE INDEX ix_suscripciones_usuario ON suscripciones (usuario_id) WHERE activa;

-- ===========================================================================
-- CREDITO
-- ===========================================================================

CREATE TABLE productos_credito (
    id                         TEXT PRIMARY KEY,
    tipo                       TEXT          NOT NULL CHECK (tipo IN ('tarjeta','personal','nomina','auto','hipotecario')),
    nombre                     TEXT          NOT NULL,
    descripcion                TEXT          NOT NULL,
    tasa_anual_min             NUMERIC(7,4)  NOT NULL CHECK (tasa_anual_min >= 0),
    tasa_anual_max             NUMERIC(7,4)  NOT NULL,
    cat_promedio               NUMERIC(7,4)  NOT NULL,
    plazo_min_meses            SMALLINT      NOT NULL CHECK (plazo_min_meses > 0),
    plazo_max_meses            SMALLINT      NOT NULL,
    monto_min_centavos         BIGINT        NOT NULL CHECK (monto_min_centavos > 0),
    monto_max_centavos         BIGINT        NOT NULL,
    comision_apertura          NUMERIC(7,4)  NOT NULL CHECK (comision_apertura >= 0),
    ingreso_minimo_centavos    BIGINT        NOT NULL,
    score_minimo               SMALLINT      NOT NULL CHECK (score_minimo BETWEEN 300 AND 850),
    requiere_garantia          BOOLEAN       NOT NULL DEFAULT false,
    CONSTRAINT ck_producto_rango_tasa  CHECK (tasa_anual_max >= tasa_anual_min),
    CONSTRAINT ck_producto_rango_plazo CHECK (plazo_max_meses >= plazo_min_meses),
    CONSTRAINT ck_producto_rango_monto CHECK (monto_max_centavos >= monto_min_centavos)
);

CREATE TABLE creditos (
    id                          TEXT PRIMARY KEY,
    usuario_id                  TEXT          NOT NULL REFERENCES usuarios(id),
    producto_id                 TEXT          NOT NULL REFERENCES productos_credito(id),
    tarjeta_id                  TEXT                   REFERENCES tarjetas(id),  -- solo si tipo = tarjeta
    alias                       TEXT          NOT NULL,
    monto_original_centavos     BIGINT        NOT NULL CHECK (monto_original_centavos > 0),
    saldo_insoluto_centavos     BIGINT        NOT NULL CHECK (saldo_insoluto_centavos >= 0),
    tasa_anual                  NUMERIC(7,4)  NOT NULL CHECK (tasa_anual >= 0),
    cat                         NUMERIC(7,4)  NOT NULL,
    plazo_meses                 SMALLINT      NOT NULL CHECK (plazo_meses > 0),
    pagos_realizados            SMALLINT      NOT NULL CHECK (pagos_realizados >= 0),
    mensualidad_centavos        BIGINT        NOT NULL CHECK (mensualidad_centavos > 0),
    fecha_contratacion          DATE          NOT NULL,
    fecha_proximo_pago          DATE          NOT NULL,
    dias_mora                   SMALLINT      NOT NULL DEFAULT 0 CHECK (dias_mora >= 0),
    estatus                     TEXT          NOT NULL CHECK (estatus IN ('vigente','al_corriente','vencido','liquidado','reestructurado')),
    CONSTRAINT ck_credito_pagos_en_plazo CHECK (pagos_realizados <= plazo_meses),
    CONSTRAINT ck_credito_saldo_bajo_monto CHECK (saldo_insoluto_centavos <= monto_original_centavos)
);

CREATE INDEX ix_creditos_usuario ON creditos (usuario_id, estatus);

CREATE TABLE amortizaciones (
    credito_id                TEXT      NOT NULL REFERENCES creditos(id),
    numero_pago               SMALLINT  NOT NULL CHECK (numero_pago > 0),
    fecha                     DATE      NOT NULL,
    saldo_inicial_centavos    BIGINT    NOT NULL CHECK (saldo_inicial_centavos >= 0),
    capital_centavos          BIGINT    NOT NULL CHECK (capital_centavos >= 0),
    interes_centavos          BIGINT    NOT NULL CHECK (interes_centavos >= 0),
    iva_interes_centavos      BIGINT    NOT NULL CHECK (iva_interes_centavos >= 0),
    mensualidad_centavos      BIGINT    NOT NULL CHECK (mensualidad_centavos > 0),
    saldo_final_centavos      BIGINT    NOT NULL CHECK (saldo_final_centavos >= 0),
    estatus                   TEXT      NOT NULL CHECK (estatus IN ('pagado','pendiente','vencido')),
    fecha_pago                DATE,
    PRIMARY KEY (credito_id, numero_pago),
    -- La identidad que hace auditable la tabla: lo que entra cuadra con lo que sale.
    CONSTRAINT ck_amortizacion_cuadra CHECK (saldo_final_centavos = saldo_inicial_centavos - capital_centavos),
    CONSTRAINT ck_amortizacion_mensualidad CHECK (mensualidad_centavos = capital_centavos + interes_centavos + iva_interes_centavos)
);

CREATE INDEX ix_amortizaciones_pendientes ON amortizaciones (credito_id, fecha) WHERE estatus <> 'pagado';

CREATE TABLE planes_reestructura (
    id                          TEXT PRIMARY KEY,
    usuario_id                  TEXT          NOT NULL REFERENCES usuarios(id),
    tarjeta_id                  TEXT          NOT NULL REFERENCES tarjetas(id),
    plazo_meses                 SMALLINT      NOT NULL CHECK (plazo_meses > 0),
    saldo_a_diferir_centavos    BIGINT        NOT NULL CHECK (saldo_a_diferir_centavos > 0),
    tasa_anual                  NUMERIC(7,4)  NOT NULL CHECK (tasa_anual >= 0),
    cat                         NUMERIC(7,4)  NOT NULL,
    mensualidad_centavos        BIGINT        NOT NULL CHECK (mensualidad_centavos > 0),
    total_a_pagar_centavos      BIGINT        NOT NULL CHECK (total_a_pagar_centavos > 0),
    intereses_totales_centavos  BIGINT        NOT NULL CHECK (intereses_totales_centavos >= 0),
    -- Cuanto se ahorra contra seguir pagando el minimo: es el numero que vende la UI.
    ahorro_vs_minimo_centavos   BIGINT        NOT NULL,
    meses_vs_minimo             SMALLINT      NOT NULL,
    es_recomendado              BOOLEAN       NOT NULL DEFAULT false,
    vigente_hasta               DATE          NOT NULL,
    UNIQUE (tarjeta_id, plazo_meses)
);

CREATE TABLE buro (
    usuario_id                       TEXT PRIMARY KEY REFERENCES usuarios(id),
    score                            SMALLINT      NOT NULL CHECK (score BETWEEN 300 AND 850),
    calificacion                     TEXT          NOT NULL CHECK (calificacion IN ('excelente','bueno','regular','bajo','muy_bajo')),
    consultas_12m                    SMALLINT      NOT NULL CHECK (consultas_12m >= 0),
    cuentas_abiertas                 SMALLINT      NOT NULL CHECK (cuentas_abiertas >= 0),
    pagos_puntuales_pct              NUMERIC(7,4)  NOT NULL CHECK (pagos_puntuales_pct BETWEEN 0 AND 1),
    atrasos_12m                      SMALLINT      NOT NULL CHECK (atrasos_12m >= 0),
    deuda_total_centavos             BIGINT        NOT NULL CHECK (deuda_total_centavos >= 0),
    pago_mensual_comprometido_centavos BIGINT      NOT NULL CHECK (pago_mensual_comprometido_centavos >= 0),
    capacidad_pago_mensual_centavos  BIGINT        NOT NULL,
    nivel_endeudamiento_pct          NUMERIC(7,4)  NOT NULL CHECK (nivel_endeudamiento_pct >= 0),
    precalificado                    BOOLEAN       NOT NULL,
    precalificado_hasta_centavos     BIGINT        NOT NULL CHECK (precalificado_hasta_centavos >= 0),
    fecha_consulta                   DATE          NOT NULL
);

-- ===========================================================================
-- INVERSIONES
-- ===========================================================================

CREATE TABLE instrumentos (
    id                          TEXT PRIMARY KEY,
    nombre                      TEXT          NOT NULL,
    clave                       TEXT          NOT NULL,     -- 'CETES28', 'NAFTRAC'
    tipo                        TEXT          NOT NULL CHECK (tipo IN ('deuda_gubernamental','deuda_corporativa','pagare','fondo_deuda','fondo_renta_variable','etf','renta_variable')),
    emisora                     TEXT          NOT NULL,
    moneda                      CHAR(3)       NOT NULL DEFAULT 'MXN',
    plazo_dias                  SMALLINT,                   -- NULL en instrumentos sin vencimiento
    rendimiento_anual_esperado  NUMERIC(7,4)  NOT NULL,
    volatilidad_anual           NUMERIC(7,4)  NOT NULL CHECK (volatilidad_anual >= 0),
    riesgo                      SMALLINT      NOT NULL CHECK (riesgo BETWEEN 1 AND 5),
    liquidez                    TEXT          NOT NULL CHECK (liquidez IN ('inmediata','24h','48h','al_vencimiento')),
    monto_minimo_centavos       BIGINT        NOT NULL CHECK (monto_minimo_centavos > 0),
    precio_actual_centavos      BIGINT        NOT NULL CHECK (precio_actual_centavos > 0)
);

CREATE TABLE perfiles_inversion (
    usuario_id                TEXT PRIMARY KEY REFERENCES usuarios(id),
    perfil                    TEXT          NOT NULL CHECK (perfil IN ('conservador','moderado','agresivo')),
    puntaje_cuestionario      SMALLINT      NOT NULL CHECK (puntaje_cuestionario BETWEEN 0 AND 100),
    horizonte_meses           SMALLINT      NOT NULL CHECK (horizonte_meses > 0),
    tolerancia_perdida_pct    NUMERIC(7,4)  NOT NULL CHECK (tolerancia_perdida_pct BETWEEN 0 AND 1),
    objetivo                  TEXT          NOT NULL,
    experiencia               TEXT          NOT NULL CHECK (experiencia IN ('ninguna','basica','intermedia','avanzada')),
    fecha_perfilamiento       DATE          NOT NULL,
    vigente_hasta             DATE          NOT NULL,
    -- El ejecutivo de cuenta que atiende al cliente; NULL = autoservicio.
    ejecutivo                 TEXT
);

CREATE TABLE modelos_portafolio (
    perfil             TEXT          NOT NULL CHECK (perfil IN ('conservador','moderado','agresivo')),
    instrumento_id     TEXT          NOT NULL REFERENCES instrumentos(id),
    peso_objetivo_pct  NUMERIC(7,4)  NOT NULL CHECK (peso_objetivo_pct > 0 AND peso_objetivo_pct <= 1),
    PRIMARY KEY (perfil, instrumento_id)
);

CREATE TABLE portafolios (
    id                                TEXT PRIMARY KEY,
    usuario_id                        TEXT          NOT NULL REFERENCES usuarios(id),
    cuenta_id                         TEXT          NOT NULL REFERENCES cuentas(id),
    nombre                            TEXT          NOT NULL,
    perfil                            TEXT          NOT NULL CHECK (perfil IN ('conservador','moderado','agresivo')),
    valor_actual_centavos             BIGINT        NOT NULL CHECK (valor_actual_centavos >= 0),
    aportado_centavos                 BIGINT        NOT NULL CHECK (aportado_centavos >= 0),
    rendimiento_acumulado_centavos    BIGINT        NOT NULL,   -- puede ser negativo
    rendimiento_pct                   NUMERIC(7,4)  NOT NULL,
    fecha_apertura                    DATE          NOT NULL,
    estatus                           TEXT          NOT NULL CHECK (estatus IN ('activo','cerrado')),
    -- Cuanto se desvia de su modelo objetivo: dispara la sugerencia de rebalanceo.
    desviacion_modelo_pct             NUMERIC(7,4)  NOT NULL CHECK (desviacion_modelo_pct >= 0),
    CONSTRAINT ck_portafolio_cuadra CHECK (valor_actual_centavos = aportado_centavos + rendimiento_acumulado_centavos)
);

CREATE INDEX ix_portafolios_usuario ON portafolios (usuario_id);

CREATE TABLE posiciones (
    id                                TEXT PRIMARY KEY,
    portafolio_id                     TEXT          NOT NULL REFERENCES portafolios(id),
    instrumento_id                    TEXT          NOT NULL REFERENCES instrumentos(id),
    titulos                           NUMERIC(18,6) NOT NULL CHECK (titulos > 0),
    precio_promedio_compra_centavos   BIGINT        NOT NULL CHECK (precio_promedio_compra_centavos > 0),
    precio_actual_centavos            BIGINT        NOT NULL CHECK (precio_actual_centavos > 0),
    costo_centavos                    BIGINT        NOT NULL CHECK (costo_centavos > 0),
    valor_mercado_centavos            BIGINT        NOT NULL CHECK (valor_mercado_centavos >= 0),
    plusvalia_centavos                BIGINT        NOT NULL,   -- negativa si hay minusvalia
    peso_pct                          NUMERIC(7,4)  NOT NULL CHECK (peso_pct > 0 AND peso_pct <= 1),
    peso_objetivo_pct                 NUMERIC(7,4)  NOT NULL,
    fecha_compra                      DATE          NOT NULL,
    UNIQUE (portafolio_id, instrumento_id),
    CONSTRAINT ck_posicion_plusvalia CHECK (plusvalia_centavos = valor_mercado_centavos - costo_centavos)
);

CREATE INDEX ix_posiciones_portafolio ON posiciones (portafolio_id);

CREATE TABLE precios_historicos (
    instrumento_id          TEXT      NOT NULL REFERENCES instrumentos(id),
    fecha                   DATE      NOT NULL,
    precio_cierre_centavos  BIGINT    NOT NULL CHECK (precio_cierre_centavos > 0),
    variacion_pct           NUMERIC(9,6) NOT NULL,
    PRIMARY KEY (instrumento_id, fecha)
);

CREATE INDEX ix_precios_fecha ON precios_historicos (fecha DESC);

-- ===========================================================================
-- EDUCACION FINANCIERA
-- ===========================================================================

CREATE TABLE metas (
    id                            TEXT PRIMARY KEY,
    usuario_id                    TEXT     NOT NULL REFERENCES usuarios(id),
    cuenta_origen_id              TEXT     NOT NULL REFERENCES cuentas(id),
    nombre                        TEXT     NOT NULL,
    monto_objetivo_centavos       BIGINT   NOT NULL CHECK (monto_objetivo_centavos > 0),
    monto_actual_centavos         BIGINT   NOT NULL CHECK (monto_actual_centavos >= 0),
    fecha_objetivo                DATE     NOT NULL,
    aportacion_sugerida_centavos  BIGINT   NOT NULL CHECK (aportacion_sugerida_centavos > 0),
    frecuencia                    TEXT     NOT NULL CHECK (frecuencia IN ('semanal','quincenal','mensual')),
    apartado_automatico           BOOLEAN  NOT NULL DEFAULT false,
    estatus                       TEXT     NOT NULL CHECK (estatus IN ('activa','cumplida','pausada','cancelada')),
    fecha_creacion                DATE     NOT NULL
);

CREATE INDEX ix_metas_usuario ON metas (usuario_id, estatus);

CREATE TABLE topes_gasto (
    id                       TEXT PRIMARY KEY,
    usuario_id               TEXT     NOT NULL REFERENCES usuarios(id),
    categoria_id             TEXT     NOT NULL REFERENCES categorias(id),
    monto_limite_centavos    BIGINT   NOT NULL CHECK (monto_limite_centavos > 0),
    periodo                  TEXT     NOT NULL CHECK (periodo IN ('semanal','mensual')),
    gastado_actual_centavos  BIGINT   NOT NULL CHECK (gastado_actual_centavos >= 0),
    alertar_en_pct           NUMERIC(7,4) NOT NULL CHECK (alertar_en_pct BETWEEN 0 AND 1),
    estatus                  TEXT     NOT NULL CHECK (estatus IN ('dentro','en_alerta','excedido','inactivo')),
    fecha_creacion           DATE     NOT NULL,
    UNIQUE (usuario_id, categoria_id, periodo)
);

CREATE TABLE diagnostico_habitos (
    usuario_id                  TEXT          NOT NULL REFERENCES usuarios(id),
    periodo                     CHAR(7)       NOT NULL,    -- 'YYYY-MM'
    ingreso_centavos            BIGINT        NOT NULL CHECK (ingreso_centavos >= 0),
    gasto_centavos              BIGINT        NOT NULL CHECK (gasto_centavos >= 0),
    ahorro_centavos             BIGINT        NOT NULL,     -- negativo = gasto mayor al ingreso
    tasa_ahorro_pct             NUMERIC(7,4)  NOT NULL,
    ratio_deuda_ingreso_pct     NUMERIC(7,4)  NOT NULL CHECK (ratio_deuda_ingreso_pct >= 0),
    gasto_esencial_pct          NUMERIC(7,4)  NOT NULL CHECK (gasto_esencial_pct BETWEEN 0 AND 1),
    gasto_discrecional_pct      NUMERIC(7,4)  NOT NULL CHECK (gasto_discrecional_pct BETWEEN 0 AND 1),
    meses_fondo_emergencia      NUMERIC(6,2)  NOT NULL CHECK (meses_fondo_emergencia >= 0),
    puntaje_salud               SMALLINT      NOT NULL CHECK (puntaje_salud BETWEEN 0 AND 100),
    habito_detectado            TEXT          NOT NULL,
    PRIMARY KEY (usuario_id, periodo)
);

-- ===========================================================================
-- ESTADO MUTABLE
-- ===========================================================================

-- Empieza VACIA. Es lo unico que escriben las tools de accion, y truncarla es
-- todo lo que hace falta para reiniciar la demo (db/reiniciar.sql).
CREATE TABLE acciones_aplicadas (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      TEXT        NOT NULL REFERENCES usuarios(id),
    accion          TEXT        NOT NULL CHECK (accion IN ('aplicar_plan_pago','crear_tope_gasto','crear_apartado','rebalancear')),
    objeto_tipo     TEXT        NOT NULL CHECK (objeto_tipo IN ('tarjeta','credito','categoria','meta','portafolio')),
    objeto_id       TEXT        NOT NULL,
    -- El `context` que llego en el mensaje `action` de A2UI, tal cual (ADR 0003).
    contexto        JSONB       NOT NULL,
    resultado       JSONB       NOT NULL,
    aplicada_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_acciones_usuario ON acciones_aplicadas (usuario_id, aplicada_en DESC);
