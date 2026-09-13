/**
 * Agrupacion de movimientos por periodo relativo ("Hoy", "Ayer", "Esta semana"...).
 *
 * Es un modulo puro y sin React a proposito: la regla de a que periodo pertenece una
 * fecha es logica de negocio, se prueba sola y no depende de como se pinte.
 *
 * La idea en palabras: en un estado de cuenta nadie busca "12 de agosto", busca "lo de
 * esta semana". El agrupador toma la lista ya ordenada de mas reciente a mas antigua y
 * le pone a cada movimiento la etiqueta del periodo en el que cae, medido contra un
 * "hoy" que se recibe como parametro (nunca `new Date()` aqui dentro: eso haria la
 * funcion imposible de probar).
 *
 * El detalle, los limites y los casos de borde estan en
 * `docs/algoritmos/agrupacion-por-periodo.md`.
 */

/** La zona en la que vive la demo. Las fechas del dominio son "AAAA-MM-DD" en esta zona. */
export const ZONA_DEMO = "America/Monterrey";

/**
 * El "hoy" del dominio, como "AAAA-MM-DD" y en la zona de la demo.
 *
 * Se calcula en el SERVIDOR y se pasa como prop: el servidor de produccion corre en
 * UTC+2, donde a las 6 de la tarde de Monterrey ya es el dia siguiente, y si cada lado
 * calculara su propio "hoy" el HTML del servidor y el del cliente no coincidirian.
 *
 * `en-CA` es el atajo estandar para que `Intl` devuelva justo "AAAA-MM-DD".
 */
export function hoyEnZona(ahora: Date = new Date(), zona: string = ZONA_DEMO): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/** Las fechas se manipulan en UTC para que ningun cambio de horario mueva un dia. */
function aFecha(iso: string): Date {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio ?? 1970, (mes ?? 1) - 1, dia ?? 1));
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(iso: string, dias: number): string {
  const fecha = aFecha(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aIso(fecha);
}

/** El lunes de la semana de `iso`. La semana empieza en lunes, como en Mexico. */
function lunesDe(iso: string): string {
  const diaSemana = aFecha(iso).getUTCDay(); // 0 = domingo
  return sumarDias(iso, -((diaSemana + 6) % 7));
}

/** "2026-07" -> "Julio 2026", o "Julio" si es del mismo anio que hoy. */
function etiquetaDeMes(iso: string, hoy: string): string {
  const mismoAnio = iso.slice(0, 4) === hoy.slice(0, 4);
  const texto = new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    month: "long",
    ...(mismoAnio ? {} : { year: "numeric" }),
  }).format(aFecha(iso));
  // "julio de 2026" -> "Julio 2026": `Intl` en espanol mete "de" y arranca en minuscula.
  const limpio = texto.replace(" de ", " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * A que periodo pertenece una fecha.
 *
 * El orden de las comparaciones ES el algoritmo: se prueba de lo mas especifico a lo
 * mas general, y el primero que acepta se queda con la fecha. Asi "ayer" gana sobre
 * "esta semana" aunque tambien caiga dentro, y los rangos nunca se traslapan.
 */
export function periodoDe(fecha: string, hoy: string): { clave: string; etiqueta: string } {
  if (fecha > hoy) return { clave: "proximos", etiqueta: "Próximos días" };
  if (fecha === hoy) return { clave: "hoy", etiqueta: "Hoy" };
  if (fecha === sumarDias(hoy, -1)) return { clave: "ayer", etiqueta: "Ayer" };

  const lunesActual = lunesDe(hoy);
  if (fecha >= lunesActual) return { clave: "esta-semana", etiqueta: "Esta semana" };
  if (fecha >= sumarDias(lunesActual, -7)) {
    return { clave: "semana-pasada", etiqueta: "Semana pasada" };
  }

  const mesActual = hoy.slice(0, 7);
  if (fecha.slice(0, 7) === mesActual) return { clave: "este-mes", etiqueta: "Este mes" };

  const mesPasado = sumarDias(`${mesActual}-01`, -1).slice(0, 7);
  if (fecha.slice(0, 7) === mesPasado) return { clave: "mes-pasado", etiqueta: "Mes pasado" };

  const mes = fecha.slice(0, 7);
  return { clave: `mes-${mes}`, etiqueta: etiquetaDeMes(`${mes}-01`, hoy) };
}

/** Lo minimo que necesita un movimiento para poder agruparse y sumarse. */
export type Agrupable = {
  fecha: string;
  tipo: "cargo" | "abono";
  montoCentavos: number;
};

export type GrupoPeriodo<T> = {
  clave: string;
  etiqueta: string;
  movimientos: T[];
  /** Abonos menos cargos, en centavos. Negativo cuando en el periodo se gasto mas de lo que entro. */
  netoCentavos: number;
};

/**
 * Agrupa los movimientos por periodo, del mas reciente al mas antiguo.
 *
 * Ordena una copia antes de agrupar: la consulta ya los entrega descendentes, pero la
 * funcion no tiene por que confiar en eso para ser correcta, y con 300 filas el costo
 * de ordenar es irrelevante.
 */
export function agruparPorPeriodo<T extends Agrupable>(
  movimientos: readonly T[],
  hoy: string,
): GrupoPeriodo<T>[] {
  const ordenados = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const grupos: GrupoPeriodo<T>[] = [];
  const porClave = new Map<string, GrupoPeriodo<T>>();

  for (const movimiento of ordenados) {
    const { clave, etiqueta } = periodoDe(movimiento.fecha, hoy);
    let grupo = porClave.get(clave);
    if (!grupo) {
      grupo = { clave, etiqueta, movimientos: [], netoCentavos: 0 };
      porClave.set(clave, grupo);
      grupos.push(grupo);
    }
    grupo.movimientos.push(movimiento);
    grupo.netoCentavos += movimiento.tipo === "abono" ? movimiento.montoCentavos : -movimiento.montoCentavos;
  }

  return grupos;
}

/** Cargos y abonos por separado: es lo que se pinta arriba de la lista. */
export function totalizar(movimientos: readonly Agrupable[]): {
  gastadoCentavos: number;
  recibidoCentavos: number;
} {
  let gastadoCentavos = 0;
  let recibidoCentavos = 0;
  for (const movimiento of movimientos) {
    if (movimiento.tipo === "abono") recibidoCentavos += movimiento.montoCentavos;
    else gastadoCentavos += movimiento.montoCentavos;
  }
  return { gastadoCentavos, recibidoCentavos };
}
