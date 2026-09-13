import "server-only";

import { booleano, entero, fraccion, leerTabla } from "./tablas";

/**
 * Consultas tipadas sobre las tablas. Es la capa que separa "como estan guardados los
 * datos" de "que necesita la pantalla": `tablas.ts` cambio de leer CSV a consultar
 * PostgreSQL (ADR 0010) y ni este archivo ni los componentes cambiaron una linea.
 *
 * Tiene DOS consumidores: las pantallas (componentes de servidor, que llaman aqui
 * directo) y las rutas `GET /api/*`, que son la misma informacion por HTTP para quien
 * consulta de fuera. Ver `docs/como-funciona/api-rest-lectura.md`.
 *
 * Los montos salen en CENTAVOS. Formatear es trabajo de quien pinta (`lib/dinero.ts`).
 */

export type Cuenta = {
  id: string;
  tipo: "nomina" | "ahorro" | "inversion" | "credito";
  alias: string;
  mascara: string;
  saldoCentavos: number;
  esPrincipal: boolean;
};

export type Tarjeta = {
  id: string;
  /** La cuenta a la que esta ligada: en debito, de ahi sale el disponible que se muestra. */
  cuentaId: string;
  producto: string;
  mascara: string;
  marca: "visa" | "mastercard";
  tipo: "debito" | "credito";
  limiteCentavos: number;
  saldoCentavos: number;
  /** Fraccion del limite usada. 0 en debito. Es el numero que delata a Beto: 0.967. */
  utilizacion: number;
  pagoMinimoCentavos: number;
  /** Lo que hay que pagar para no generar intereses. 0 en debito. */
  pagoNoInteresesCentavos: number;
  /** Fracciones anuales: 0.489 es 48.9 %. Ambas en 0 para debito. */
  tasaAnual: number;
  cat: number;
  /** "AAAA-MM-DD". En debito traen la fecha del ultimo corte, sin significado. */
  fechaCorte: string;
  fechaLimitePago: string;
  diasMora: number;
};

export type Movimiento = {
  id: string;
  fecha: string;
  tipo: "cargo" | "abono";
  montoCentavos: number;
  descripcion: string;
  categoriaId: string;
  categoria: string;
  icono: string;
  esAtipico: boolean;
};

export type Credito = {
  id: string;
  alias: string;
  saldoInsolutoCentavos: number;
  montoOriginalCentavos: number;
  mensualidadCentavos: number;
  tasaAnual: number;
  pagosRealizados: number;
  plazoMeses: number;
  proximoPago: string;
  estatus: string;
  diasMora: number;
};

export type Posicion = {
  instrumento: string;
  clave: string;
  valorMercadoCentavos: number;
  plusvaliaCentavos: number;
  pesoPct: number;
  riesgo: number;
};

export type Portafolio = {
  id: string;
  nombre: string;
  perfil: string;
  valorActualCentavos: number;
  aportadoCentavos: number;
  rendimientoCentavos: number;
  rendimientoPct: number;
  posiciones: Posicion[];
};

// --- Consultas --------------------------------------------------------------

export async function cuentasDe(usuarioId: string): Promise<Cuenta[]> {
  const filas = await leerTabla("cuentas");
  return filas
    .filter((f) => f.usuario_id === usuarioId && f.estatus === "activa")
    .map((f) => ({
      id: f.id!,
      tipo: f.tipo as Cuenta["tipo"],
      alias: f.alias!,
      mascara: f.numero_mascara!,
      saldoCentavos: entero(f.saldo_centavos),
      esPrincipal: booleano(f.es_principal),
    }));
}

export async function tarjetasDe(usuarioId: string): Promise<Tarjeta[]> {
  const filas = await leerTabla("tarjetas");
  return filas
    .filter((f) => f.usuario_id === usuarioId && f.estatus === "activa")
    .map((f) => {
      const limite = entero(f.limite_centavos);
      const saldo = entero(f.saldo_centavos);
      return {
        id: f.id!,
        cuentaId: f.cuenta_id!,
        producto: f.producto!,
        mascara: f.mascara!,
        marca: f.marca as Tarjeta["marca"],
        tipo: f.tipo as Tarjeta["tipo"],
        limiteCentavos: limite,
        saldoCentavos: saldo,
        utilizacion: limite > 0 ? saldo / limite : 0,
        pagoMinimoCentavos: entero(f.pago_minimo_centavos),
        pagoNoInteresesCentavos: entero(f.pago_no_intereses_centavos),
        tasaAnual: fraccion(f.tasa_anual),
        cat: fraccion(f.cat),
        fechaCorte: f.fecha_corte!,
        fechaLimitePago: f.fecha_limite_pago!,
        diasMora: entero(f.dias_mora),
      };
    });
}

/**
 * Los ultimos `cuantos` movimientos, mas recientes primero. La tabla ya viene en orden
 * cronologico, asi que basta invertir el final en vez de ordenar 2 265 filas.
 */
export async function movimientosRecientes(usuarioId: string, cuantos = 6): Promise<Movimiento[]> {
  const [movimientos, categorias] = await Promise.all([leerTabla("movimientos"), leerTabla("categorias")]);
  const porId = new Map(categorias.map((c) => [c.id!, c]));

  return movimientos
    .filter((f) => f.usuario_id === usuarioId)
    .slice(-cuantos)
    .reverse()
    .map((f) => {
      const categoria = porId.get(f.categoria_id!);
      return {
        id: f.id!,
        fecha: f.fecha!,
        tipo: f.tipo as Movimiento["tipo"],
        montoCentavos: entero(f.monto_centavos),
        descripcion: f.descripcion!,
        categoriaId: f.categoria_id!,
        categoria: categoria?.nombre ?? f.categoria_id!,
        icono: categoria?.icono ?? "circle",
        esAtipico: booleano(f.es_atipico),
      };
    });
}

export async function creditosDe(usuarioId: string): Promise<Credito[]> {
  const filas = await leerTabla("creditos");
  return filas
    .filter((f) => f.usuario_id === usuarioId && f.estatus !== "liquidado")
    .map((f) => ({
      id: f.id!,
      alias: f.alias!,
      saldoInsolutoCentavos: entero(f.saldo_insoluto_centavos),
      montoOriginalCentavos: entero(f.monto_original_centavos),
      mensualidadCentavos: entero(f.mensualidad_centavos),
      tasaAnual: fraccion(f.tasa_anual),
      pagosRealizados: entero(f.pagos_realizados),
      plazoMeses: entero(f.plazo_meses),
      proximoPago: f.fecha_proximo_pago!,
      estatus: f.estatus!,
      diasMora: entero(f.dias_mora),
    }));
}

/** `null` cuando el usuario no tiene portafolio: es el caso de Beto, y es a proposito. */
export async function portafolioDe(usuarioId: string): Promise<Portafolio | null> {
  const [portafolios, posiciones, instrumentos] = await Promise.all([
    leerTabla("portafolios"),
    leerTabla("posiciones"),
    leerTabla("instrumentos"),
  ]);

  const propio = portafolios.find((p) => p.usuario_id === usuarioId && p.estatus === "activo");
  if (!propio) return null;

  const porId = new Map(instrumentos.map((i) => [i.id!, i]));

  return {
    id: propio.id!,
    nombre: propio.nombre!,
    perfil: propio.perfil!,
    valorActualCentavos: entero(propio.valor_actual_centavos),
    aportadoCentavos: entero(propio.aportado_centavos),
    rendimientoCentavos: entero(propio.rendimiento_acumulado_centavos),
    rendimientoPct: fraccion(propio.rendimiento_pct),
    posiciones: posiciones
      .filter((p) => p.portafolio_id === propio.id)
      .map((p) => {
        const instrumento = porId.get(p.instrumento_id!);
        return {
          instrumento: instrumento?.nombre ?? p.instrumento_id!,
          clave: instrumento?.clave ?? "",
          valorMercadoCentavos: entero(p.valor_mercado_centavos),
          plusvaliaCentavos: entero(p.plusvalia_centavos),
          pesoPct: fraccion(p.peso_pct),
          riesgo: entero(instrumento?.riesgo ?? null),
        };
      })
      .sort((a, b) => b.valorMercadoCentavos - a.valorMercadoCentavos),
  };
}

/** Las cuentas cuyo saldo se puede usar hoy. Ver `resumenDe`. */
const CUENTAS_LIQUIDAS: ReadonlySet<Cuenta["tipo"]> = new Set(["nomina", "ahorro"]);

/**
 * Lo que necesita el heroe de Inicio. `disponible` es solo lo liquido: nomina y ahorro. Las
 * cuentas de credito no suman patrimonio, restan; y la de inversion es patrimonio pero no
 * dinero disponible hoy (y ya se reporta como portafolio: sumarla lo contaba dos veces, issue
 * #32). Confundirlas es como un banco pierde la confianza de quien lee la pantalla.
 */
export async function resumenDe(usuarioId: string): Promise<{
  disponibleCentavos: number;
  deudaCentavos: number;
  cuentaPrincipal: Cuenta | undefined;
}> {
  const [cuentas, creditos] = await Promise.all([cuentasDe(usuarioId), creditosDe(usuarioId)]);

  return {
    disponibleCentavos: cuentas
      .filter((c) => CUENTAS_LIQUIDAS.has(c.tipo))
      .reduce((total, c) => total + c.saldoCentavos, 0),
    deudaCentavos: creditos.reduce((total, c) => total + c.saldoInsolutoCentavos, 0),
    cuentaPrincipal: cuentas.find((c) => c.esPrincipal) ?? cuentas[0],
  };
}

/**
 * Los movimientos que se mandan al cliente para filtrar.
 *
 * El tope existe por peso: mandar los ~700 movimientos de un usuario hacia el navegador en
 * cada navegacion era la razon por la que esta seccion se sentia mas lenta que las otras.
 * 300 cubren cerca de cinco meses, que es mas de lo que alguien revisa a mano; si algun dia
 * hace falta el historial completo, el filtro se mueve al servidor con `searchParams`.
 */
export const TOPE_MOVIMIENTOS = 300;

/** Los movimientos del usuario, mas recientes primero. Para la seccion Movimientos. */
export async function movimientosDe(usuarioId: string, cuantos = TOPE_MOVIMIENTOS): Promise<Movimiento[]> {
  return movimientosRecientes(usuarioId, cuantos);
}

/** Cuantos movimientos tiene en total, para poder decir "300 de 683". */
export async function totalMovimientosDe(usuarioId: string): Promise<number> {
  const filas = await leerTabla("movimientos");
  return filas.filter((f) => f.usuario_id === usuarioId).length;
}

/** Las categorias que el usuario usa de verdad, para los filtros. */
export async function categoriasUsadas(usuarioId: string): Promise<{ id: string; nombre: string }[]> {
  const movimientos = await movimientosDe(usuarioId);
  const vistas = new Map<string, string>();
  for (const m of movimientos) vistas.set(m.categoriaId, m.categoria);
  return [...vistas].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es-MX"));
}

export type Perfil = {
  /** El nombre completo, con los dos apellidos: el de `lib/usuarios.ts` es el corto. */
  nombreCompleto: string;
  edad: number;
  ocupacion: string;
  ingresoMensualCentavos: number;
  /** Carmen cobra por proyecto: su ingreso es el promedio de doce meses. */
  ingresoEsVariable: boolean;
  ciudad: string;
  estado: string;
  segmento: "nomina" | "preferente" | "patrimonial";
  /** "AAAA-MM-DD". */
  clienteDesde: string;
  correo: string;
  telefono: string;
};

/**
 * Quien es la persona, de `banorte.usuarios`: lo que muestra la tarjeta de datos personales
 * de Mas. Es lo mismo que lee el agente para decidir (edad, ingreso, segmento), asi que la
 * pantalla ensena con que datos trabaja Maya. `undefined` si la persona no esta en la base.
 */
export async function perfilDe(usuarioId: string): Promise<Perfil | undefined> {
  const filas = await leerTabla("usuarios");
  const f = filas.find((fila) => fila.id === usuarioId);
  if (!f) return undefined;
  return {
    nombreCompleto: f.nombre!,
    edad: entero(f.edad),
    ocupacion: f.ocupacion!,
    ingresoMensualCentavos: entero(f.ingreso_mensual_centavos),
    ingresoEsVariable: booleano(f.ingreso_es_variable),
    ciudad: f.ciudad!,
    estado: f.estado!,
    segmento: f.segmento as Perfil["segmento"],
    clienteDesde: f.cliente_desde!,
    correo: f.correo!,
    telefono: f.telefono!,
  };
}
