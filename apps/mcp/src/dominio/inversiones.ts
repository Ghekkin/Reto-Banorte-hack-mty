import { aDecimal, aEntero, accionesDe, buscar, filtrar, tabla, type Fila } from "../datos/index.js";
import { usuario } from "./consultas.js";

export type PerfilInversion = {
  tipo: string;
  puntajeCuestionario: number;
  horizonteMeses: number;
  toleranciaPerdidaPct: number;
  objetivo: string;
  experiencia: string;
  vigenteHasta: string;
  ejecutivo: string | null;
};

export type PortafolioResumen = {
  id: string;
  nombre: string;
  perfil: string;
  valorActualCentavos: number;
  aportadoCentavos: number;
  rendimientoAcumuladoCentavos: number;
  rendimientoPct: number;
  desviacionModeloPct: number;
  fechaApertura: string;
};

export type PosicionDetalle = {
  id: string;
  instrumentoId: string;
  nombre: string;
  clave: string;
  tipo: string;
  riesgo: number;
  liquidez: string;
  titulos: number;
  precioPromedioCentavos: number;
  precioActualCentavos: number;
  costoCentavos: number;
  valorMercadoCentavos: number;
  plusvaliaCentavos: number;
  pesoPct: number;
  pesoObjetivoPct: number;
};

export type ModeloItem = {
  instrumentoId: string;
  nombre: string;
  clave: string;
  tipo: string;
  pesoObjetivoPct: number;
};

export type InstrumentoCatalogo = {
  id: string;
  nombre: string;
  clave: string;
  tipo: string;
  emisora: string;
  moneda: string;
  plazoDias: number | null;
  rendimientoAnualEsperado: number;
  volatilidadAnual: number;
  riesgo: number;
  liquidez: string;
  montoMinimoCentavos: number;
  precioActualCentavos: number;
};

export type PuntoHistorico = {
  fecha: string;
  precioCierreCentavos: number;
  variacionPct: number;
};

/**
 * Consulta el perfil de inversión del usuario en `perfiles_inversion`.
 */
export function perfilDeInversion(usuarioId: string): PerfilInversion | null {
  const fila = buscar("perfiles_inversion", "usuario_id", usuarioId);
  if (!fila) return null;

  return {
    tipo: fila.perfil ?? "conservador",
    puntajeCuestionario: aEntero(fila.puntaje_cuestionario),
    horizonteMeses: aEntero(fila.horizonte_meses),
    toleranciaPerdidaPct: aDecimal(fila.tolerancia_perdida_pct),
    objetivo: fila.objetivo ?? "",
    experiencia: fila.experiencia ?? "",
    vigenteHasta: fila.vigente_hasta ?? "",
    ejecutivo: fila.ejecutivo || null,
  };
}

/**
 * Consulta el portafolio activo del usuario en `portafolios`.
 */
export function portafolioDeInversion(usuarioId: string): PortafolioResumen | null {
  const filas = filtrar("portafolios", "usuario_id", usuarioId);
  const activo = filas.find((p) => p.estatus === "activo");
  if (!activo) return null;

  const rebalanceado = accionesDe(usuarioId, "rebalancear_portafolio").length > 0;

  return {
    id: activo.id!,
    nombre: activo.nombre ?? "",
    perfil: activo.perfil ?? "",
    valorActualCentavos: aEntero(activo.valor_actual_centavos),
    aportadoCentavos: aEntero(activo.aportado_centavos),
    rendimientoAcumuladoCentavos: aEntero(activo.rendimiento_acumulado_centavos),
    rendimientoPct: aDecimal(activo.rendimiento_pct),
    desviacionModeloPct: rebalanceado ? 0 : aDecimal(activo.desviacion_modelo_pct),
    fechaApertura: activo.fecha_apertura ?? "",
  };
}

/**
 * Consulta el portafolio por su identificador directo en `portafolios`.
 */
export function portafolioDeInversionPorId(portafolioId: string): PortafolioResumen | null {
  const activo = buscar("portafolios", "id", portafolioId);
  if (!activo) return null;
  const rebalanceado = activo.usuario_id
    ? accionesDe(activo.usuario_id, "rebalancear_portafolio").length > 0
    : false;
  return {
    id: activo.id!,
    nombre: activo.nombre ?? "",
    perfil: activo.perfil ?? "",
    valorActualCentavos: aEntero(activo.valor_actual_centavos),
    aportadoCentavos: aEntero(activo.aportado_centavos),
    rendimientoAcumuladoCentavos: aEntero(activo.rendimiento_acumulado_centavos),
    rendimientoPct: aDecimal(activo.rendimiento_pct),
    desviacionModeloPct: rebalanceado ? 0 : aDecimal(activo.desviacion_modelo_pct),
    fechaApertura: activo.fecha_apertura ?? "",
  };
}

/**
 * Consulta las posiciones valuadas a mercado de un portafolio cruzando `posiciones` e `instrumentos`.
 */
export function posicionesDePortafolio(portafolioId: string): PosicionDetalle[] {
  const filas = filtrar("posiciones", "portafolio_id", portafolioId);
  const filaPortafolio = buscar("portafolios", "id", portafolioId);
  const usuarioId = filaPortafolio?.usuario_id;
  const valorTotalCentavos = aEntero(filaPortafolio?.valor_actual_centavos);
  const rebalanceado = usuarioId ? accionesDe(usuarioId, "rebalancear_portafolio").length > 0 : false;

  return filas
    .map((pos) => {
      const inst = buscar("instrumentos", "id", pos.instrumento_id ?? "");
      const pesoObjetivo = aDecimal(pos.peso_objetivo_pct);
      const pesoActual = rebalanceado ? pesoObjetivo : aDecimal(pos.peso_pct);
      const valorMercado = rebalanceado
        ? Math.round(valorTotalCentavos * pesoObjetivo)
        : aEntero(pos.valor_mercado_centavos);
      const costo = aEntero(pos.costo_centavos);
      return {
        id: pos.id!,
        instrumentoId: pos.instrumento_id ?? "",
        nombre: inst?.nombre ?? pos.instrumento_id ?? "",
        clave: inst?.clave ?? "",
        tipo: inst?.tipo ?? "",
        riesgo: aEntero(inst?.riesgo),
        liquidez: inst?.liquidez ?? "",
        titulos: aDecimal(pos.titulos),
        precioPromedioCentavos: aEntero(pos.precio_promedio_compra_centavos),
        precioActualCentavos: aEntero(pos.precio_actual_centavos),
        costoCentavos: costo,
        valorMercadoCentavos: valorMercado,
        plusvaliaCentavos: valorMercado - costo,
        pesoPct: pesoActual,
        pesoObjetivoPct: pesoObjetivo,
      };
    })
    .sort((a, b) => b.valorMercadoCentavos - a.valorMercadoCentavos);
}

export type MovimientoRebalanceoCalculado = {
  tipo: "compra" | "venta";
  instrumentoClave: string;
  claseActivo: string;
  montoCentavos: number;
  pesoAnteriorPct: number;
  pesoNuevoPct: number;
};

const ETIQUETAS_CLASE_ACTIVO: Record<string, string> = {
  deuda_gubernamental: "Deuda gubernamental",
  deuda_corporativa: "Deuda corporativa",
  pagare: "Pagaré bancario",
  fondo_deuda: "Fondo de deuda",
  fondo_renta_variable: "Renta variable",
  etf: "ETF",
  renta_variable: "Renta variable",
};

export function calcularMovimientosRebalanceo(
  usuarioId: string,
  portafolioId?: string,
): {
  portafolio: PortafolioResumen;
  desviacionAntesPct: number;
  movimientos: MovimientoRebalanceoCalculado[];
} {
  const portafolio = portafolioId
    ? portafolioDeInversionPorId(portafolioId)
    : portafolioDeInversion(usuarioId);

  if (!portafolio) {
    throw new Error(`No se encontró un portafolio activo para el usuario ${usuarioId}`);
  }

  // Las posiciones de partida (antes de rebalancear):
  const filas = filtrar("posiciones", "portafolio_id", portafolio.id);
  const total = portafolio.valorActualCentavos;

  const operaciones: MovimientoRebalanceoCalculado[] = [];

  for (const pos of filas) {
    const inst = buscar("instrumentos", "id", pos.instrumento_id ?? "");
    const pesoAnt = aDecimal(pos.peso_pct);
    const pesoObj = aDecimal(pos.peso_objetivo_pct);
    const montoAnt = Math.round(total * pesoAnt);
    const montoObj = Math.round(total * pesoObj);
    const dif = montoObj - montoAnt;

    if (Math.abs(dif) < 100) continue; // Menos de 1 peso

    const clase = ETIQUETAS_CLASE_ACTIVO[inst?.tipo ?? ""] ?? "Inversión";

    if (dif < 0) {
      operaciones.push({
        tipo: "venta",
        instrumentoClave: inst?.clave ?? pos.instrumento_id ?? "",
        claseActivo: clase,
        montoCentavos: Math.abs(dif),
        pesoAnteriorPct: pesoAnt,
        pesoNuevoPct: pesoObj,
      });
    } else {
      operaciones.push({
        tipo: "compra",
        instrumentoClave: inst?.clave ?? pos.instrumento_id ?? "",
        claseActivo: clase,
        montoCentavos: dif,
        pesoAnteriorPct: pesoAnt,
        pesoNuevoPct: pesoObj,
      });
    }
  }

  // Ventas primero (liberar liquidez antes de comprar), luego compras, de mayor monto a menor
  operaciones.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "venta" ? -1 : 1;
    return b.montoCentavos - a.montoCentavos;
  });

  return {
    portafolio,
    desviacionAntesPct: portafolio.desviacionModeloPct,
    movimientos: operaciones,
  };
}

/**
 * Consulta el modelo de portafolio recomendado según el perfil en `modelos_portafolio`.
 */
export function modeloRecomendadoPara(perfilTipo: string): ModeloItem[] {
  const filas = filtrar("modelos_portafolio", "perfil", perfilTipo);

  return filas
    .map((f) => {
      const inst = buscar("instrumentos", "id", f.instrumento_id ?? "");
      return {
        instrumentoId: f.instrumento_id ?? "",
        nombre: inst?.nombre ?? f.instrumento_id ?? "",
        clave: inst?.clave ?? "",
        tipo: inst?.tipo ?? "",
        pesoObjetivoPct: aDecimal(f.peso_objetivo_pct),
      };
    })
    .sort((a, b) => b.pesoObjetivoPct - a.pesoObjetivoPct);
}

/**
 * Explora el catálogo de instrumentos en `instrumentos` con filtros opcionales.
 */
export function catalogoDeInstrumentos(filtros?: {
  tipo?: string;
  riesgoMaximo?: number;
  montoDisponibleCentavos?: number;
}): InstrumentoCatalogo[] {
  let instrumentos = tabla("instrumentos");

  if (filtros?.tipo) {
    instrumentos = instrumentos.filter((i) => i.tipo === filtros.tipo);
  }
  if (filtros?.riesgoMaximo !== undefined) {
    instrumentos = instrumentos.filter((i) => aEntero(i.riesgo) <= filtros.riesgoMaximo!);
  }
  if (filtros?.montoDisponibleCentavos !== undefined) {
    instrumentos = instrumentos.filter((i) => aEntero(i.monto_minimo_centavos) <= filtros.montoDisponibleCentavos!);
  }

  return instrumentos
    .map((i) => ({
      id: i.id!,
      nombre: i.nombre ?? "",
      clave: i.clave ?? "",
      tipo: i.tipo ?? "",
      emisora: i.emisora ?? "",
      moneda: i.moneda ?? "MXN",
      plazoDias: i.plazo_dias ? aEntero(i.plazo_dias) : null,
      rendimientoAnualEsperado: aDecimal(i.rendimiento_anual_esperado),
      volatilidadAnual: aDecimal(i.volatilidad_anual),
      riesgo: aEntero(i.riesgo),
      liquidez: i.liquidez ?? "",
      montoMinimoCentavos: aEntero(i.monto_minimo_centavos),
      precioActualCentavos: aEntero(i.precio_actual_centavos),
    }))
    .sort((a, b) => a.riesgo - b.riesgo || a.nombre.localeCompare(b.nombre));
}

/**
 * Consulta la serie histórica semanal de precios de un instrumento en `precios_historicos`.
 */
export function historicoDePrecios(
  instrumentoId: string,
  semanas: number = 12,
): {
  instrumento: { id: string; nombre: string; clave: string; tipo: string; precioActualCentavos: number };
  semanasConsultadas: number;
  precioInicialCentavos: number;
  precioFinalCentavos: number;
  rendimientoPeriodoPct: number;
  puntos: PuntoHistorico[];
} {
  const inst = buscar("instrumentos", "id", instrumentoId);
  if (!inst) throw new Error(`no existe el instrumento ${instrumentoId}`);

  const filas = filtrar("precios_historicos", "instrumento_id", instrumentoId).sort((a, b) =>
    (a.fecha ?? "").localeCompare(b.fecha ?? ""),
  );

  if (filas.length === 0) {
    throw new Error(`no hay precios historicos para el instrumento ${instrumentoId}`);
  }

  const recorte = filas.slice(-semanas);
  const puntos: PuntoHistorico[] = recorte.map((f) => ({
    fecha: f.fecha ?? "",
    precioCierreCentavos: aEntero(f.precio_cierre_centavos),
    variacionPct: aDecimal(f.variacion_pct),
  }));

  const inicial = puntos[0]?.precioCierreCentavos ?? aEntero(inst.precio_actual_centavos);
  const final = puntos.at(-1)?.precioCierreCentavos ?? inicial;
  const rendimientoPeriodoPct = inicial === 0 ? 0 : Number(((final - inicial) / inicial).toFixed(4));

  return {
    instrumento: {
      id: inst.id!,
      nombre: inst.nombre ?? "",
      clave: inst.clave ?? "",
      tipo: inst.tipo ?? "",
      precioActualCentavos: aEntero(inst.precio_actual_centavos),
    },
    semanasConsultadas: puntos.length,
    precioInicialCentavos: inicial,
    precioFinalCentavos: final,
    rendimientoPeriodoPct,
    puntos,
  };
}
