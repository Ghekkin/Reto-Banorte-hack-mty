// Catalogos fijos, escritos a mano. No los toca el generador: son la parte del dominio
// que debe verse deliberada, no aleatoria. Ver skill datos-mock y ADR 0005.
//
// Los montos son BIGINT en CENTAVOS y los porcentajes decimales (0.4590 = 45.90 %).

// ===========================================================================
// categorias.csv
// ===========================================================================
// `es_esencial` divide el gasto en esencial vs discrecional: es la base del
// diagnostico de habitos. Los intereses y comisiones cuentan como esencial porque el
// usuario no puede dejar de pagarlos, y eso es justo lo que hace evidente el problema
// de Beto: su gasto "obligatorio" esta lleno de costo financiero.
export const categorias = [
  { id: 'cat_nomina',         nombre: 'Nómina',                  grupo: 'ingreso',         es_esencial: true,  es_ingreso: true,  color: '#0F7B6C', icono: 'briefcase' },
  { id: 'cat_honorarios',     nombre: 'Honorarios',              grupo: 'ingreso',         es_esencial: true,  es_ingreso: true,  color: '#1B9E8F', icono: 'receipt' },
  { id: 'cat_rendimientos',   nombre: 'Rendimientos',            grupo: 'ingreso',         es_esencial: false, es_ingreso: true,  color: '#3CB4A6', icono: 'trending-up' },
  { id: 'cat_vivienda',       nombre: 'Vivienda',                grupo: 'vivienda',        es_esencial: true,  es_ingreso: false, color: '#8C4A2F', icono: 'home' },
  { id: 'cat_super',          nombre: 'Supermercado',            grupo: 'alimentacion',    es_esencial: true,  es_ingreso: false, color: '#C77D2E', icono: 'shopping-cart' },
  { id: 'cat_conveniencia',   nombre: 'Conveniencia',            grupo: 'alimentacion',    es_esencial: false, es_ingreso: false, color: '#E0A458', icono: 'store' },
  { id: 'cat_restaurantes',   nombre: 'Restaurantes',            grupo: 'alimentacion',    es_esencial: false, es_ingreso: false, color: '#D9534F', icono: 'utensils' },
  { id: 'cat_transporte',     nombre: 'Transporte',              grupo: 'transporte',      es_esencial: true,  es_ingreso: false, color: '#4A6FA5', icono: 'car' },
  { id: 'cat_servicios',      nombre: 'Servicios del hogar',     grupo: 'servicios',       es_esencial: true,  es_ingreso: false, color: '#5B6C7F', icono: 'bolt' },
  { id: 'cat_suscripciones',  nombre: 'Suscripciones',           grupo: 'entretenimiento', es_esencial: false, es_ingreso: false, color: '#7B5EA7', icono: 'repeat' },
  { id: 'cat_entretenimiento',nombre: 'Entretenimiento',         grupo: 'entretenimiento', es_esencial: false, es_ingreso: false, color: '#9B72CF', icono: 'ticket' },
  { id: 'cat_salud',          nombre: 'Salud',                   grupo: 'salud',           es_esencial: true,  es_ingreso: false, color: '#2E8B9B', icono: 'heart-pulse' },
  { id: 'cat_ropa',           nombre: 'Ropa y hogar',            grupo: 'otros',           es_esencial: false, es_ingreso: false, color: '#B5838D', icono: 'shirt' },
  { id: 'cat_educacion',      nombre: 'Educación',               grupo: 'otros',           es_esencial: true,  es_ingreso: false, color: '#3D7EA6', icono: 'graduation-cap' },
  { id: 'cat_financiero',     nombre: 'Intereses y comisiones',  grupo: 'financiero',      es_esencial: true,  es_ingreso: false, color: '#8B1A1A', icono: 'percent' },
  { id: 'cat_transferencias', nombre: 'Transferencias',          grupo: 'otros',           es_esencial: false, es_ingreso: false, color: '#6B7280', icono: 'arrow-right-left' },
  { id: 'cat_retiros',        nombre: 'Retiros de efectivo',     grupo: 'otros',           es_esencial: false, es_ingreso: false, color: '#9CA3AF', icono: 'banknote' },
  { id: 'cat_inversion',      nombre: 'Aportaciones a inversión',grupo: 'otros',           es_esencial: false, es_ingreso: false, color: '#166534', icono: 'piggy-bank' },
];

// ===========================================================================
// comercios.csv
// ===========================================================================
// Con sucursal y calle de Monterrey. Es la diferencia entre "Comercio 1" y algo que
// un juez de Monterrey reconoce.
export const comercios = [
  // Supermercado
  { id: 'com_heb_valle',        nombre: 'HEB Valle Oriente',        razon_social: 'HEB México S. de R.L. de C.V.',       categoria_id: 'cat_super',        ciudad: 'San Pedro Garza García', giro: 'autoservicio' },
  { id: 'com_heb_cumbres',      nombre: 'HEB Cumbres',              razon_social: 'HEB México S. de R.L. de C.V.',       categoria_id: 'cat_super',        ciudad: 'Monterrey',              giro: 'autoservicio' },
  { id: 'com_soriana_gonzalitos', nombre: 'Soriana Gonzalitos',     razon_social: 'Tiendas Soriana S.A. de C.V.',        categoria_id: 'cat_super',        ciudad: 'Monterrey',              giro: 'autoservicio' },
  { id: 'com_walmart_lincoln',  nombre: 'Walmart Lincoln',          razon_social: 'Nueva Walmart de México S. de R.L.',  categoria_id: 'cat_super',        ciudad: 'Monterrey',              giro: 'autoservicio' },
  { id: 'com_costco_valle',     nombre: 'Costco Valle',             razon_social: 'Costco de México S.A. de C.V.',       categoria_id: 'cat_super',        ciudad: 'San Pedro Garza García', giro: 'club_de_precio' },
  { id: 'com_smart_anahuac',    nombre: 'Bodega Aurrera Anáhuac',   razon_social: 'Nueva Walmart de México S. de R.L.',  categoria_id: 'cat_super',        ciudad: 'San Nicolás de los Garza', giro: 'autoservicio' },
  // Conveniencia
  { id: 'com_oxxo_garza_sada',  nombre: 'OXXO Garza Sada',          razon_social: 'Cadena Comercial OXXO S.A. de C.V.',  categoria_id: 'cat_conveniencia', ciudad: 'Monterrey',              giro: 'conveniencia' },
  { id: 'com_oxxo_tecnologico', nombre: 'OXXO Tecnológico',         razon_social: 'Cadena Comercial OXXO S.A. de C.V.',  categoria_id: 'cat_conveniencia', ciudad: 'Monterrey',              giro: 'conveniencia' },
  { id: 'com_seven_constitucion', nombre: '7-Eleven Constitución',  razon_social: '7-Eleven México S.A. de C.V.',        categoria_id: 'cat_conveniencia', ciudad: 'Monterrey',              giro: 'conveniencia' },
  { id: 'com_farmacia_benavides', nombre: 'Farmacias Benavides Contry', razon_social: 'Farmacias Benavides S.A.B.',      categoria_id: 'cat_salud',        ciudad: 'Monterrey',              giro: 'farmacia' },
  // Restaurantes
  { id: 'com_ordonez',          nombre: 'Tacos El Ordóñez',         razon_social: 'Ordóñez Alimentos S.A. de C.V.',      categoria_id: 'cat_restaurantes', ciudad: 'Monterrey',              giro: 'restaurante' },
  { id: 'com_cabrito_regio',    nombre: 'El Cabrito Regio',         razon_social: 'Regio Gastronomía S.A. de C.V.',      categoria_id: 'cat_restaurantes', ciudad: 'Monterrey',              giro: 'restaurante' },
  { id: 'com_starbucks_fundadora', nombre: 'Starbucks Fundidora',   razon_social: 'Café Sirena S. de R.L. de C.V.',      categoria_id: 'cat_restaurantes', ciudad: 'Monterrey',              giro: 'cafeteria' },
  { id: 'com_rappi',            nombre: 'Rappi',                    razon_social: 'Rappi México S.A.P.I. de C.V.',       categoria_id: 'cat_restaurantes', ciudad: null,                     giro: 'entrega_a_domicilio' },
  { id: 'com_didi_food',        nombre: 'DiDi Food',                razon_social: 'DiDi Food México S. de R.L.',         categoria_id: 'cat_restaurantes', ciudad: null,                     giro: 'entrega_a_domicilio' },
  { id: 'com_wingstop_valle',   nombre: 'Wingstop Valle',           razon_social: 'Alimentos Alados S.A. de C.V.',       categoria_id: 'cat_restaurantes', ciudad: 'San Pedro Garza García', giro: 'restaurante' },
  // Transporte
  { id: 'com_uber',             nombre: 'Uber',                     razon_social: 'Uber México Technology S.A.P.I.',     categoria_id: 'cat_transporte',   ciudad: null,                     giro: 'movilidad' },
  { id: 'com_didi',             nombre: 'DiDi',                     razon_social: 'DiDi Mobility México S. de R.L.',     categoria_id: 'cat_transporte',   ciudad: null,                     giro: 'movilidad' },
  { id: 'com_oxxo_gas_lazaro',  nombre: 'OXXO Gas Lázaro Cárdenas', razon_social: 'Servicio OXXO Gas S.A. de C.V.',      categoria_id: 'cat_transporte',   ciudad: 'San Pedro Garza García', giro: 'gasolinera' },
  { id: 'com_pemex_morones',    nombre: 'Pemex Morones Prieto',     razon_social: 'Combustibles del Norte S.A. de C.V.', categoria_id: 'cat_transporte',   ciudad: 'Monterrey',              giro: 'gasolinera' },
  { id: 'com_metrorrey',        nombre: 'Metrorrey',                razon_social: 'Sistema de Transporte Colectivo',      categoria_id: 'cat_transporte',   ciudad: 'Monterrey',              giro: 'transporte_publico' },
  { id: 'com_verificentro',     nombre: 'Verificentro Anáhuac',     razon_social: 'Verificación Vehicular NL',           categoria_id: 'cat_transporte',   ciudad: 'San Nicolás de los Garza', giro: 'servicio_vehicular' },
  { id: 'com_taller_gonzalez',  nombre: 'Taller Mecánico González', razon_social: 'Servicios Automotrices González',      categoria_id: 'cat_transporte',   ciudad: 'Guadalupe',              giro: 'taller' },
  // Servicios
  { id: 'com_cfe',              nombre: 'CFE',                      razon_social: 'Comisión Federal de Electricidad',    categoria_id: 'cat_servicios',    ciudad: null,                     giro: 'electricidad' },
  { id: 'com_agua_drenaje',     nombre: 'Agua y Drenaje de Monterrey', razon_social: 'Servicios de Agua y Drenaje de Mty', categoria_id: 'cat_servicios',  ciudad: 'Monterrey',              giro: 'agua' },
  { id: 'com_telmex',           nombre: 'Telmex',                   razon_social: 'Teléfonos de México S.A.B. de C.V.',  categoria_id: 'cat_servicios',    ciudad: null,                     giro: 'internet' },
  { id: 'com_telcel',           nombre: 'Telcel',                   razon_social: 'Radiomóvil Dipsa S.A. de C.V.',       categoria_id: 'cat_servicios',    ciudad: null,                     giro: 'telefonia' },
  { id: 'com_gas_natural',      nombre: 'Naturgy',                  razon_social: 'Naturgy México S.A. de C.V.',         categoria_id: 'cat_servicios',    ciudad: null,                     giro: 'gas' },
  { id: 'com_predial_mty',      nombre: 'Predial Monterrey',        razon_social: 'Municipio de Monterrey',              categoria_id: 'cat_servicios',    ciudad: 'Monterrey',              giro: 'impuesto_local' },
  // Suscripciones
  { id: 'com_netflix',          nombre: 'Netflix',                  razon_social: 'Netflix Entertainment México',        categoria_id: 'cat_suscripciones',ciudad: null,                     giro: 'streaming' },
  { id: 'com_spotify',          nombre: 'Spotify',                  razon_social: 'Spotify México S.A. de C.V.',         categoria_id: 'cat_suscripciones',ciudad: null,                     giro: 'streaming' },
  { id: 'com_disney',           nombre: 'Disney+',                  razon_social: 'Disney Streaming México',             categoria_id: 'cat_suscripciones',ciudad: null,                     giro: 'streaming' },
  { id: 'com_hbo',              nombre: 'HBO Max',                  razon_social: 'WarnerMedia México S. de R.L.',       categoria_id: 'cat_suscripciones',ciudad: null,                     giro: 'streaming' },
  { id: 'com_icloud',           nombre: 'iCloud',                   razon_social: 'Apple Operations México',             categoria_id: 'cat_suscripciones',ciudad: null,                     giro: 'nube' },
  { id: 'com_smartfit',         nombre: 'Smart Fit Contry',         razon_social: 'Smart Fit México S.A. de C.V.',       categoria_id: 'cat_suscripciones',ciudad: 'Monterrey',              giro: 'gimnasio' },
  { id: 'com_sportsworld',      nombre: 'Sports World Valle',       razon_social: 'Grupo Sports World S.A.B.',           categoria_id: 'cat_suscripciones',ciudad: 'San Pedro Garza García', giro: 'gimnasio' },
  { id: 'com_adobe',            nombre: 'Adobe Creative Cloud',     razon_social: 'Adobe Systems México',                categoria_id: 'cat_suscripciones',ciudad: null,                     giro: 'software' },
  // Entretenimiento
  { id: 'com_cinepolis_valle',  nombre: 'Cinépolis Valle Oriente',  razon_social: 'Cinépolis S.A. de C.V.',              categoria_id: 'cat_entretenimiento', ciudad: 'San Pedro Garza García', giro: 'cine' },
  { id: 'com_arena_mty',        nombre: 'Arena Monterrey',          razon_social: 'Arena Monterrey S.A. de C.V.',        categoria_id: 'cat_entretenimiento', ciudad: 'Monterrey',           giro: 'espectaculos' },
  { id: 'com_parque_fundidora', nombre: 'Parque Fundidora',         razon_social: 'Parque Fundidora O.P.D.',             categoria_id: 'cat_entretenimiento', ciudad: 'Monterrey',           giro: 'recreacion' },
  // Salud
  { id: 'com_hospital_zambrano', nombre: 'Hospital Zambrano Hellion', razon_social: 'Instituto de Salud TecSalud',       categoria_id: 'cat_salud',        ciudad: 'San Pedro Garza García', giro: 'hospital' },
  { id: 'com_dentista_lozano',  nombre: 'Consultorio Dental Lozano', razon_social: 'Dra. Lozano Odontología',            categoria_id: 'cat_salud',        ciudad: 'Monterrey',              giro: 'dentista' },
  { id: 'com_farmacia_guadalajara', nombre: 'Farmacia Guadalajara Contry', razon_social: 'Fármacos Especializados',      categoria_id: 'cat_salud',        ciudad: 'Monterrey',              giro: 'farmacia' },
  // Ropa y hogar
  { id: 'com_liverpool_valle',  nombre: 'Liverpool Valle Oriente',  razon_social: 'El Puerto de Liverpool S.A.B.',       categoria_id: 'cat_ropa',         ciudad: 'San Pedro Garza García', giro: 'departamental' },
  { id: 'com_zara_galerias',    nombre: 'Zara Galerías Monterrey',  razon_social: 'Zara México S.A. de C.V.',            categoria_id: 'cat_ropa',         ciudad: 'Monterrey',              giro: 'ropa' },
  { id: 'com_home_depot_lincoln', nombre: 'Home Depot Lincoln',     razon_social: 'Home Depot México S. de R.L.',        categoria_id: 'cat_ropa',         ciudad: 'Monterrey',              giro: 'mejoramiento_hogar' },
  { id: 'com_amazon_mx',        nombre: 'Amazon México',            razon_social: 'Amazon Servicios de México',          categoria_id: 'cat_ropa',         ciudad: null,                     giro: 'comercio_electronico' },
  { id: 'com_mercado_libre',    nombre: 'Mercado Libre',            razon_social: 'MercadoLibre S. de R.L. de C.V.',     categoria_id: 'cat_ropa',         ciudad: null,                     giro: 'comercio_electronico' },
  // Educacion
  { id: 'com_colegio_ingles',   nombre: 'Colegio Inglés Cumbres',   razon_social: 'Instituto Educativo del Norte',       categoria_id: 'cat_educacion',    ciudad: 'Monterrey',              giro: 'escuela' },
  { id: 'com_platzi',           nombre: 'Platzi',                   razon_social: 'Platzi Inc.',                         categoria_id: 'cat_educacion',    ciudad: null,                     giro: 'educacion_en_linea' },
  // Financiero (el comercio es el banco mismo)
  { id: 'com_banorte_intereses', nombre: 'Banorte — Intereses',     razon_social: 'Banco Mercantil del Norte S.A.',      categoria_id: 'cat_financiero',   ciudad: null,                     giro: 'banca' },
  { id: 'com_banorte_comisiones', nombre: 'Banorte — Comisiones',   razon_social: 'Banco Mercantil del Norte S.A.',      categoria_id: 'cat_financiero',   ciudad: null,                     giro: 'banca' },
  { id: 'com_banorte_cajero',   nombre: 'Banorte — Cajero',         razon_social: 'Banco Mercantil del Norte S.A.',      categoria_id: 'cat_retiros',      ciudad: 'Monterrey',              giro: 'banca' },
];

// ===========================================================================
// productos_credito.csv
// ===========================================================================
// Catalogo ofertable. `score_minimo` e `ingreso_minimo_centavos` son lo que hace que
// Ana precalifique y Beto no: la precalificacion es un filtro sobre esta tabla, no un
// numero inventado por el agente.
export const productosCredito = [
  { id: 'prod_tdc_clasica',     tipo: 'tarjeta',      nombre: 'Tarjeta Clásica',            descripcion: 'Tarjeta de crédito de entrada, sin anualidad el primer año.',        tasa_anual_min: 0.3990, tasa_anual_max: 0.5490, cat_promedio: 0.6210, plazo_min_meses: 1,  plazo_max_meses: 1,   monto_min_centavos: 1500000,  monto_max_centavos: 8000000,   comision_apertura: 0.0000, ingreso_minimo_centavos: 800000,   score_minimo: 600, requiere_garantia: false },
  { id: 'prod_tdc_oro',         tipo: 'tarjeta',      nombre: 'Tarjeta Oro',                descripcion: 'Tarjeta con seguro de viaje y recompensas.',                        tasa_anual_min: 0.3290, tasa_anual_max: 0.4290, cat_promedio: 0.4980, plazo_min_meses: 1,  plazo_max_meses: 1,   monto_min_centavos: 6000000,  monto_max_centavos: 30000000,  comision_apertura: 0.0000, ingreso_minimo_centavos: 2500000,  score_minimo: 680, requiere_garantia: false },
  { id: 'prod_personal',        tipo: 'personal',     nombre: 'Crédito Personal',           descripcion: 'Préstamo sin garantía para lo que necesites.',                      tasa_anual_min: 0.2490, tasa_anual_max: 0.4290, cat_promedio: 0.4120, plazo_min_meses: 12, plazo_max_meses: 60,  monto_min_centavos: 1000000,  monto_max_centavos: 50000000,  comision_apertura: 0.0250, ingreso_minimo_centavos: 1000000,  score_minimo: 620, requiere_garantia: false },
  { id: 'prod_nomina',          tipo: 'nomina',       nombre: 'Crédito de Nómina',          descripcion: 'Descuento directo de tu nómina, tasa preferente.',                  tasa_anual_min: 0.1890, tasa_anual_max: 0.2790, cat_promedio: 0.2640, plazo_min_meses: 6,  plazo_max_meses: 48,  monto_min_centavos: 500000,   monto_max_centavos: 30000000,  comision_apertura: 0.0000, ingreso_minimo_centavos: 700000,   score_minimo: 580, requiere_garantia: false },
  { id: 'prod_auto_nuevo',      tipo: 'auto',         nombre: 'Auto Nuevo',                 descripcion: 'Financiamiento para auto de agencia, hasta 80% del valor.',         tasa_anual_min: 0.1190, tasa_anual_max: 0.1690, cat_promedio: 0.1580, plazo_min_meses: 12, plazo_max_meses: 60,  monto_min_centavos: 10000000, monto_max_centavos: 150000000, comision_apertura: 0.0150, ingreso_minimo_centavos: 1800000,  score_minimo: 650, requiere_garantia: true  },
  { id: 'prod_auto_seminuevo',  tipo: 'auto',         nombre: 'Auto Seminuevo',             descripcion: 'Financiamiento para auto usado de hasta 5 años.',                   tasa_anual_min: 0.1390, tasa_anual_max: 0.1990, cat_promedio: 0.1870, plazo_min_meses: 12, plazo_max_meses: 48,  monto_min_centavos: 8000000,  monto_max_centavos: 80000000,  comision_apertura: 0.0200, ingreso_minimo_centavos: 1500000,  score_minimo: 640, requiere_garantia: true  },
  { id: 'prod_hipotecario',     tipo: 'hipotecario',  nombre: 'Hipoteca Tasa Fija',         descripcion: 'Tasa fija a 20 años, hasta 90% del valor de la vivienda.',          tasa_anual_min: 0.0990, tasa_anual_max: 0.1190, cat_promedio: 0.1160, plazo_min_meses: 60, plazo_max_meses: 240, monto_min_centavos: 50000000, monto_max_centavos: 1500000000,comision_apertura: 0.0100, ingreso_minimo_centavos: 3500000,  score_minimo: 700, requiere_garantia: true  },
  { id: 'prod_reestructura',    tipo: 'personal',     nombre: 'Plan de Pago Fijo',          descripcion: 'Convierte el saldo de tu tarjeta en mensualidades fijas a menor tasa.', tasa_anual_min: 0.1890, tasa_anual_max: 0.2790, cat_promedio: 0.2510, plazo_min_meses: 6,  plazo_max_meses: 36,  monto_min_centavos: 500000,   monto_max_centavos: 30000000,  comision_apertura: 0.0000, ingreso_minimo_centavos: 500000,   score_minimo: 300, requiere_garantia: false },
];

// ===========================================================================
// instrumentos.csv
// ===========================================================================
// `precio_inicial_centavos` es el precio de arranque de la serie historica; el
// `precio_actual_centavos` que va al CSV lo calcula el generador como el ultimo cierre
// de `precios_historicos`, para que la grafica y la posicion nunca se contradigan.
export const instrumentos = [
  { id: 'inst_cetes_28',    nombre: 'CETES 28 días',                  clave: 'CETES28',  tipo: 'deuda_gubernamental', emisora: 'Gobierno Federal',      plazo_dias: 28,   rendimiento_anual_esperado: 0.0925, volatilidad_anual: 0.0040, riesgo: 1, liquidez: 'al_vencimiento', monto_minimo_centavos: 10000,    precio_inicial_centavos: 100000 },
  { id: 'inst_cetes_91',    nombre: 'CETES 91 días',                  clave: 'CETES91',  tipo: 'deuda_gubernamental', emisora: 'Gobierno Federal',      plazo_dias: 91,   rendimiento_anual_esperado: 0.0960, volatilidad_anual: 0.0060, riesgo: 1, liquidez: 'al_vencimiento', monto_minimo_centavos: 10000,    precio_inicial_centavos: 100000 },
  { id: 'inst_cetes_182',   nombre: 'CETES 182 días',                 clave: 'CETES182', tipo: 'deuda_gubernamental', emisora: 'Gobierno Federal',      plazo_dias: 182,  rendimiento_anual_esperado: 0.0985, volatilidad_anual: 0.0090, riesgo: 1, liquidez: 'al_vencimiento', monto_minimo_centavos: 10000,    precio_inicial_centavos: 100000 },
  { id: 'inst_bondia',      nombre: 'BONDDIA (deuda a un día)',       clave: 'BONDDIA',  tipo: 'fondo_deuda',         emisora: 'Operadora Banorte',      plazo_dias: null, rendimiento_anual_esperado: 0.0890, volatilidad_anual: 0.0025, riesgo: 1, liquidez: 'inmediata',      monto_minimo_centavos: 100000,   precio_inicial_centavos: 245800 },
  { id: 'inst_pagare_28',   nombre: 'Pagaré 28 días',                 clave: 'PAG28',    tipo: 'pagare',              emisora: 'Banorte',                plazo_dias: 28,   rendimiento_anual_esperado: 0.0750, volatilidad_anual: 0.0010, riesgo: 1, liquidez: 'al_vencimiento', monto_minimo_centavos: 500000,   precio_inicial_centavos: 100000 },
  { id: 'inst_pagare_180',  nombre: 'Pagaré 180 días',                clave: 'PAG180',   tipo: 'pagare',              emisora: 'Banorte',                plazo_dias: 180,  rendimiento_anual_esperado: 0.0880, volatilidad_anual: 0.0015, riesgo: 1, liquidez: 'al_vencimiento', monto_minimo_centavos: 1000000,  precio_inicial_centavos: 100000 },
  { id: 'inst_fondo_corto', nombre: 'Fondo de Deuda Corto Plazo',     clave: 'NTEDIA',   tipo: 'fondo_deuda',         emisora: 'Operadora Banorte',      plazo_dias: null, rendimiento_anual_esperado: 0.0910, volatilidad_anual: 0.0075, riesgo: 2, liquidez: '24h',            monto_minimo_centavos: 100000,   precio_inicial_centavos: 187400 },
  { id: 'inst_fondo_medio', nombre: 'Fondo de Deuda Mediano Plazo',   clave: 'NTEMED',   tipo: 'fondo_deuda',         emisora: 'Operadora Banorte',      plazo_dias: null, rendimiento_anual_esperado: 0.1020, volatilidad_anual: 0.0290, riesgo: 2, liquidez: '48h',            monto_minimo_centavos: 500000,   precio_inicial_centavos: 312900 },
  { id: 'inst_deuda_corp',  nombre: 'Deuda Corporativa AAA',          clave: 'CORPAAA',  tipo: 'deuda_corporativa',   emisora: 'Emisoras AAA nacionales',plazo_dias: 730,  rendimiento_anual_esperado: 0.1080, volatilidad_anual: 0.0350, riesgo: 3, liquidez: '48h',            monto_minimo_centavos: 5000000,  precio_inicial_centavos: 100000 },
  { id: 'inst_fondo_rv_nal', nombre: 'Fondo Renta Variable Nacional', clave: 'NTERVN',   tipo: 'fondo_renta_variable',emisora: 'Operadora Banorte',      plazo_dias: null, rendimiento_anual_esperado: 0.1350, volatilidad_anual: 0.1650, riesgo: 4, liquidez: '48h',            monto_minimo_centavos: 500000,   precio_inicial_centavos: 428600 },
  { id: 'inst_fondo_rv_glo', nombre: 'Fondo Renta Variable Global',   clave: 'NTERVG',   tipo: 'fondo_renta_variable',emisora: 'Operadora Banorte',      plazo_dias: null, rendimiento_anual_esperado: 0.1420, volatilidad_anual: 0.1480, riesgo: 4, liquidez: '48h',            monto_minimo_centavos: 500000,   precio_inicial_centavos: 519300 },
  { id: 'inst_naftrac',     nombre: 'ETF IPC (NAFTRAC)',              clave: 'NAFTRAC',  tipo: 'etf',                 emisora: 'BlackRock México',       plazo_dias: null, rendimiento_anual_esperado: 0.1280, volatilidad_anual: 0.1720, riesgo: 4, liquidez: 'inmediata',      monto_minimo_centavos: 100000,   precio_inicial_centavos: 5940 },
  { id: 'inst_etf_global',  nombre: 'ETF Global Desarrollado',        clave: 'IVVPESO',  tipo: 'etf',                 emisora: 'BlackRock México',       plazo_dias: null, rendimiento_anual_esperado: 0.1480, volatilidad_anual: 0.1560, riesgo: 4, liquidez: 'inmediata',      monto_minimo_centavos: 100000,   precio_inicial_centavos: 128450 },
  { id: 'inst_acc_gfnorte', nombre: 'Grupo Financiero Banorte',       clave: 'GFNORTEO', tipo: 'renta_variable',      emisora: 'GFNorte',                plazo_dias: null, rendimiento_anual_esperado: 0.1520, volatilidad_anual: 0.2380, riesgo: 5, liquidez: 'inmediata',      monto_minimo_centavos: 100000,   precio_inicial_centavos: 14980 },
  { id: 'inst_acc_walmex',  nombre: 'Wal-Mart de México',             clave: 'WALMEX',   tipo: 'renta_variable',      emisora: 'Walmex',                 plazo_dias: null, rendimiento_anual_esperado: 0.1180, volatilidad_anual: 0.2050, riesgo: 5, liquidez: 'inmediata',      monto_minimo_centavos: 100000,   precio_inicial_centavos: 5820 },
  { id: 'inst_acc_cemex',   nombre: 'Cemex',                          clave: 'CEMEXCPO', tipo: 'renta_variable',      emisora: 'Cemex',                  plazo_dias: null, rendimiento_anual_esperado: 0.1050, volatilidad_anual: 0.3120, riesgo: 5, liquidez: 'inmediata',      monto_minimo_centavos: 100000,   precio_inicial_centavos: 1340 },
];

// ===========================================================================
// modelos_portafolio.csv
// ===========================================================================
// Asignacion objetivo por perfil. Los pesos de cada perfil suman exactamente 1.0000
// (lo valida validar-datos.mjs). Es contra este modelo que se calcula la desviacion
// del portafolio y, por lo tanto, la sugerencia de rebalanceo.
export const modelosPortafolio = [
  // Conservador: 85 % deuda, nada de acciones individuales.
  { perfil: 'conservador', instrumento_id: 'inst_cetes_28',     peso_objetivo_pct: 0.2000 },
  { perfil: 'conservador', instrumento_id: 'inst_cetes_182',    peso_objetivo_pct: 0.1500 },
  { perfil: 'conservador', instrumento_id: 'inst_bondia',       peso_objetivo_pct: 0.1500 },
  { perfil: 'conservador', instrumento_id: 'inst_pagare_180',   peso_objetivo_pct: 0.1000 },
  { perfil: 'conservador', instrumento_id: 'inst_fondo_corto',  peso_objetivo_pct: 0.2000 },
  { perfil: 'conservador', instrumento_id: 'inst_fondo_medio',  peso_objetivo_pct: 0.1000 },
  { perfil: 'conservador', instrumento_id: 'inst_fondo_rv_glo', peso_objetivo_pct: 0.0500 },
  { perfil: 'conservador', instrumento_id: 'inst_etf_global',   peso_objetivo_pct: 0.0500 },
  // Moderado: 60/40.
  { perfil: 'moderado',    instrumento_id: 'inst_cetes_91',     peso_objetivo_pct: 0.1000 },
  { perfil: 'moderado',    instrumento_id: 'inst_bondia',       peso_objetivo_pct: 0.1000 },
  { perfil: 'moderado',    instrumento_id: 'inst_fondo_corto',  peso_objetivo_pct: 0.1500 },
  { perfil: 'moderado',    instrumento_id: 'inst_fondo_medio',  peso_objetivo_pct: 0.1500 },
  { perfil: 'moderado',    instrumento_id: 'inst_deuda_corp',   peso_objetivo_pct: 0.1000 },
  { perfil: 'moderado',    instrumento_id: 'inst_fondo_rv_nal', peso_objetivo_pct: 0.1000 },
  { perfil: 'moderado',    instrumento_id: 'inst_etf_global',   peso_objetivo_pct: 0.2000 },
  { perfil: 'moderado',    instrumento_id: 'inst_naftrac',      peso_objetivo_pct: 0.1000 },
  // Agresivo: 75 % renta variable.
  { perfil: 'agresivo',    instrumento_id: 'inst_bondia',       peso_objetivo_pct: 0.1000 },
  { perfil: 'agresivo',    instrumento_id: 'inst_fondo_medio',  peso_objetivo_pct: 0.1000 },
  { perfil: 'agresivo',    instrumento_id: 'inst_deuda_corp',   peso_objetivo_pct: 0.0500 },
  { perfil: 'agresivo',    instrumento_id: 'inst_fondo_rv_nal',  peso_objetivo_pct: 0.1500 },
  { perfil: 'agresivo',    instrumento_id: 'inst_fondo_rv_glo', peso_objetivo_pct: 0.1500 },
  { perfil: 'agresivo',    instrumento_id: 'inst_etf_global',   peso_objetivo_pct: 0.2500 },
  { perfil: 'agresivo',    instrumento_id: 'inst_naftrac',      peso_objetivo_pct: 0.1000 },
  { perfil: 'agresivo',    instrumento_id: 'inst_acc_gfnorte',  peso_objetivo_pct: 0.1000 },
];

// ===========================================================================
// perfiles_inversion.csv
// ===========================================================================
// Beto tiene perfil pero NO portafolio a proposito: es el caso en que el agente debe
// decir "primero salgamos de la deuda" en vez de vender un producto de inversion.
export const perfilesInversion = [
  { usuario_id: 'usr_ana',    perfil: 'conservador', puntaje_cuestionario: 28, horizonte_meses: 24,  tolerancia_perdida_pct: 0.0500, objetivo: 'Formar un fondo de emergencia y juntar el enganche de un depa', experiencia: 'ninguna',     fecha_perfilamiento: '2026-03-14', vigente_hasta: '2027-03-14', ejecutivo: null },
  { usuario_id: 'usr_beto',   perfil: 'conservador', puntaje_cuestionario: 19, horizonte_meses: 12,  tolerancia_perdida_pct: 0.0200, objetivo: 'Salir de deudas antes de pensar en invertir',                 experiencia: 'ninguna',     fecha_perfilamiento: '2026-07-02', vigente_hasta: '2027-07-02', ejecutivo: null },
  { usuario_id: 'usr_carmen', perfil: 'agresivo',    puntaje_cuestionario: 76, horizonte_meses: 120, tolerancia_perdida_pct: 0.2500, objetivo: 'Crecer patrimonio a 10 años y complementar el retiro',       experiencia: 'avanzada',    fecha_perfilamiento: '2026-01-20', vigente_hasta: '2027-01-20', ejecutivo: 'Lic. Mariana Cárdenas Ovalle' },
];
