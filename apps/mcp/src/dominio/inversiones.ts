import { aDecimal, aEntero, buscar, filtrar, tabla, type Fila } from "../datos/index.js";
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

  return {
    id: activo.id!,
    nombre: activo.nombre ?? "",
    perfil: activo.perfil ?? "",
    valorActualCentavos: aEntero(activo.valor_actual_centavos),
    aportadoCentavos: aEntero(activo.aportado_centavos),
    rendimientoAcumuladoCentavos: aEntero(activo.rendimiento_acumulado_centavos),
    rendimientoPct: aDecimal(activo.rendimiento_pct),
    desviacionModeloPct: aDecimal(activo.desviacion_modelo_pct),
    fechaApertura: activo.fecha_apertura ?? "",
  };
}

/**
 * Consulta las posiciones valuadas a mercado de un portafolio cruzando `posiciones` e `instrumentos`.
 */
export function posicionesDePortafolio(portafolioId: string): PosicionDetalle[] {
  const filas = filtrar("posiciones", "portafolio_id", portafolioId);

  return filas
    .map((pos) => {
      const inst = buscar("instrumentos", "id", pos.instrumento_id ?? "");
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
        costoCentavos: aEntero(pos.costo_centavos),
        valorMercadoCentavos: aEntero(pos.valor_mercado_centavos),
        plusvaliaCentavos: aEntero(pos.plusvalia_centavos),
        pesoPct: aDecimal(pos.peso_pct),
        pesoObjetivoPct: aDecimal(pos.peso_objetivo_pct),
      };
    })
    .sort((a, b) => b.valorMercadoCentavos - a.valorMercadoCentavos);
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
 * Proyección de una inversión con interés compuesto mensual.
 *
 * **La aportación entra al INICIO del mes** (`(saldo + aportacion) * (1 + r)`) y no al
 * final. No es un detalle de estilo: es exactamente la misma iteración que hace
 * `packages/catalogo/src/proyeccion-crecimiento/componente.tsx:316-325`, y tiene que
 * seguir siéndolo. Ese componente simula la curva en el navegador cuando la persona mueve
 * el slider y luego la **calibra** contra el cierre que manda esta tool
 * (`factor = rendimientoEsperado / simulado`); si las dos fórmulas discrepan, el factor
 * deja de valer 1 y la gráfica se dobla para tapar la diferencia. Es la misma convivencia
 * que ya existe entre `comunes.ts:sumarMeses` y `dominio/tiempo.ts`: se replica a
 * propósito, y hay una prueba a cada lado con los mismos números que lo amarra.
 *
 * `rendimiento` **puede ser negativo** (escenario adverso). Quien pinte decide cómo lo
 * dice, pero aquí no se aplasta a cero: una proyección que nunca pierde es propaganda.
 *
 * Documentado en `docs/algoritmos/proyeccion-de-inversion.md`.
 */
export function proyectarCrecimiento(
  capitalInicialCentavos: number,
  aportacionMensualCentavos: number,
  tasaAnual: number,
  meses: number,
): { saldoFinalCentavos: number; totalAportadoCentavos: number; rendimientoCentavos: number } {
  const r = tasaAnual / 12;
  let saldo = capitalInicialCentavos;
  for (let m = 1; m <= meses; m++) {
    saldo = (saldo + aportacionMensualCentavos) * (1 + r);
  }
  const totalAportado = capitalInicialCentavos + aportacionMensualCentavos * meses;
  const saldoFinal = Math.round(saldo);
  return {
    saldoFinalCentavos: saldoFinal,
    totalAportadoCentavos: totalAportado,
    rendimientoCentavos: saldoFinal - totalAportado,
  };
}

/**
 * Los meses donde se marca un hito, a lo más cinco. En horizontes de un año o menos, un
 * hito por año dejaría la curva con una sola marca, así que se parte en tercios; de ahí
 * para arriba se marcan aniversarios espaciados y siempre el cierre.
 */
export function mesesDeHito(meses: number): number[] {
  const marcas: number[] = [];

  if (meses <= 12) {
    const paso = Math.max(1, Math.round(meses / 3));
    for (let m = paso; m < meses; m += paso) marcas.push(m);
  } else {
    const anios = Math.floor(meses / 12);
    const paso = Math.max(1, Math.ceil(anios / MAX_HITOS));
    for (let a = paso; a <= anios; a += paso) if (a * 12 < meses) marcas.push(a * 12);
  }
  marcas.push(meses);

  return [...new Set(marcas)].sort((a, b) => a - b);
}

/** Más marcas que esto en el eje se encinan y dejan de leerse en un proyector. */
const MAX_HITOS = 5;

/** `Año 3` cuando cae en aniversario, `Mes 7` cuando no. */
export function etiquetaDeHito(mes: number): string {
  if (mes >= 12 && mes % 12 === 0) {
    const anios = mes / 12;
    return anios === 1 ? "Año 1" : `Año ${anios}`;
  }
  return `Mes ${mes}`;
}

/**
 * El instrumento con el que se proyecta cuando nadie dijo cuál: el de mayor peso del
 * modelo recomendado para su perfil. Es el que el banco ya le sugeriría, así que la
 * proyección por omisión no es una elección nuestra.
 */
export function instrumentoPorOmision(usuarioId: string): InstrumentoCatalogo | null {
  const perfil = perfilDeInversion(usuarioId)?.tipo ?? "conservador";
  const modelo = modeloRecomendadoPara(perfil);
  const candidatos = modelo.length > 0 ? modelo : modeloRecomendadoPara("conservador");

  for (const item of candidatos) {
    const inst = instrumentoDelCatalogo(item.instrumentoId);
    if (inst) return inst;
  }
  return null;
}

/** Un instrumento del catálogo por id, ya normalizado. */
export function instrumentoDelCatalogo(instrumentoId: string): InstrumentoCatalogo | null {
  return catalogoDeInstrumentos().find((i) => i.id === instrumentoId) ?? null;
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
