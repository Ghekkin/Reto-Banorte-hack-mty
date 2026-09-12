// Los tres perfiles demo: quienes son, sus cuentas, sus tarjetas y el patron de gasto
// que el generador va a materializar en movimientos.
//
// Nombres inventados. Ningun parecido con nadie del equipo ni con una persona real.
// CLABE de 18 digitos que empieza en 000 (rango inexistente en el catalogo del Banco de
// Mexico), tarjetas enmascaradas, RFC y CURP con patron visiblemente falso.
//
// Todo monto en CENTAVOS. Ver skill datos-mock y ADR 0005.

// La demo "hoy" es fija para que los datos no envejezcan: si dependiera de la fecha del
// sistema, los saldos y las moras cambiarian entre ensayos.
export const HOY = '2026-09-12';
export const MESES_HISTORIAL = 12;      // 2025-10 .. 2026-09

export const usuarios = [
  {
    id: 'usr_ana',
    nombre: 'Ana Sofía Treviño Cantú',
    fecha_nacimiento: '1998-04-17',
    edad: 28,
    rfc: 'TRCA980417XA1',
    curp: 'TRCA980417MNLRNN01',
    ocupacion: 'Diseñadora de producto',
    ingreso_mensual_centavos: 3200000,          // $32,000
    ingreso_es_variable: false,
    estado_civil: 'soltero',
    dependientes: 0,
    ciudad: 'Monterrey',
    estado: 'Nuevo León',
    segmento: 'nomina',
    cliente_desde: '2021-08-02',
    correo: 'ana.trevino@ejemplo.mx',
    telefono: '+52 81 1000 0001',
  },
  {
    id: 'usr_beto',
    nombre: 'Alberto Ramírez Solís',
    fecha_nacimiento: '1985-11-03',
    edad: 41,
    rfc: 'RASA851103XB2',
    curp: 'RASA851103HNLMLN02',
    ocupacion: 'Supervisor de logística',
    ingreso_mensual_centavos: 3450000,          // $34,500
    ingreso_es_variable: false,
    estado_civil: 'casado',
    dependientes: 2,
    ciudad: 'Guadalupe',
    estado: 'Nuevo León',
    segmento: 'nomina',
    cliente_desde: '2016-02-15',
    correo: 'alberto.ramirez@ejemplo.mx',
    telefono: '+52 81 1000 0002',
  },
  {
    id: 'usr_carmen',
    nombre: 'Carmen Elizondo Wong',
    fecha_nacimiento: '1974-06-28',
    edad: 52,
    rfc: 'ELWC740628XC3',
    curp: 'ELWC740628MNLLNR03',
    ocupacion: 'Arquitecta independiente',
    ingreso_mensual_centavos: 11500000,         // promedio 12 meses; real oscila 60k–165k
    ingreso_es_variable: true,
    estado_civil: 'divorciado',
    dependientes: 1,
    ciudad: 'San Pedro Garza García',
    estado: 'Nuevo León',
    segmento: 'patrimonial',
    cliente_desde: '2009-05-11',
    correo: 'carmen.elizondo@ejemplo.mx',
    telefono: '+52 81 1000 0003',
  },
];

// Los saldos son los de HOY, y el generador los toma como punto final: recorre los
// movimientos hacia atras para escribir `saldo_posterior_centavos` de forma coherente.
export const cuentas = [
  // Ana
  { id: 'cta_ana_nomina',     usuario_id: 'usr_ana',    tipo: 'nomina',    alias: 'Nómina Ana',              clabe: '000181000000000101', numero_mascara: '•••• 0101', saldo_centavos: 1842350,    fecha_apertura: '2021-08-02', estatus: 'activa',  es_principal: true  },
  { id: 'cta_ana_ahorro',     usuario_id: 'usr_ana',    tipo: 'ahorro',    alias: 'Ahorro Ana',              clabe: '000181000000000102', numero_mascara: '•••• 0102', saldo_centavos: 4815000,    fecha_apertura: '2023-01-19', estatus: 'activa',  es_principal: false },
  { id: 'cta_ana_inversion',  usuario_id: 'usr_ana',    tipo: 'inversion', alias: 'Inversión Ana',           clabe: '000181000000000103', numero_mascara: '•••• 0103', saldo_centavos: 2530000,    fecha_apertura: '2026-03-16', estatus: 'activa',  es_principal: false },
  // Beto
  { id: 'cta_beto_nomina',    usuario_id: 'usr_beto',   tipo: 'nomina',    alias: 'Nómina Beto',             clabe: '000181000000000201', numero_mascara: '•••• 0201', saldo_centavos: 218740,     fecha_apertura: '2016-02-15', estatus: 'activa',  es_principal: true  },
  { id: 'cta_beto_ahorro',    usuario_id: 'usr_beto',   tipo: 'ahorro',    alias: 'Ahorro Beto',             clabe: '000181000000000202', numero_mascara: '•••• 0202', saldo_centavos: 63200,      fecha_apertura: '2018-09-04', estatus: 'activa',  es_principal: false },
  { id: 'cta_beto_credito',   usuario_id: 'usr_beto',   tipo: 'credito',   alias: 'Tarjeta Clásica Beto',    clabe: '000181000000000203', numero_mascara: '•••• 4821', saldo_centavos: -4738600,   fecha_apertura: '2019-07-22', estatus: 'activa',  es_principal: false },
  // Carmen
  { id: 'cta_carmen_nomina',  usuario_id: 'usr_carmen', tipo: 'nomina',    alias: 'Cuenta Corriente Carmen', clabe: '000181000000000301', numero_mascara: '•••• 0301', saldo_centavos: 18734200,   fecha_apertura: '2009-05-11', estatus: 'activa',  es_principal: true  },
  { id: 'cta_carmen_ahorro',  usuario_id: 'usr_carmen', tipo: 'ahorro',    alias: 'Reserva Carmen',          clabe: '000181000000000302', numero_mascara: '•••• 0302', saldo_centavos: 48200000,   fecha_apertura: '2014-03-27', estatus: 'activa',  es_principal: false },
  { id: 'cta_carmen_inversion', usuario_id: 'usr_carmen', tipo: 'inversion', alias: 'Portafolio Carmen',     clabe: '000181000000000303', numero_mascara: '•••• 0303', saldo_centavos: 287450000,  fecha_apertura: '2016-01-15', estatus: 'activa',  es_principal: false },
  { id: 'cta_carmen_credito', usuario_id: 'usr_carmen', tipo: 'credito',   alias: 'Tarjeta Oro Carmen',      clabe: '000181000000000304', numero_mascara: '•••• 7712', saldo_centavos: -2841500,   fecha_apertura: '2011-10-08', estatus: 'activa',  es_principal: false },
];

// La tarjeta de Beto es el corazon del caso 1: 96 % de utilizacion, 12 dias de mora y
// un pago minimo que casi no toca capital. La de Carmen es la contraparte: usa mucho
// la tarjeta y la liquida cada mes, asi que la misma pregunta debe dar otra pantalla.
export const tarjetas = [
  {
    id: 'tar_ana_debito',   cuenta_id: 'cta_ana_nomina',    usuario_id: 'usr_ana',
    marca: 'visa',       producto: 'Débito Nómina',  mascara: '•••• 0101', tipo: 'debito',
    limite_centavos: 0, saldo_centavos: 0, tasa_anual: 0, cat: 0,
    pago_minimo_centavos: 0, pago_no_intereses_centavos: 0,
    dia_corte: 1, fecha_corte: '2026-09-01', fecha_limite_pago: '2026-09-01',
    dias_mora: 0, estatus: 'activa',
  },
  {
    id: 'tar_beto_clasica', cuenta_id: 'cta_beto_credito',  usuario_id: 'usr_beto',
    marca: 'mastercard', producto: 'Tarjeta Clásica', mascara: '•••• 4821', tipo: 'credito',
    limite_centavos: 4900000,          // $49,000
    saldo_centavos: 4738600,           // $47,386 → 96.7 % de utilizacion
    tasa_anual: 0.4890, cat: 0.6210,
    pago_minimo_centavos: 295073,      // intereses con IVA + 1.5 % de capital: casi no toca la deuda
    pago_no_intereses_centavos: 4738600,
    dia_corte: 5, fecha_corte: '2026-09-05', fecha_limite_pago: '2026-08-31',
    dias_mora: 12, estatus: 'activa',
  },
  {
    id: 'tar_carmen_oro',   cuenta_id: 'cta_carmen_credito', usuario_id: 'usr_carmen',
    marca: 'visa',       producto: 'Tarjeta Oro',     mascara: '•••• 7712', tipo: 'credito',
    limite_centavos: 25000000,         // $250,000
    saldo_centavos: 2841500,           // $28,415 → 11.4 %, y la paga completa
    tasa_anual: 0.3290, cat: 0.4980,
    pago_minimo_centavos: 132992,
    pago_no_intereses_centavos: 2841500,
    dia_corte: 20, fecha_corte: '2026-08-20', fecha_limite_pago: '2026-09-14',
    dias_mora: 0, estatus: 'activa',
  },
  {
    id: 'tar_carmen_debito', cuenta_id: 'cta_carmen_nomina', usuario_id: 'usr_carmen',
    marca: 'visa',       producto: 'Débito Preferente', mascara: '•••• 0301', tipo: 'debito',
    limite_centavos: 0, saldo_centavos: 0, tasa_anual: 0, cat: 0,
    pago_minimo_centavos: 0, pago_no_intereses_centavos: 0,
    dia_corte: 1, fecha_corte: '2026-09-01', fecha_limite_pago: '2026-09-01',
    dias_mora: 0, estatus: 'activa',
  },
];

// ===========================================================================
// Patrones de gasto
// ===========================================================================
// Esto es lo que le da forma al historial. Cada perfil define:
//   * ingresos fijos (nomina quincenal) o variables (honorarios de proyecto)
//   * cargos recurrentes con dia fijo (renta, servicios, colegiatura)
//   * gasto discrecional por categoria, como rango mensual y numero de compras
// El generador convierte esto en movimientos concretos con `sembrarAleatorio`.

export const patrones = {
  usr_ana: {
    cuenta_gasto: 'cta_ana_nomina',
    // El gasto discrecional se calibra con un factor global para que el flujo del mes
    // cuadre contra el ingreso. Sin esto los rangos por categoria, cada uno plausible por
    // separado, suman un gasto que ningun perfil podria sostener, y el saldo inicial que
    // el generador deduce sale absurdo. Ver docs/algoritmos/generacion-de-datos.md.
    factor_discrecional: 0.414,
    // Nomina quincenal: dia 15 y ultimo dia del mes.
    nomina: { dias: [15, 0], monto_centavos: 1600000, comercio_id: null, categoria_id: 'cat_nomina', descripcion: 'Depósito de nómina' },
    recurrentes: [
      { dia: 1,  categoria_id: 'cat_vivienda',   comercio_id: null,                monto_centavos: 850000, descripcion: 'Renta departamento Contry',  canal: 'spei' },
      { dia: 5,  categoria_id: 'cat_financiero', comercio_id: null,                monto_centavos: 457200, descripcion: 'Mensualidad crédito personal', canal: 'domiciliacion' },
      { dia: 8,  categoria_id: 'cat_servicios',  comercio_id: 'com_cfe',           monto_centavos: 68000,  variacion: 0.35, descripcion: 'CFE bimestral',     canal: 'domiciliacion' },
      { dia: 10, categoria_id: 'cat_servicios',  comercio_id: 'com_telmex',        monto_centavos: 62900,  descripcion: 'Internet Telmex',            canal: 'domiciliacion' },
      { dia: 12, categoria_id: 'cat_servicios',  comercio_id: 'com_telcel',        monto_centavos: 39900,  descripcion: 'Plan Telcel',                canal: 'domiciliacion' },
      { dia: 18, categoria_id: 'cat_servicios',  comercio_id: 'com_agua_drenaje',  monto_centavos: 31500,  variacion: 0.20, descripcion: 'Agua y Drenaje',    canal: 'domiciliacion' },
    ],
    discrecional: [
      { categoria_id: 'cat_super',           comercios: ['com_heb_valle', 'com_soriana_gonzalitos', 'com_walmart_lincoln'], compras: [4, 6],  monto: [45000, 145000] },
      { categoria_id: 'cat_conveniencia',    comercios: ['com_oxxo_garza_sada', 'com_oxxo_tecnologico', 'com_seven_constitucion'], compras: [8, 14], monto: [3500, 18000] },
      { categoria_id: 'cat_restaurantes',    comercios: ['com_ordonez', 'com_starbucks_fundadora', 'com_rappi', 'com_didi_food', 'com_wingstop_valle'], compras: [10, 18], monto: [12000, 78000] },
      { categoria_id: 'cat_transporte',      comercios: ['com_uber', 'com_didi', 'com_metrorrey'],                  compras: [8, 14], monto: [4500, 26000] },
      { categoria_id: 'cat_entretenimiento', comercios: ['com_cinepolis_valle', 'com_arena_mty', 'com_parque_fundidora'], compras: [1, 3], monto: [18000, 95000] },
      { categoria_id: 'cat_ropa',            comercios: ['com_zara_galerias', 'com_amazon_mx', 'com_mercado_libre', 'com_liverpool_valle'], compras: [2, 5], monto: [29000, 185000] },
      { categoria_id: 'cat_salud',           comercios: ['com_farmacia_benavides', 'com_farmacia_guadalajara'],      compras: [0, 2], monto: [8000, 62000] },
      { categoria_id: 'cat_retiros',         comercios: ['com_banorte_cajero'],                                      compras: [1, 3], monto: [50000, 200000] },
    ],
    // Traspaso mensual a ahorro: Ana lo hace pero irregular, y eso es el habito que el
    // diagnostico debe señalar.
    ahorro: { dia: 16, cuenta_destino: 'cta_ana_ahorro', monto_centavos: 250000, probabilidad: 0.6 },
  },

  usr_beto: {
    cuenta_gasto: 'cta_beto_nomina',
    cuenta_tarjeta: 'cta_beto_credito',
    factor_discrecional: 0.382,
    nomina: { dias: [15, 0], monto_centavos: 1725000, comercio_id: null, categoria_id: 'cat_nomina', descripcion: 'Depósito de nómina' },
    recurrentes: [
      { dia: 1,  categoria_id: 'cat_vivienda',   comercio_id: null,               monto_centavos: 720000,  descripcion: 'Renta casa Guadalupe',       canal: 'spei' },
      { dia: 3,  categoria_id: 'cat_educacion',  comercio_id: 'com_colegio_ingles', monto_centavos: 480000, descripcion: 'Colegiatura dos hijos',      canal: 'domiciliacion' },
      { dia: 7,  categoria_id: 'cat_servicios',  comercio_id: 'com_cfe',          monto_centavos: 94000,   variacion: 0.40, descripcion: 'CFE bimestral',     canal: 'domiciliacion' },
      { dia: 9,  categoria_id: 'cat_servicios',  comercio_id: 'com_telmex',       monto_centavos: 62900,   descripcion: 'Internet Telmex',            canal: 'domiciliacion' },
      { dia: 11, categoria_id: 'cat_servicios',  comercio_id: 'com_gas_natural',  monto_centavos: 47800,   variacion: 0.30, descripcion: 'Gas natural',       canal: 'domiciliacion' },
      { dia: 14, categoria_id: 'cat_servicios',  comercio_id: 'com_telcel',       monto_centavos: 74900,   descripcion: 'Plan familiar Telcel',       canal: 'domiciliacion' },
      // El pago minimo es un traspaso: sale de la cuenta corriente y entra a la tarjeta.
      // El COSTO de la deuda no se registra aqui sino como cargo de intereses en la propia
      // tarjeta (abajo). Si el pago se contara como gasto ademas de los intereses, el mismo
      // peso aparecería dos veces en la grafica de "a donde se fue mi dinero".
      { dia: 6,  categoria_id: 'cat_transferencias', comercio_id: null,         monto_centavos: 295073,  descripcion: 'Pago mínimo tarjeta •••• 4821', canal: 'app', cuenta_espejo: 'cta_beto_credito' },
      // Intereses del periodo con IVA sobre la tarjeta. Es el numero que la reestructura
      // reduce, y por eso tiene que estar visible en su historial.
      { dia: 5,  categoria_id: 'cat_financiero', comercio_id: 'com_banorte_intereses', monto_centavos: 224000, variacion: 0.10, descripcion: 'Intereses tarjeta •••• 4821', canal: 'app', cuenta: 'cta_beto_credito' },
      { dia: 22, categoria_id: 'cat_financiero', comercio_id: null,           monto_centavos: 251100,  descripcion: 'Mensualidad crédito de nómina', canal: 'domiciliacion' },
    ],
    discrecional: [
      { categoria_id: 'cat_super',        comercios: ['com_soriana_gonzalitos', 'com_smart_anahuac', 'com_walmart_lincoln'], compras: [5, 8],  monto: [68000, 210000] },
      { categoria_id: 'cat_conveniencia', comercios: ['com_oxxo_garza_sada', 'com_seven_constitucion'],              compras: [10, 16], monto: [3000, 15000] },
      { categoria_id: 'cat_transporte',   comercios: ['com_pemex_morones', 'com_oxxo_gas_lazaro'],                   compras: [5, 8],  monto: [55000, 120000] },
      { categoria_id: 'cat_restaurantes', comercios: ['com_ordonez', 'com_didi_food'],                               compras: [3, 6],  monto: [15000, 52000] },
      { categoria_id: 'cat_salud',        comercios: ['com_farmacia_guadalajara', 'com_farmacia_benavides'],         compras: [1, 3],  monto: [12000, 78000] },
      { categoria_id: 'cat_retiros',      comercios: ['com_banorte_cajero'],                                         compras: [2, 4],  monto: [100000, 300000] },
      // Beto sigue cargando a la tarjeta aunque la trae al limite: es exactamente lo que la
      // deja en 96 % y lo que hace que el pago minimo no la baje nunca.
      { cuenta: 'cta_beto_credito', categoria_id: 'cat_conveniencia', comercios: ['com_oxxo_garza_sada', 'com_seven_constitucion'], compras: [2, 4], monto: [25000, 85000] },
    ],
    ahorro: { dia: 28, cuenta_destino: 'cta_beto_ahorro', monto_centavos: 60000, probabilidad: 0.25 },   // ahorra a ratos y lo saca
  },

  usr_carmen: {
    cuenta_gasto: 'cta_carmen_nomina',
    cuenta_tarjeta: 'cta_carmen_credito',
    // Carmen paga todo con la Oro y la liquida cada mes. Su gasto discrecional y sus
    // suscripciones van a la tarjeta, no a la cuenta corriente: si no, el pago total de la
    // tarjeta seria un cargo sin consumo que lo respalde y el saldo de la tarjeta no
    // cuadraria con nada.
    cuenta_discrecional: 'cta_carmen_credito',
    factor_discrecional: 0.298,
    // Honorarios por proyecto: 2 o 3 cobros al mes, de montos muy dispares. El piso de dos
    // cobros no es cosmetico: con uno solo su ingreso del mes cae por debajo de sus costos
    // fijos, y una arquitecta con su cartera no factura un solo proyecto al mes.
    honorarios: { pagos: [2, 3], monto: [2720000, 5690000], categoria_id: 'cat_honorarios', descripcion: 'Honorarios por proyecto' },
    recurrentes: [
      { dia: 2,  categoria_id: 'cat_vivienda',   comercio_id: null,                 monto_centavos: 1890700, descripcion: 'Mensualidad hipoteca',        canal: 'domiciliacion' },
      { dia: 3,  categoria_id: 'cat_financiero', comercio_id: null,             monto_centavos: 1251600, descripcion: 'Mensualidad crédito de auto', canal: 'domiciliacion' },
      { dia: 4,  categoria_id: 'cat_servicios',  comercio_id: 'com_predial_mty',    monto_centavos: 210000,  descripcion: 'Predial y mantenimiento',     canal: 'domiciliacion' },
      { dia: 6,  categoria_id: 'cat_servicios',  comercio_id: 'com_cfe',            monto_centavos: 248000,  variacion: 0.35, descripcion: 'CFE bimestral',      canal: 'domiciliacion' },
      { dia: 9,  categoria_id: 'cat_servicios',  comercio_id: 'com_telmex',         monto_centavos: 129900,  descripcion: 'Internet y telefonía',        canal: 'domiciliacion' },
      { dia: 13, categoria_id: 'cat_educacion',  comercio_id: 'com_colegio_ingles', monto_centavos: 1450000, descripcion: 'Universidad hija',            canal: 'spei' },
      // `cuenta_espejo` le dice al generador que ademas del cargo en la cuenta corriente
      // genere el abono en la cuenta destino. Sin el segundo asiento el saldo de la tarjeta
      // se hunde y el del portafolio sale de la nada.
      { dia: 20, categoria_id: 'cat_transferencias', comercio_id: null,             monto_centavos: 3250000, variacion: 0.20, descripcion: 'Pago total tarjeta •••• 7712', canal: 'app', cuenta_espejo: 'cta_carmen_credito' },
      { dia: 25, categoria_id: 'cat_inversion',  comercio_id: null,                 monto_centavos: 2000000, descripcion: 'Aportación a portafolio',     canal: 'app', cuenta_espejo: 'cta_carmen_inversion' },
    ],
    discrecional: [
      { categoria_id: 'cat_super',           comercios: ['com_heb_valle', 'com_costco_valle', 'com_heb_cumbres'],   compras: [5, 9],  monto: [120000, 480000] },
      { categoria_id: 'cat_restaurantes',    comercios: ['com_cabrito_regio', 'com_starbucks_fundadora', 'com_rappi', 'com_wingstop_valle'], compras: [8, 15], monto: [28000, 265000] },
      { categoria_id: 'cat_transporte',      comercios: ['com_oxxo_gas_lazaro', 'com_uber', 'com_taller_gonzalez', 'com_verificentro'], compras: [6, 11], monto: [45000, 380000] },
      { categoria_id: 'cat_salud',           comercios: ['com_hospital_zambrano', 'com_dentista_lozano', 'com_farmacia_benavides'], compras: [1, 4], monto: [45000, 620000] },
      { categoria_id: 'cat_ropa',            comercios: ['com_liverpool_valle', 'com_zara_galerias', 'com_home_depot_lincoln', 'com_amazon_mx'], compras: [3, 7], monto: [85000, 780000] },
      { categoria_id: 'cat_entretenimiento', comercios: ['com_cinepolis_valle', 'com_arena_mty'],                    compras: [1, 3],  monto: [45000, 320000] },
      { categoria_id: 'cat_conveniencia',    comercios: ['com_oxxo_tecnologico'],                                    compras: [3, 7],  monto: [4500, 22000] },
    ],
    ahorro: { dia: 27, cuenta_destino: 'cta_carmen_ahorro', monto_centavos: 800000, probabilidad: 0.85 },
  },
};

// ===========================================================================
// suscripciones.csv
// ===========================================================================
// El generador las materializa como movimientos con `es_recurrente = true` el mismo dia
// cada mes. Ana tiene cinco y eso es lo que el tope de gasto va a atacar.
export const suscripciones = [
  { id: 'sus_ana_netflix',      usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_netflix',   concepto: 'Netflix Estándar',      monto_centavos: 27900,  dia_cargo: 4,  periodicidad: 'mensual', activa: true,  fecha_inicio: '2023-05-04', fecha_cancelacion: null },
  { id: 'sus_ana_spotify',      usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_spotify',   concepto: 'Spotify Premium',       monto_centavos: 11500,  dia_cargo: 7,  periodicidad: 'mensual', activa: true,  fecha_inicio: '2022-02-07', fecha_cancelacion: null },
  { id: 'sus_ana_disney',       usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_disney',    concepto: 'Disney+ Estándar',      monto_centavos: 19900,  dia_cargo: 11, periodicidad: 'mensual', activa: true,  fecha_inicio: '2024-11-11', fecha_cancelacion: null },
  { id: 'sus_ana_hbo',          usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_hbo',       concepto: 'HBO Max',               monto_centavos: 14900,  dia_cargo: 14, periodicidad: 'mensual', activa: true,  fecha_inicio: '2025-06-14', fecha_cancelacion: null },
  { id: 'sus_ana_icloud',       usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_icloud',    concepto: 'iCloud 200 GB',         monto_centavos: 4900,   dia_cargo: 19, periodicidad: 'mensual', activa: true,  fecha_inicio: '2021-09-19', fecha_cancelacion: null },
  { id: 'sus_ana_smartfit',     usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_smartfit',  concepto: 'Smart Fit Black',       monto_centavos: 43900,  dia_cargo: 22, periodicidad: 'mensual', activa: true,  fecha_inicio: '2025-01-22', fecha_cancelacion: null },
  { id: 'sus_ana_adobe',        usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',    comercio_id: 'com_adobe',     concepto: 'Creative Cloud',        monto_centavos: 63900,  dia_cargo: 26, periodicidad: 'mensual', activa: true,  fecha_inicio: '2022-07-26', fecha_cancelacion: null },
  // Beto cancelo el gimnasio en marzo: el generador deja de cobrarlo desde esa fecha.
  { id: 'sus_beto_netflix',     usuario_id: 'usr_beto',   cuenta_id: 'cta_beto_nomina',   comercio_id: 'com_netflix',   concepto: 'Netflix Básico',        monto_centavos: 17900,  dia_cargo: 8,  periodicidad: 'mensual', activa: true,  fecha_inicio: '2021-03-08', fecha_cancelacion: null },
  { id: 'sus_beto_disney',      usuario_id: 'usr_beto',   cuenta_id: 'cta_beto_nomina',   comercio_id: 'com_disney',    concepto: 'Disney+ con anuncios',  monto_centavos: 13900,  dia_cargo: 16, periodicidad: 'mensual', activa: true,  fecha_inicio: '2024-08-16', fecha_cancelacion: null },
  { id: 'sus_beto_smartfit',    usuario_id: 'usr_beto',   cuenta_id: 'cta_beto_nomina',   comercio_id: 'com_smartfit',  concepto: 'Smart Fit Smart',       monto_centavos: 29900,  dia_cargo: 21, periodicidad: 'mensual', activa: false, fecha_inicio: '2025-02-21', fecha_cancelacion: '2026-03-21' },
  { id: 'sus_carmen_netflix',   usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_credito',comercio_id: 'com_netflix',   concepto: 'Netflix Premium',       monto_centavos: 35900,  dia_cargo: 5,  periodicidad: 'mensual', activa: true,  fecha_inicio: '2020-01-05', fecha_cancelacion: null },
  { id: 'sus_carmen_spotify',   usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_credito',comercio_id: 'com_spotify',   concepto: 'Spotify Familiar',      monto_centavos: 20900,  dia_cargo: 9,  periodicidad: 'mensual', activa: true,  fecha_inicio: '2021-11-09', fecha_cancelacion: null },
  { id: 'sus_carmen_adobe',     usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_credito',comercio_id: 'com_adobe',     concepto: 'Creative Cloud Equipos',monto_centavos: 149900, dia_cargo: 12, periodicidad: 'mensual', activa: true,  fecha_inicio: '2019-04-12', fecha_cancelacion: null },
  { id: 'sus_carmen_icloud',    usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_credito',comercio_id: 'com_icloud',    concepto: 'iCloud 2 TB',           monto_centavos: 19900,  dia_cargo: 17, periodicidad: 'mensual', activa: true,  fecha_inicio: '2020-06-17', fecha_cancelacion: null },
  { id: 'sus_carmen_sportsworld', usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_credito', comercio_id: 'com_sportsworld', concepto: 'Sports World Total', monto_centavos: 128000, dia_cargo: 24, periodicidad: 'mensual', activa: true, fecha_inicio: '2023-09-24', fecha_cancelacion: null },
];

// ===========================================================================
// Gastos atipicos
// ===========================================================================
// Marcados con `es_atipico = true`. Sin esto, "detectar anomalias" no tiene nada que
// detectar y la demo se cae en la pregunta obvia del jurado. Fechas fijas a proposito:
// el guion de la demo las menciona.
export const atipicos = [
  { id: 'mov_atip_001', usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',     fecha: '2025-12-20', categoria_id: 'cat_ropa',         comercio_id: 'com_liverpool_valle',  monto_centavos: 1284000, descripcion: 'Regalos de Navidad',                canal: 'tarjeta' },
  { id: 'mov_atip_002', usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',     fecha: '2026-04-11', categoria_id: 'cat_salud',        comercio_id: 'com_dentista_lozano',  monto_centavos: 1850000, descripcion: 'Tratamiento de ortodoncia',         canal: 'tarjeta' },
  { id: 'mov_atip_003', usuario_id: 'usr_ana',    cuenta_id: 'cta_ana_nomina',     fecha: '2026-08-29', categoria_id: 'cat_restaurantes', comercio_id: 'com_cabrito_regio',    monto_centavos: 428000,  descripcion: 'Cena de cumpleaños',                canal: 'tarjeta' },
  { id: 'mov_atip_004', usuario_id: 'usr_beto',   cuenta_id: 'cta_beto_nomina',    fecha: '2026-02-14', categoria_id: 'cat_transporte',   comercio_id: 'com_taller_gonzalez',  monto_centavos: 1420000, descripcion: 'Reparación de transmisión',         canal: 'efectivo' },
  { id: 'mov_atip_005', usuario_id: 'usr_beto',   cuenta_id: 'cta_beto_nomina',    fecha: '2026-06-08', categoria_id: 'cat_salud',        comercio_id: 'com_hospital_zambrano',monto_centavos: 2380000, descripcion: 'Urgencias hijo menor',              canal: 'tarjeta' },
  { id: 'mov_atip_006', usuario_id: 'usr_beto',   cuenta_id: 'cta_beto_nomina',    fecha: '2026-08-12', categoria_id: 'cat_financiero',   comercio_id: 'com_banorte_comisiones',monto_centavos: 65000,  descripcion: 'Comisión por pago tardío',          canal: 'app' },
  { id: 'mov_atip_007', usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_nomina',  fecha: '2026-01-23', categoria_id: 'cat_ropa',         comercio_id: 'com_home_depot_lincoln',monto_centavos: 8940000,descripcion: 'Remodelación de estudio',           canal: 'spei' },
  { id: 'mov_atip_008', usuario_id: 'usr_carmen', cuenta_id: 'cta_carmen_nomina',  fecha: '2026-05-30', categoria_id: 'cat_entretenimiento', comercio_id: 'com_arena_mty',     monto_centavos: 1560000, descripcion: 'Viaje y conciertos',                canal: 'tarjeta' },
];

// ===========================================================================
// Estacionalidad
// ===========================================================================
// Multiplicador sobre el gasto discrecional del mes. Lo que un jurado de Monterrey
// reconoce: Buen Fin en noviembre, aguinaldo y posadas en diciembre, cuesta de enero,
// regreso a clases en agosto.
export const estacionalidad = {
  '2025-10': 1.00,
  '2025-11': 1.28,   // Buen Fin
  '2025-12': 1.42,   // posadas y regalos
  '2026-01': 0.82,   // cuesta de enero
  '2026-02': 0.94,
  '2026-03': 1.02,
  '2026-04': 1.08,   // Semana Santa
  '2026-05': 1.12,   // dia de las madres
  '2026-06': 1.00,
  '2026-07': 1.15,   // vacaciones
  '2026-08': 1.22,   // regreso a clases
  '2026-09': 0.96,   // mes en curso, corta al dia 12
};

// El aguinaldo cae en diciembre, y es lo que hace que la comparativa anual tenga sentido.
export const aguinaldos = [
  { usuario_id: 'usr_ana',  cuenta_id: 'cta_ana_nomina',  fecha: '2025-12-15', monto_centavos: 1600000, descripcion: 'Aguinaldo 2025' },
  { usuario_id: 'usr_beto', cuenta_id: 'cta_beto_nomina', fecha: '2025-12-12', monto_centavos: 1725000, descripcion: 'Aguinaldo 2025' },
];
