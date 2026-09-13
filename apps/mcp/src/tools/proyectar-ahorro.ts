import { EntradaProyectarAhorro, SalidaProyectarAhorro } from "@maya/schemas";
import { aEntero, filtrar } from "../datos/index.js";
import { apartadosCreados, capacidadPagoMensual, cuentaDe, planAplicado } from "../dominio/consultas.js";
import { creditosAPlazo } from "../dominio/creditos.js";
import { mensualExternoDe } from "../dominio/gastos-externos.js";
import { pesos } from "../dominio/suscripciones.js";
import { hoy, periodoAnterior, periodoDe, sumarMeses } from "../dominio/tiempo.js";
import type { DefinicionDeTool } from "./registro.js";

/**
 * `proyectar_ahorro` — LECTURA (calcula). La fase 3, y la respuesta adaptativa de Ana:
 * sin deuda que reestructurar, lo que el agente puede hacer por ella es ayudarla a
 * ahorrar. Devuelve cuanto puede apartar, cuando llegaria y tres escenarios para el
 * slider del simulador.
 *
 * Detalle y supuestos: `docs/algoritmos/proyeccion-de-ahorro.md`.
 */

/** Meses de historia que se promedian para estimar lo que a la persona le sobra. */
const MESES_DE_FLUJO = 3;
/** Tope de la proyeccion: 40 anios. Mas alla de eso el numero no informa, asusta. */
const MESES_MAXIMOS = 480;

export const proyectarAhorro: DefinicionDeTool = {
  nombre: "proyectar_ahorro",
  titulo: "Proyectar una meta de ahorro",
  descripcion:
    "Calcula en cuanto tiempo la persona llega a una meta de ahorro: usa una meta que ya tenga " +
    "(`metaId`) o una nueva (`montoObjetivoCentavos`), con la aportacion que le pases o la que su flujo " +
    "permite. Devuelve meses, fecha estimada y tres escenarios (conservador, sugerido, agresivo) para " +
    "que el simulador tenga de donde tirar. «Lo quiero para diciembre»: manda `fechaObjetivo` con el ULTIMO " +
    "dia de ese mes (diciembre de este anio = 2026-12-31) y la tool calcula cuanto tiene que apartar por " +
    "periodo para llegar, proyecta con eso y lo devuelve en `aportacionNecesariaCentavos`; si ademas mandas " +
    "`aportacionCentavos`, GANA LA FECHA. «Que sean $80,000»: manda `montoObjetivoCentavos`. Si trae `aviso` " +
    "(no le alcanza lo libre, o la fecha ya paso), ponlo en la tarjeta tal cual. NO crea nada: para eso es " +
    "`crear_apartado`.",
  clase: "lectura",
  entrada: EntradaProyectarAhorro.shape,
  manejar: (argumentos) => {
    const entrada = EntradaProyectarAhorro.parse(argumentos);
    const frecuencia = entrada.frecuencia ?? "mensual";

    // Un `montoObjetivoCentavos` sin `metaId` es una meta NUEVA: no hereda lo que la
    // persona ya lleva ahorrado en otra meta, o el slider del simulador arrancaria con
    // avance que no le corresponde.
    const esSimulacionNueva = entrada.montoObjetivoCentavos !== undefined && entrada.metaId === undefined;
    const meta = esSimulacionNueva ? undefined : elegirMeta(entrada.usuarioId, entrada.metaId);
    const saldoInicial = meta ? aEntero(meta.monto_actual_centavos) : 0;
    const objetivo = entrada.montoObjetivoCentavos ?? (meta ? aEntero(meta.monto_objetivo_centavos) : 0);
    if (objetivo <= 0) {
      throw new Error("no se contra que proyectar: pasa montoObjetivoCentavos o un metaId con objetivo");
    }

    const capacidad = capacidadDeAhorro(entrada.usuarioId);
    const sugerida = meta ? aEntero(meta.aportacion_sugerida_centavos) || capacidad : capacidad;
    // El cero llega de verdad, por dos caminos: el slider del simulador en su minimo y
    // el modelo cuando no sabe que poner (paso el 2026-09-12 en el ensayo del guion).
    // Tratarlo como "no me dijiste nada" y usar la capacidad calculada es mas util que
    // tumbar la pantalla: quien pregunta cuanto tarda en juntar algo no quiere un error.
    const pedida = entrada.aportacionCentavos && entrada.aportacionCentavos > 0 ? entrada.aportacionCentavos : undefined;
    const faltante = Math.max(0, objetivo - saldoInicial);

    // «Lo quiero para diciembre»: la fecha manda sobre la aportacion que venga.
    const porFecha = entrada.fechaObjetivo
      ? aportacionParaFecha(faltante, entrada.fechaObjetivo, frecuencia, capacidad)
      : null;
    // Con fecha, la aportacion es la que hace falta. Si la fecha no deja ni un mes, no se
    // inventa una: se proyecta con lo libre. Sin fecha (o sin faltante), como siempre.
    const aportacion = porFecha?.aportacionCentavos
      ? porFecha.aportacionCentavos
      : porFecha?.sinPeriodos && capacidad > 0
        ? capacidad
        : (pedida ?? sugerida);
    if (aportacion <= 0) {
      throw new Error(
        "no hay con que proyectar: la capacidad de ahorro calculada es cero, pasa aportacionCentavos mayor que cero",
      );
    }

    const proyeccion = proyectar(faltante, aportacion, frecuencia);
    const aviso = porFecha?.sinPeriodos
      ? avisoSinPeriodos(entrada.fechaObjetivo!, capacidad, proyeccion.fecha)
      : (porFecha?.aviso ?? null);

    return SalidaProyectarAhorro.parse({
      meta: meta ? { id: meta.id, nombre: meta.nombre, estatus: meta.estatus } : null,
      cuentaOrigenId: meta?.cuenta_origen_id ?? cuentaDe(entrada.usuarioId, "ahorro")?.id ?? null,
      saldoInicialCentavos: saldoInicial,
      montoObjetivoCentavos: objetivo,
      faltanteCentavos: faltante,
      capacidadMensualCentavos: capacidad,
      aportacionCentavos: aportacion,
      frecuencia,
      mesesEstimados: proyeccion.meses,
      fechaEstimada: proyeccion.fecha,
      escenarios: escenarios(faltante, aportacion, frecuencia, capacidad),
      aportacionNecesariaCentavos: porFecha ? porFecha.aportacionCentavos : null,
      aviso,
    });
  },
};

/**
 * La meta base cuando no es una simulacion desde cero: la que pidan por id, o la meta
 * activa mas cercana a cumplirse (la que mas le importa a la persona hoy). Los apartados que la propia demo creo cuentan como
 * metas: por eso `crear_apartado` se ve reflejado en la siguiente proyeccion.
 */
function elegirMeta(usuarioId: string, metaId?: string) {
  const creadas = apartadosCreados(usuarioId).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    estatus: "activa",
    cuenta_origen_id: a.cuentaOrigenId,
    monto_objetivo_centavos: String(a.montoObjetivoCentavos),
    monto_actual_centavos: String(a.montoActualCentavos),
    aportacion_sugerida_centavos: String(a.aportacionCentavos),
    fecha_objetivo: a.fechaObjetivo,
  }));
  const delCsv = filtrar("metas", "usuario_id", usuarioId).map((m) => ({
    id: m.id ?? "",
    nombre: m.nombre ?? "",
    estatus: m.estatus ?? "activa",
    cuenta_origen_id: m.cuenta_origen_id ?? "",
    monto_objetivo_centavos: m.monto_objetivo_centavos ?? "0",
    monto_actual_centavos: m.monto_actual_centavos ?? "0",
    aportacion_sugerida_centavos: m.aportacion_sugerida_centavos ?? "0",
    fecha_objetivo: m.fecha_objetivo ?? "",
  }));
  const todas = [...creadas, ...delCsv];

  if (metaId) {
    const exacta = todas.find((m) => m.id === metaId);
    if (!exacta) throw new Error(`no existe la meta ${metaId} para ${usuarioId}`);
    return exacta;
  }
  return todas
    .filter((m) => m.estatus === "activa")
    .sort((a, b) => (a.fecha_objetivo ?? "").localeCompare(b.fecha_objetivo ?? ""))[0];
}

/**
 * Lo que la persona puede apartar al mes. Se toma lo MENOR entre lo que su flujo
 * historico dejo libre (ingresos menos gastos, promedio de 3 meses) y la capacidad de
 * pago de buro: prometerle ahorrar mas de lo que le sobra es prometerle que fallara.
 * Si ya tiene un plan de pago activo, su mensualidad se descuenta; y tambien los abonos a
 * capital que haya programado (`programar_abono_capital`): son dinero que ya sale cada mes, y
 * sin descontarlos el simulador de Ana le ofreceria ahorrar lo mismo que acaba de mandar al
 * credito (`docs/como-funciona/ajustes-en-vivo.md`).
 *
 * Los gastos MENSUALES de fuera del banco (`registrar_gasto_externo`) salen de los dos lados:
 * del flujo, porque ningun movimiento los muestra, y de la capacidad de buro, que ya los trae
 * restados (`capacidadPagoMensual`). `mensualExternoExtraCentavos` es lo que una simulacion
 * agregaria encima sin guardarlo (`simular_gasto_externo`); negativo si quita uno guardado.
 * `docs/algoritmos/gastos-fuera-del-banco.md`.
 */
export function capacidadDeAhorro(usuarioId: string, mensualExternoExtraCentavos = 0): number {
  const movimientos = filtrar("movimientos", "usuario_id", usuarioId);
  let periodo = periodoDe(hoy());
  let libre = 0;
  for (let i = 0; i < MESES_DE_FLUJO; i++) {
    periodo = periodoAnterior(periodo);
    let ingreso = 0;
    let gasto = 0;
    for (const m of movimientos) {
      if (!(m.fecha ?? "").startsWith(periodo)) continue;
      const monto = aEntero(m.monto_centavos);
      if (m.tipo === "abono") ingreso += monto;
      else gasto += monto;
    }
    libre += Math.max(0, ingreso - gasto);
  }
  const delFlujo = Math.round(libre / MESES_DE_FLUJO);
  const plan = planAplicado(usuarioId);
  const abonos = creditosAPlazo(usuarioId).reduce((suma, c) => suma + (c.abonoMensualCentavos ?? 0), 0);
  const comprometido = (plan?.mensualidadCentavos ?? 0) + abonos;
  const externo = mensualExternoDe(usuarioId) + mensualExternoExtraCentavos;
  const deBuro = capacidadPagoMensual(usuarioId) - mensualExternoExtraCentavos;
  return Math.max(0, Math.min(delFlujo - externo, deBuro) - comprometido);
}

/**
 * Cuantos meses caben de hoy a la fecha: el mayor `M` con `hoy + M meses <= fecha`. Es la
 * misma cuenta con la que `proyectar` pone la fecha estimada, asi que proyectar con la
 * aportacion que sale de aqui nunca cae despues de la fecha objetivo.
 */
export function mesesHasta(fechaObjetivo: string): number {
  const inicio = hoy();
  let meses = 0;
  while (meses < MESES_MAXIMOS && sumarMeses(inicio, meses + 1) <= fechaObjetivo) meses++;
  return meses;
}

type PorFecha = {
  /** Por periodo (quincena o mes). null si la fecha no deja ni un periodo. */
  aportacionCentavos: number | null;
  sinPeriodos: boolean;
  aviso: string | null;
};

/**
 * La aportacion que cubre el faltante en los periodos que caben hasta la fecha (la quincenal
 * cuenta dos por mes, igual que en `proyectar`), redondeada hacia arriba al centavo para que
 * alcance. Si por mes rebasa lo libre, se avisa pero se proyecta con ella: la persona pidio
 * esa fecha. Si la fecha no deja ni un mes, no se inventa una aportacion.
 */
function aportacionParaFecha(
  faltante: number,
  fechaObjetivo: string,
  frecuencia: "mensual" | "quincenal",
  capacidad: number,
): PorFecha {
  const meses = mesesHasta(fechaObjetivo);
  if (meses === 0) return { aportacionCentavos: null, sinPeriodos: true, aviso: null };

  const periodosPorMes = frecuencia === "quincenal" ? 2 : 1;
  const necesaria = Math.ceil(faltante / (meses * periodosPorMes));
  const porMes = necesaria * periodosPorMes;
  if (porMes <= capacidad) return { aportacionCentavos: necesaria, sinPeriodos: false, aviso: null };

  const cuanto =
    frecuencia === "quincenal"
      ? `${pesos(necesaria)} cada quincena (${pesos(porMes)} al mes)`
      : `${pesos(necesaria)} al mes`;
  const libre =
    capacidad > 0 ? `más de los ${pesos(capacidad)} que te quedan libres al mes` : "y hoy no te queda nada libre para ahorrar";
  return {
    aportacionCentavos: necesaria,
    sinPeriodos: false,
    aviso: `Para llegar al ${enPalabras(fechaObjetivo)} necesitas apartar ${cuanto}, ${libre}.`,
  };
}

/** La fecha ya paso o no deja ni un mes: se dice, con lo mas cerca que se puede llegar. */
function avisoSinPeriodos(fechaObjetivo: string, capacidad: number, fechaConCapacidad: string): string {
  const inicio = hoy();
  const motivo = fechaObjetivo <= inicio ? "ya pasó" : "no deja ni un mes para ahorrar";
  const conLoLibre =
    capacidad > 0 ? `; con los ${pesos(capacidad)} que te quedan libres al mes llegarías el ${enPalabras(fechaConCapacidad)}` : "";
  return (
    `El ${enPalabras(fechaObjetivo)} ${motivo}. La fecha más cercana posible es el ` +
    `${enPalabras(sumarMeses(inicio, 1))}${conLoLibre}.`
  );
}

/** «31 de diciembre», con el año solo si no es el de hoy: «30 de junio de 2027». */
function enPalabras(fechaISO: string): string {
  const texto = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${fechaISO}T12:00:00Z`),
  );
  return fechaISO.slice(0, 4) === hoy().slice(0, 4) ? texto : `${texto} de ${fechaISO.slice(0, 4)}`;
}

/**
 * Ahorro simple, sin rendimiento: aportaciones iguales hasta cubrir el faltante. No se
 * modela interes compuesto a proposito — un apartado no invierte, y prometer rendimiento
 * en una demo financiera es lo unico que no se puede hacer.
 */
function proyectar(faltanteCentavos: number, aportacionCentavos: number, frecuencia: "mensual" | "quincenal") {
  const porMes = frecuencia === "quincenal" ? aportacionCentavos * 2 : aportacionCentavos;
  const meses = Math.min(MESES_MAXIMOS, Math.max(1, Math.ceil(faltanteCentavos / porMes)));
  return { meses, fecha: sumarMeses(hoy(), meses) };
}

/** Tres puntos para el slider: la mitad de la aportacion, la aportacion, y vez y media. */
function escenarios(
  faltante: number,
  aportacion: number,
  frecuencia: "mensual" | "quincenal",
  capacidad: number,
) {
  return [
    Math.round(aportacion * 0.5),
    aportacion,
    Math.round(aportacion * 1.5),
  ].map((monto) => {
    const p = proyectar(faltante, monto, frecuencia);
    const porMes = frecuencia === "quincenal" ? monto * 2 : monto;
    return {
      aportacionCentavos: monto,
      frecuencia,
      mesesEstimados: p.meses,
      fechaEstimada: p.fecha,
      cabeEnCapacidad: porMes <= capacidad,
    };
  });
}
