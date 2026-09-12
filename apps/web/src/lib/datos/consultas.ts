import "server-only";

import { booleano, entero, fraccion, leerTabla } from "./leer-csv";

/**
 * Consultas tipadas sobre los CSV. Es la capa que separa "como estan guardados los
 * datos" de "que necesita la pantalla": si manana esto lee de Postgres, los
 * componentes no cambian una linea.
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
  producto: string;
  mascara: string;
  marca: string;
  tipo: "debito" | "credito";
  limiteCentavos: number;
  saldoCentavos: number;
  /** Fraccion del limite usada. 0 en debito. Es el numero que delata a Beto: 0.967. */
  utilizacion: number;
  pagoMinimoCentavos: number;
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
        producto: f.producto!,
        mascara: f.mascara!,
        marca: f.marca!,
        tipo: f.tipo as Tarjeta["tipo"],
        limiteCentavos: limite,
        saldoCentavos: saldo,
        utilizacion: limite > 0 ? saldo / limite : 0,
        pagoMinimoCentavos: entero(f.pago_minimo_centavos),
        diasMora: entero(f.dias_mora),
      };
    });
}

/**
 * Los ultimos `cuantos` movimientos, mas recientes primero. El CSV ya viene en orden
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

/**
 * Lo que necesita el heroe de Inicio. `disponible` es solo lo liquido: las cuentas de
 * credito no suman patrimonio, restan. Confundirlas es como un banco pierde la
 * confianza de quien lee la pantalla.
 */
export async function resumenDe(usuarioId: string): Promise<{
  disponibleCentavos: number;
  deudaCentavos: number;
  cuentaPrincipal: Cuenta | undefined;
}> {
  const [cuentas, creditos] = await Promise.all([cuentasDe(usuarioId), creditosDe(usuarioId)]);

  return {
    disponibleCentavos: cuentas
      .filter((c) => c.tipo !== "credito")
      .reduce((total, c) => total + c.saldoCentavos, 0),
    deudaCentavos: creditos.reduce((total, c) => total + c.saldoInsolutoCentavos, 0),
    cuentaPrincipal: cuentas.find((c) => c.esPrincipal) ?? cuentas[0],
  };
}

/** Todos los movimientos del usuario, mas recientes primero. Para la seccion Movimientos. */
export async function movimientosDe(usuarioId: string): Promise<Movimiento[]> {
  return movimientosRecientes(usuarioId, Number.MAX_SAFE_INTEGER);
}

/** Las categorias que el usuario usa de verdad, para los filtros. */
export async function categoriasUsadas(usuarioId: string): Promise<{ id: string; nombre: string }[]> {
  const movimientos = await movimientosDe(usuarioId);
  const vistas = new Map<string, string>();
  for (const m of movimientos) vistas.set(m.categoriaId, m.categoria);
  return [...vistas].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es-MX"));
}
