import { aBooleano, aEntero, accionesDe, buscar, filtrar, type Fila } from "../datos/index.js";
import { nombreDeComercio, usuario } from "./consultas.js";
import { hoy, sumarMeses } from "./tiempo.js";

export type SuscripcionActiva = {
  id: string;
  usuarioId: string;
  cuentaId: string;
  comercioId: string;
  comercio: string;
  giro: string;
  concepto: string;
  montoCentavos: number;
  diaCargo: number;
  periodicidad: string;
  desde: string;
  mesesActiva: number;
  ultimoCargoFecha: string | null;
  sinUsoReciente: boolean;
};

export type RecurrenteNoSuscrito = {
  comercio: string;
  montoCentavos: number;
  categoriaId: string;
  ultimaFecha: string;
};

/** Formatea centavos a pesos mexicanos ($1,869.00). */
export function pesos(centavos: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(centavos / 100);
}

/** Calcula los meses cumplidos entre dos fechas AAAA-MM-DD. */
export function calcularMesesActiva(fechaInicio: string, fechaReferencia: string = hoy()): number {
  const [aI, mI, dI] = fechaInicio.split("-").map(Number) as [number, number, number];
  const [aR, mR, dR] = fechaReferencia.split("-").map(Number) as [number, number, number];
  let meses = (aR - aI) * 12 + (mR - mI);
  if (dR < dI) meses -= 1;
  return Math.max(1, meses);
}

/** Conjunto de IDs de suscripciones canceladas en el estado mutable. */
export function suscripcionesCanceladasEnEstado(usuarioId: string): Set<string> {
  const acciones = accionesDe(usuarioId, "cancelar_suscripcion");
  const canceladas = new Set<string>();
  for (const a of acciones) {
    const subId = (a.datos as { suscripcionId?: string })?.suscripcionId;
    if (subId) canceladas.add(subId);
  }
  return canceladas;
}

/** Verifica si una suscripción ya está cancelada (en los datos de partida o en el estado mutable). */
export function esSuscripcionCancelada(suscripcion: Fila, usuarioId: string): boolean {
  if (!aBooleano(suscripcion.activa)) return true;
  return suscripcionesCanceladasEnEstado(usuarioId).has(suscripcion.id!);
}

/**
 * Obtiene las suscripciones activas del usuario superponiendo el estado mutable.
 */
export function suscripcionesActivasDe(usuarioId: string, mesesSinUso: number = 2): SuscripcionActiva[] {
  // Valida que el usuario exista
  usuario(usuarioId);

  const filas = filtrar("suscripciones", "usuario_id", usuarioId);
  const canceladas = suscripcionesCanceladasEnEstado(usuarioId);
  const activas = filas.filter((f) => aBooleano(f.activa) && !canceladas.has(f.id!));

  const fechaHoy = hoy();
  const fechaCorteSinUso = sumarMeses(fechaHoy, -mesesSinUso);

  // Movimientos de cargo del usuario indexados por comercio
  const cargosDelUsuario = filtrar("movimientos", "usuario_id", usuarioId).filter((m) => m.tipo === "cargo");

  return activas.map((fila) => {
    const comercioId = fila.comercio_id ?? "";
    const comercioFila = comercioId ? buscar("comercios", "id", comercioId) : undefined;
    const comercioNombre = comercioFila?.nombre ?? nombreDeComercio(comercioId) ?? fila.concepto ?? "";
    const giro = comercioFila?.giro ?? "";

    // Último cargo de ese comercio
    const cargosComercio = cargosDelUsuario
      .filter((m) => m.comercio_id === comercioId)
      .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
    const ultimoCargoFecha = cargosComercio[0]?.fecha ?? null;

    const sinUsoReciente = ultimoCargoFecha === null || ultimoCargoFecha < fechaCorteSinUso;
    const desde = fila.fecha_inicio ?? fechaHoy;

    return {
      id: fila.id!,
      usuarioId,
      cuentaId: fila.cuenta_id ?? "",
      comercioId,
      comercio: comercioNombre,
      giro,
      concepto: fila.concepto ?? "",
      montoCentavos: aEntero(fila.monto_centavos),
      diaCargo: aEntero(fila.dia_cargo),
      periodicidad: fila.periodicidad ?? "mensual",
      desde,
      mesesActiva: calcularMesesActiva(desde, fechaHoy),
      ultimoCargoFecha,
      sinUsoReciente,
    };
  });
}

/**
 * Encuentra movimientos con `es_recurrente=true` cuyo `comercio_id` no esté en `suscripciones`.
 * Agrupa por comercio y toma el cargo más reciente.
 */
export function detectarRecurrentesNoSuscritos(usuarioId: string): RecurrenteNoSuscrito[] {
  const todasSubs = filtrar("suscripciones", "usuario_id", usuarioId);
  const comerciosEnSuscripciones = new Set(todasSubs.map((s) => s.comercio_id).filter(Boolean));

  const movimientos = filtrar("movimientos", "usuario_id", usuarioId)
    .filter((m) => m.tipo === "cargo" && aBooleano(m.es_recurrente) && Boolean(m.comercio_id))
    .filter((m) => !comerciosEnSuscripciones.has(m.comercio_id!));

  // Agrupar por comercio_id conservando el cargo más reciente
  const porComercio = new Map<string, Fila>();
  for (const m of movimientos) {
    const cid = m.comercio_id!;
    const actual = porComercio.get(cid);
    if (!actual || (m.fecha ?? "").localeCompare(actual.fecha ?? "") > 0) {
      porComercio.set(cid, m);
    }
  }

  return [...porComercio.values()]
    .map((m) => ({
      comercio: nombreDeComercio(m.comercio_id!) || m.descripcion || "Servicio recurrente",
      montoCentavos: aEntero(m.monto_centavos),
      categoriaId: m.categoria_id ?? "",
      ultimaFecha: m.fecha ?? hoy(),
    }))
    .sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha));
}
