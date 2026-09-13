import { z } from "zod";
import type {
  SalidaAnalizarGasto,
  SalidaCompararPeriodos,
  SalidaConsultarCreditos,
  SalidaConsultarHistoricoInversion,
  SalidaConsultarInversiones,
  SalidaConsultarMovimientos,
  SalidaConsultarTarjeta,
  SalidaDetectarFugas,
  SalidaDiagnosticoSaludFinanciera,
  SalidaProyectarAhorro,
  SalidaSimularRebalanceo,
  SalidaSimularReestructura,
} from "@maya/schemas";

/**
 * Las fuentes de los widgets: **el unico camino por el que un numero llega a una tarjeta
 * de Inicio**.
 *
 * ## La regla
 *
 * El modelo decide QUE preguntarle al banco (una fuente y sus parametros); el MCP contesta
 * con los numeros; un adaptador de este archivo —codigo, no prompt— los acomoda en las
 * props del componente. El modelo nunca escribe un monto, un porcentaje ni un saldo. Ver
 * `docs/decisiones/0011-cifras-solo-del-mcp.md`.
 *
 * Antes de esto, `pintar_pantalla` recibia las props con las cifras escritas por el
 * modelo, copiadas (o no) de lo que devolvieron las tools. Lo que se validaba era la
 * FORMA. Las portadas guardadas el 2026-09-13 lo muestran: la conclusion de Beto decia
 * "$2,954,065" de credito restante, cuando la tool devuelve 2954065 CENTAVOS ($29,540.65).
 *
 * ## Que es una fuente
 *
 * - `componente` y `tool`: que tarjeta llena y con que tool del MCP (solo de lectura).
 * - `parametros`: lo que el modelo PUEDE elegir. Periodos, plazos a cotizar, ids,
 *   montos objetivo de una simulacion: **entradas** para el MCP, nunca resultados.
 * - `argumentos`: de los parametros a los argumentos de la tool, sin `usuarioId` (lo pone
 *   el consultor desde la sesion, no el modelo).
 * - `adaptar`: de la salida de la tool a las props de datos. Pura y determinista: con la
 *   misma salida da las mismas props, y es lo que el auditor vuelve a correr.
 * - `variantes`: props de VISTA que el modelo puede fijar (orden, limite, plazo
 *   preseleccionado). Un enum o un conteo, nunca una cifra que se lea como dato.
 *
 * Detalle de cada adaptador: `docs/algoritmos/adaptadores-de-widget.md`.
 */

export type Adaptado = { ok: true; props: Record<string, unknown> } | { ok: false; motivo: string };

export type DefinicionDeFuente = {
  id: string;
  componente: string;
  tool: string;
  /** Una linea para el modelo: que muestra y cuando conviene. */
  describe: string;
  parametros: z.ZodType<Record<string, unknown>>;
  /** Una linea para el modelo con los parametros y su forma, con ejemplo. */
  describeParametros?: string;
  argumentos: (parametros: Record<string, unknown>) => Record<string, unknown>;
  adaptar: (salida: unknown, parametros: Record<string, unknown>) => Adaptado;
  variantes: z.ZodObject<z.ZodRawShape>;
  /**
   * Completa los parametros consultando OTRA tool de lectura antes de armar los argumentos:
   * la persona dice «NAFTRAC», la tool pide `inst_naftrac`. Lo que devuelve es lo que se
   * guarda en la procedencia, asi el auditor reproduce la consulta sin volver a resolver.
   */
  resolver?: (
    parametros: Record<string, unknown>,
    consultar: (tool: string, argumentos: Record<string, unknown>) => Promise<{ ok: boolean; resultado: unknown }>,
  ) => Promise<{ ok: true; parametros: Record<string, unknown> } | { ok: false; motivo: string }>;
  /** Una variante que depende de los datos (el plazo tiene que ser una de las opciones). */
  revisarVariantes?: (props: Record<string, unknown>, variantes: Record<string, unknown>) => string | undefined;
};

const Periodo = z.string().regex(/^\d{4}-\d{2}$/, "usa AAAA-MM");
const sinParametros = z.object({}).strict();
const sinVariantes = z.object({}).strict();

/** `2026-08` -> `2026-08-01` y `2026-08-31`. */
export function rangoDelMes(periodo: string): { desde: string; hasta: string } {
  const [anio, mes] = periodo.split("-").map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(ultimo).padStart(2, "0")}` };
}

/** Quita las llaves `undefined`: dos pedidos iguales tienen que dar la misma llave de cache. */
function limpio(objeto: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined));
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Una salida que es `{ error }` es una tool que fallo: no se adapta, se reporta. */
function fallo(salida: unknown): string | undefined {
  if (!esObjeto(salida)) return "la tool no devolvio un objeto";
  if (typeof salida.error === "string") return salida.error;
  return undefined;
}

// --- Deuda -----------------------------------------------------------------------------

const tarjeta: DefinicionDeFuente = {
  id: "tarjeta",
  componente: "ResumenTarjeta",
  tool: "consultar_tarjeta",
  describe: "La tarjeta de credito: saldo, limite, pago minimo, fecha limite, mora y plan activo.",
  parametros: sinParametros,
  argumentos: () => ({}),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaConsultarTarjeta;
    if (!s.tarjeta) return { ok: false, motivo: "la persona no tiene tarjeta de credito" };
    const plan = s.planActivo;
    return {
      ok: true,
      props: limpio({
        mascara: s.tarjeta.mascara,
        saldoCentavos: s.tarjeta.saldoCentavos,
        limiteCentavos: s.tarjeta.limiteCentavos,
        // Con plan, el minimo ya no aplica: la tarjeta muestra la mensualidad del plan.
        pagoMinimoCentavos: plan ? undefined : s.tarjeta.pagoMinimoCentavos,
        fechaLimitePago: plan ? plan.primerPagoFecha : s.tarjeta.fechaLimitePago,
        diasMora: s.tarjeta.diasMora,
        planActivo: plan !== null,
        mensualidadCentavos: plan?.mensualidadCentavos,
      }),
    };
  },
  variantes: sinVariantes,
};

const planDePago: DefinicionDeFuente = {
  id: "plan_de_pago",
  componente: "PlanDePago",
  tool: "simular_reestructura",
  describe: "Las opciones para diferir la deuda de la tarjeta a plazo fijo, con mensualidad, CAT y ahorro.",
  parametros: z
    .object({ plazosMeses: z.array(z.number().int().min(3).max(60)).min(1).max(6).optional() })
    .strict(),
  describeParametros: '{"plazosMeses":[12,24]} para cotizar plazos concretos; sin parametros cotiza 12, 18, 24 y 36',
  argumentos: (p) => limpio({ plazosMeses: p.plazosMeses }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaSimularReestructura;
    if (s.opciones.length === 0) return { ok: false, motivo: "no hay opciones de reestructura para esta tarjeta" };
    const opciones = [...s.opciones]
      .sort((a, b) => a.plazoMeses - b.plazoMeses)
      .map((o) =>
        limpio({
          plazoMeses: o.plazoMeses,
          mensualidadCentavos: o.mensualidadCentavos,
          cat: o.cat,
          ahorroCentavos: o.ahorroVsMinimoCentavos,
          recomendado: o.esRecomendado || undefined,
        }),
      );
    return {
      ok: true,
      props: limpio({ opciones, tarjetaId: s.tarjetaId, plazoElegido: s.plazoRecomendado ?? undefined }),
    };
  },
  variantes: z.object({ plazoElegido: z.number().int().optional() }).strict(),
  revisarVariantes: (props, variantes) => {
    if (variantes.plazoElegido === undefined) return undefined;
    const plazos = (props.opciones as Array<{ plazoMeses: number }>).map((o) => o.plazoMeses);
    return plazos.includes(variantes.plazoElegido as number)
      ? undefined
      : `plazoElegido ${String(variantes.plazoElegido)} no esta entre los plazos cotizados (${plazos.join(", ")}); ` +
          "pide ese plazo en `parametros.plazosMeses`";
  },
};

const credito: DefinicionDeFuente = {
  id: "credito",
  componente: "ProyeccionPagoCredito",
  tool: "consultar_creditos",
  describe:
    "Un credito a plazo (nomina, personal, auto): saldo insoluto, mensualidad, tasa, meses que faltan e intereses por pagar.",
  parametros: z.object({ creditoId: z.string().min(1).optional() }).strict(),
  describeParametros: '{"creditoId":"cre_…"} para uno en concreto; sin parametros, el mas caro con saldo',
  argumentos: () => ({ incluirAmortizacion: true, proximosPagos: 12 }),
  adaptar: (salida, p) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaConsultarCreditos;
    const conSaldo = s.creditos.filter((c) => c.saldoInsolutoCentavos > 0);
    const elegido = p.creditoId
      ? s.creditos.find((c) => c.id === p.creditoId)
      : (conSaldo.find((c) => c.id === s.creditoMasCaroId) ??
        [...conSaldo].sort((a, b) => b.saldoInsolutoCentavos - a.saldoInsolutoCentavos)[0]);
    if (!elegido) {
      return {
        ok: false,
        motivo: p.creditoId
          ? `no hay un credito ${String(p.creditoId)}; los que hay: ${s.creditos.map((c) => c.id).join(", ") || "ninguno"}`
          : "la persona no tiene creditos a plazo con saldo",
      };
    }
    const pendientes = elegido.amortizacion.filter((a) => a.estatus !== "pagado");
    const hitos = elegirHitos(pendientes.length).map((i) => {
      const pago = pendientes[i]!;
      return {
        numeroPago: pago.numeroPago,
        periodo: pago.saldoFinalCentavos === 0 ? "Liquidación" : `Mes ${i + 1}`,
        capitalCentavos: pago.capitalCentavos,
        interesCentavos: pago.interesCentavos,
        saldoFinalCentavos: pago.saldoFinalCentavos,
      };
    });
    if (hitos.length < 2) return { ok: false, motivo: `el credito ${elegido.id} no tiene suficientes pagos pendientes` };
    return {
      ok: true,
      props: {
        creditoId: elegido.id,
        alias: elegido.alias,
        saldoInsolutoCentavos: elegido.saldoInsolutoCentavos,
        mensualidadCentavos: elegido.mensualidadCentavos,
        tasaAnualPct: elegido.tasaAnual,
        plazoRestanteMeses: Math.max(1, Math.min(360, elegido.pagosRestantes)),
        // La formula que declara el catalogo: lo que falta pagar menos lo que se debe.
        totalInteresesEstimadosCentavos: Math.max(
          0,
          elegido.mensualidadCentavos * elegido.pagosRestantes - elegido.saldoInsolutoCentavos,
        ),
        amortizacionResumen: hitos,
      },
    };
  },
  variantes: sinVariantes,
};

/** Los hitos de una tabla de N pagos: el 1, el 3, el 6 y el ultimo que haya, sin repetir. */
export function elegirHitos(n: number): number[] {
  if (n <= 0) return [];
  return [...new Set([0, 2, 5, n - 1].filter((i) => i < n))].sort((a, b) => a - b);
}

// --- Gasto -----------------------------------------------------------------------------

const vistaDeGasto = z
  .object({
    orden: z.enum(["monto", "variacion", "nombre"]).optional(),
    limite: z.number().int().min(1).max(20).optional(),
  })
  .strict();

function gastoAProps(g: SalidaCompararPeriodos): Adaptado {
  const categorias = g.categorias.filter((c) => c.montoCentavos > 0);
  if (categorias.length === 0) return { ok: false, motivo: `no hay gasto registrado en ${g.periodo}` };
  const atipica = g.categorias.find((c) => c.categoriaId === g.categoriaAtipicaId);
  return {
    ok: true,
    props: limpio({
      periodo: g.periodo,
      totalCentavos: g.gastoCentavos,
      variacionPct: g.variacionPct,
      categorias: categorias.map((c) => ({
        categoriaId: c.categoriaId,
        nombre: c.nombre,
        montoCentavos: c.montoCentavos,
        variacionPct: c.variacionPct,
      })),
      categoriaAtipica: atipica?.nombre,
    }),
  };
}

const gastoDelMes: DefinicionDeFuente = {
  id: "gasto_del_mes",
  componente: "GastoPorCategoria",
  tool: "analizar_gasto",
  describe: "El gasto de un mes por categoria, contra el mes anterior, con la categoria atipica.",
  parametros: z.object({ periodo: Periodo.optional() }).strict(),
  describeParametros: '{"periodo":"2026-07"} para otro mes; sin parametros, el ultimo mes cerrado',
  argumentos: (p) => limpio({ periodo: p.periodo }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    return gastoAProps((salida as SalidaAnalizarGasto).gasto);
  },
  variantes: vistaDeGasto,
};

const gastoComparado: DefinicionDeFuente = {
  id: "gasto_comparado",
  componente: "GastoPorCategoria",
  tool: "comparar_periodos",
  describe: "El gasto de un mes por categoria comparado contra OTRO mes que elijas (no solo el anterior).",
  parametros: z.object({ periodo: Periodo, periodoAnterior: Periodo }).strict(),
  describeParametros: '{"periodo":"2026-08","periodoAnterior":"2026-05"}',
  argumentos: (p) => ({ periodo: p.periodo, periodoAnterior: p.periodoAnterior }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    return gastoAProps(salida as SalidaCompararPeriodos);
  },
  variantes: vistaDeGasto,
};

const detalleCategoria: DefinicionDeFuente = {
  id: "detalle_categoria",
  componente: "DetalleCategoria",
  tool: "consultar_movimientos",
  describe: "Los movimientos de UNA categoria (comercio, fecha, monto) en un mes o en los ultimos 30 dias.",
  parametros: z.object({ categoriaId: z.string().regex(/^cat_[a-z0-9_]+$/), periodo: Periodo.optional() }).strict(),
  describeParametros: '{"categoriaId":"cat_restaurantes","periodo":"2026-08"}; sin periodo, los ultimos 30 dias',
  argumentos: (p) => ({
    categoriaId: p.categoriaId,
    limite: 15,
    ...(typeof p.periodo === "string" ? rangoDelMes(p.periodo) : {}),
  }),
  adaptar: (salida, p) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaConsultarMovimientos;
    const cargos = s.movimientos.filter((m) => m.tipo === "cargo");
    if (cargos.length === 0) return { ok: false, motivo: `no hay cargos en ${String(p.categoriaId)} en ese rango` };
    return {
      ok: true,
      props: limpio({
        categoria: cargos[0]!.categoria,
        periodo: p.periodo,
        totalCentavos: s.sumaCargosCentavos,
        movimientos: cargos.map((m) =>
          limpio({
            fecha: m.fecha,
            comercio: m.comercio || m.descripcion,
            montoCentavos: m.montoCentavos,
            recurrente: m.esRecurrente || undefined,
          }),
        ),
        totalMovimientos: s.total,
      }),
    };
  },
  variantes: sinVariantes,
};

const fugas: DefinicionDeFuente = {
  id: "fugas",
  componente: "AlertaFugas",
  tool: "detectar_fugas",
  describe: "Las suscripciones y cargos recurrentes, cuanto suman al mes y al año, y cuales llevan meses sin uso.",
  parametros: z.object({ mesesSinUso: z.number().int().min(1).max(12).optional() }).strict(),
  describeParametros: '{"mesesSinUso":3} para marcar como sin uso las que llevan 3+ meses; default 2',
  argumentos: (p) => limpio({ mesesSinUso: p.mesesSinUso }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaDetectarFugas;
    if (s.suscripciones.length === 0) return { ok: false, motivo: "la persona no tiene suscripciones activas" };
    return {
      ok: true,
      props: {
        totalMensualCentavos: s.totalMensualCentavos,
        totalAnualCentavos: s.totalAnualCentavos,
        pctDelIngreso: s.pctDelIngreso,
        // Las sin uso primero: son las que la tarjeta invita a cancelar.
        fugas: [...s.suscripciones]
          .sort((a, b) => Number(b.sinUsoReciente) - Number(a.sinUsoReciente) || b.montoCentavos - a.montoCentavos)
          .map((x) => ({
            id: x.id,
            concepto: x.concepto,
            comercio: x.comercio,
            montoCentavos: x.montoCentavos,
            sinUsoReciente: x.sinUsoReciente,
            periodicidad: x.periodicidad,
          })),
      },
    };
  },
  variantes: sinVariantes,
};

// --- Salud y ahorro --------------------------------------------------------------------

const salud: DefinicionDeFuente = {
  id: "salud",
  componente: "TermometroSaludFinanciera",
  tool: "diagnostico_salud_financiera",
  describe: "El puntaje de salud financiera 0-100, su tendencia y los pilares (ahorro, deuda, fondo de emergencia).",
  parametros: z.object({ periodo: Periodo.optional() }).strict(),
  describeParametros: '{"periodo":"2026-06"} para otro mes; sin parametros, el mas reciente',
  argumentos: (p) => limpio({ periodo: p.periodo }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaDiagnosticoSaludFinanciera;
    if (s.ahorroLiquidoCentavos === undefined) {
      return { ok: false, motivo: "el MCP no devolvio ahorroLiquidoCentavos: actualiza apps/mcp" };
    }
    return {
      ok: true,
      props: limpio({
        puntajeSalud: s.puntajeSalud,
        calificacion: s.calificacion,
        tendencia: s.tendencia,
        cambioVsMesAnterior: s.cambioVsMesAnterior,
        ratioDeudaIngresoPct: s.ratioDeudaIngresoPct,
        tasaAhorroPct: s.tasaAhorroPct,
        mesesFondoEmergencia: s.mesesFondoEmergencia,
        montoAhorradoCentavos: s.ahorroLiquidoCentavos,
        // La tool dice cuando el habito ya no aplica: entonces no se pinta.
        habito: s.habito.vigente ? s.habito.texto : undefined,
      }),
    };
  },
  variantes: sinVariantes,
};

const parametrosDeAhorro = z
  .object({
    metaId: z.string().min(1).optional(),
    montoObjetivoCentavos: z.number().int().positive().optional(),
    aportacionCentavos: z.number().int().positive().optional(),
    frecuencia: z.enum(["mensual", "quincenal"]).optional(),
    nombre: z.string().min(1).max(40).optional(),
  })
  .strict();

const simuladorMeta: DefinicionDeFuente = {
  id: "simulador_meta",
  componente: "SimuladorMeta",
  tool: "proyectar_ahorro",
  describe:
    "Simula una meta de ahorro: cuanto aportar y en cuanto tiempo llega. Los montos de los parametros son la " +
    "simulacion que la persona pide (su objetivo, su aportacion), no resultados.",
  parametros: parametrosDeAhorro,
  describeParametros:
    '{"montoObjetivoCentavos":7249350,"nombre":"Fondo de emergencia"} para una meta nueva; ' +
    '{"aportacionCentavos":300000} si pide aportar otra cantidad; {"metaId":"meta_…"} para una que ya existe',
  argumentos: (p) =>
    limpio({
      metaId: p.metaId,
      montoObjetivoCentavos: p.montoObjetivoCentavos,
      aportacionCentavos: p.aportacionCentavos,
      frecuencia: p.frecuencia,
    }),
  adaptar: (salida, p) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaProyectarAhorro;
    const maxima = Math.max(s.capacidadMensualCentavos, s.aportacionCentavos, ...s.escenarios.map((e) => e.aportacionCentavos));
    return {
      ok: true,
      props: {
        nombre: s.meta?.nombre ?? (typeof p.nombre === "string" ? p.nombre : "Tu meta"),
        metaCentavos: s.montoObjetivoCentavos,
        saldoInicialCentavos: s.saldoInicialCentavos,
        aportacionCentavos: s.aportacionCentavos,
        aportacionMinimaCentavos: Math.min(50_000, s.aportacionCentavos),
        aportacionMaximaCentavos: maxima,
        frecuencia: s.frecuencia,
      },
    };
  },
  variantes: sinVariantes,
};

const metaActiva: DefinicionDeFuente = {
  id: "meta_activa",
  componente: "MetaActiva",
  tool: "proyectar_ahorro",
  describe: "Una meta de ahorro que YA existe: cuanto lleva, cuanto aparta y cuando llega.",
  parametros: z.object({ metaId: z.string().min(1).optional() }).strict(),
  describeParametros: '{"metaId":"meta_…"}; sin parametros, su meta activa principal',
  argumentos: (p) => limpio({ metaId: p.metaId }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaProyectarAhorro;
    if (!s.meta) return { ok: false, motivo: "la persona no tiene una meta de ahorro creada" };
    return {
      ok: true,
      props: {
        nombre: s.meta.nombre,
        metaCentavos: s.montoObjetivoCentavos,
        acumuladoCentavos: s.saldoInicialCentavos,
        aportacionCentavos: s.aportacionCentavos,
        frecuencia: s.frecuencia,
        fechaObjetivo: s.fechaEstimada,
      },
    };
  },
  variantes: sinVariantes,
};

// --- Inversiones -----------------------------------------------------------------------

const portafolio: DefinicionDeFuente = {
  id: "portafolio",
  componente: "DistribucionPortafolio",
  tool: "consultar_inversiones",
  describe: "El portafolio de inversion: valor, rendimiento, desviacion contra su modelo y peso de cada posicion.",
  parametros: sinParametros,
  argumentos: () => ({}),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaConsultarInversiones;
    if (!s.portafolio || s.posiciones.length === 0) return { ok: false, motivo: "la persona no tiene portafolio de inversion" };
    return {
      ok: true,
      props: {
        valorTotalCentavos: s.portafolio.valorActualCentavos,
        aportadoCentavos: s.portafolio.aportadoCentavos,
        rendimientoTotalPct: s.portafolio.rendimientoPct,
        desviacionModeloPct: s.portafolio.desviacionModeloPct,
        clases: [...s.posiciones]
          .sort((a, b) => b.pesoPct - a.pesoPct)
          .map((x) => ({
            claseId: x.id,
            nombre: x.nombre,
            tipo: x.tipo,
            montoCentavos: x.valorMercadoCentavos,
            pesoPct: x.pesoPct,
            pesoObjetivoPct: x.pesoObjetivoPct,
          })),
      },
    };
  },
  variantes: sinVariantes,
};

const rebalanceo: DefinicionDeFuente = {
  id: "rebalanceo",
  componente: "OrdenRebalanceo",
  tool: "simular_rebalanceo",
  describe: "Las ordenes de compra y venta que llevarian el portafolio a su modelo, antes de confirmar.",
  parametros: sinParametros,
  argumentos: () => ({}),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaSimularRebalanceo;
    if (s.sinDesviacion) return { ok: false, motivo: "el portafolio ya esta en su modelo: no hay ordenes" };
    return {
      ok: true,
      props: {
        portafolioId: s.portafolio.id,
        nombrePortafolio: s.portafolio.nombre,
        valorTotalCentavos: s.portafolio.valorTotalCentavos,
        comisionTotalCentavos: s.comisionTotalCentavos,
        movimientos: s.movimientos.map((m) => ({ ...m })),
      },
    };
  },
  variantes: sinVariantes,
};

const rendimientoHistorico: DefinicionDeFuente = {
  id: "rendimiento_historico",
  componente: "RendimientoHistorico",
  tool: "consultar_historico_inversion",
  describe: "Como le ha ido a UN instrumento (precio semana a semana y rendimiento del periodo).",
  parametros: z
    .object({
      clave: z.string().min(2).max(40).optional(),
      instrumentoId: z.string().regex(/^inst_[a-z0-9_]+$/).optional(),
      semanas: z.number().int().min(2).max(52).optional(),
    })
    .strict()
    .refine((p) => p.clave !== undefined || p.instrumentoId !== undefined, {
      message: 'falta el instrumento: manda su clave, p. ej. {"clave":"NAFTRAC"}',
    }),
  describeParametros: '{"clave":"NAFTRAC","semanas":26} (la clave como la dice la persona o como aparece en su portafolio); semanas de 2 a 52, default 12',
  resolver: async (p, consultar) => {
    if (typeof p.instrumentoId === "string") return { ok: true, parametros: p };
    const clave = String(p.clave).trim().toUpperCase();
    const inversiones = await consultar("consultar_inversiones", {});
    if (!inversiones.ok) return { ok: false, motivo: "no pude consultar los instrumentos de la persona" };
    const s = inversiones.resultado as SalidaConsultarInversiones;
    const conocidos = [...s.posiciones, ...s.modeloRecomendado].map((x) => ({ id: x.instrumentoId, clave: x.clave, nombre: x.nombre }));
    const encontrado =
      conocidos.find((x) => x.clave.toUpperCase() === clave) ??
      conocidos.find((x) => x.nombre.toUpperCase().includes(clave) || clave.includes(x.clave.toUpperCase()));
    if (!encontrado) {
      const claves = [...new Set(conocidos.map((x) => x.clave))].join(", ");
      return { ok: false, motivo: `no hay un instrumento «${String(p.clave)}» en su portafolio ni en su modelo; los que hay: ${claves || "ninguno"}` };
    }
    const { clave: _clave, ...resto } = p;
    return { ok: true, parametros: { ...resto, instrumentoId: encontrado.id } };
  },
  argumentos: (p) => limpio({ instrumentoId: p.instrumentoId, semanas: p.semanas }),
  adaptar: (salida) => {
    const error = fallo(salida);
    if (error) return { ok: false, motivo: error };
    const s = salida as SalidaConsultarHistoricoInversion;
    if (s.puntos.length < 2) return { ok: false, motivo: `no hay suficiente historico de ${s.instrumento.clave}` };
    return {
      ok: true,
      props: {
        instrumentoId: s.instrumento.id,
        nombre: s.instrumento.nombre,
        clave: s.instrumento.clave,
        tipo: s.instrumento.tipo,
        periodo: `Últimas ${s.semanasConsultadas} semanas`,
        precioInicialCentavos: s.precioInicialCentavos,
        precioFinalCentavos: s.precioFinalCentavos,
        rendimientoPeriodoPct: s.rendimientoPeriodoPct,
        puntos: s.puntos.map((x) => ({ fecha: x.fecha, precioCentavos: x.precioCierreCentavos, variacionPct: x.variacionPct })),
      },
    };
  },
  variantes: sinVariantes,
};

/** Todas, en el orden en que se le describen al modelo: deuda, gasto, salud y ahorro, inversion. */
export const FUENTES: readonly DefinicionDeFuente[] = [
  tarjeta,
  planDePago,
  credito,
  gastoDelMes,
  gastoComparado,
  detalleCategoria,
  fugas,
  salud,
  simuladorMeta,
  metaActiva,
  portafolio,
  rebalanceo,
  rendimientoHistorico,
];

const POR_ID = new Map(FUENTES.map((f) => [f.id, f]));

export function fuente(id: string): DefinicionDeFuente | undefined {
  return POR_ID.get(id);
}

export const IDS_DE_FUENTES = FUENTES.map((f) => f.id) as [string, ...string[]];

/** Las tools que los widgets pueden consultar. Todas de lectura; es la lista blanca del consultor. */
export const TOOLS_DE_WIDGETS: ReadonlySet<string> = new Set(FUENTES.map((f) => f.tool));

/** Las fuentes que llenan un componente: las que puede usar `modificar_widget` sin cambiar de tarjeta. */
export function fuentesDe(componente: string): DefinicionDeFuente[] {
  return FUENTES.filter((f) => f.componente === componente);
}

/** Para el prompt: una linea por fuente. */
export function describirFuentes(): string {
  return FUENTES.map((f) => {
    const vistas = Object.keys(f.variantes.shape);
    return (
      `- \`${f.id}\` -> ${f.componente} (tool \`${f.tool}\`). ${f.describe}` +
      (f.describeParametros ? ` Parametros: ${f.describeParametros}.` : " Sin parametros.") +
      (vistas.length ? ` Variantes: ${vistas.join(", ")}.` : "")
    );
  }).join("\n");
}
