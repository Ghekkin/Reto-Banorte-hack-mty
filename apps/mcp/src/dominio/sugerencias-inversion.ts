import { usuario, tarjetaDeCredito, capacidadPagoMensual } from "./consultas.js";
import { perfilDeInversion, portafolioDeInversion } from "./inversiones.js";
import type {
  SalidaConsultarSugerenciasInversion,
  EstadoFinancieroInversion,
  PerfilInversionista,
  OpcionSugerenciaInversion,
} from "@maya/schemas";

/**
 * Genera sugerencias y alternativas de inversión personalizadas basadas en la
 * situación financiera real del usuario (deuda, ahorro y portafolios existentes).
 */
export function generarSugerenciasInversion(
  usuarioId: string,
  montoSugeridoCentavos?: number,
  horizonteMeses?: number,
): SalidaConsultarSugerenciasInversion {
  const u = usuario(usuarioId);
  const tdc = tarjetaDeCredito(usuarioId);
  const capacidadCentavos = capacidadPagoMensual(usuarioId);
  const perfil = perfilDeInversion(usuarioId);
  const portafolio = portafolioDeInversion(usuarioId);

  // 1. Caso Beto: Deuda crítica en mora o uso de límite alto
  const tieneDeudaToxica =
    tdc && (Number(tdc.dias_mora) > 0 || Number(tdc.saldo_centavos) > Number(tdc.limite_centavos) * 0.7);

  if (tieneDeudaToxica) {
    const saldoFormateado = (Number(tdc.saldo_centavos) / 100).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

    const sugerencias: OpcionSugerenciaInversion[] = [
      {
        id: "sug_liquidar_deuda",
        titulo: "Prioridad #1: Liquidar saldo de tarjeta con plan fijo",
        tipo: "advertencia",
        descripcion:
          `Tu tarjeta tiene un saldo de ${saldoFormateado} con una tasa anual estimada de 62.1% CAT. ` +
          "Liquidar esa deuda te ofrece un beneficio garantizado del 62.1% en intereses no pagados, " +
          "superando cualquier instrumento de inversión formal disponible en el mercado.",
        badge: "Ahorro garantizado",
        recomendado: true,
      },
      {
        id: "sug_apartado_emergencia_minimo",
        titulo: "Apartado mínimo para contingencias",
        tipo: "meta",
        descripcion:
          "Si ya estás en un plan de pagos, puedes destinar una cantidad pequeña ($500 a $1,000 al mes) " +
          "a un apartado sin riesgo para no volver a recurrir a la tarjeta en emergencias.",
        badge: "Paso 2",
        recomendado: false,
      },
    ];

    return {
      aplicaInversion: false,
      estadoFinanciero: "deuda_prioritaria",
      perfilInversionista: "sin_perfil",
      capacidadMensualCentavos: capacidadCentavos,
      montoRecomendadoCentavos: 0,
      motivo:
        "Financieramente no es prudente invertir mientras mantengas deuda con intereses moratorios o tasas de tarjeta elevadas.",
      sugerencias,
      siguientePaso: "Activa un plan de pagos para congelar tu saldo deudor a tasa fija y recuperar tu margen de ahorro.",
    };
  }

  // 2. Caso Carmen: Perfil patrimonial / agresivo con portafolio de alta cuantía
  const esAgresivoOPatrimonial =
    perfil?.tipo === "agresivo" || (portafolio && portafolio.valorActualCentavos > 10_000_000);

  if (esAgresivoOPatrimonial && portafolio && perfil) {
    const sugerencias: OpcionSugerenciaInversion[] = [
      {
        id: "sug_rebalanceo_estrategico",
        titulo: "Rebalanceo hacia Asignación Objetivo",
        tipo: "estrategia",
        descripcion:
          `Tu portafolio "${portafolio.nombre}" tiene una desviación de ${(Number(portafolio.desviacionModeloPct) * 100).toFixed(1)}% ` +
          "respecto al modelo sugerido. Rebalancear permite capturar plusvalías en renta variable e incrementar renta fija.",
        badge: "Optimización",
        recomendado: true,
      },
      {
        id: "sug_fondo_rv_global",
        titulo: "Fondo Banorte Renta Variable Global (NTEIPC)",
        tipo: "instrumento",
        descripcion:
          "Participación indexada en emisoras líderes con crecimiento a largo plazo y horizonte mayor a 2 años.",
        rendimientoEstimadoAnualPct: 0.138,
        plazoMinimo: "360 días+",
        nivelRiesgo: "alto",
        badge: "Perfil Agresivo",
        recomendado: false,
      },
      {
        id: "sug_cobertura_dolar",
        titulo: "Estrategia Dólares Banorte (NTEDLR)",
        tipo: "instrumento",
        descripcion:
          "Cobertura cambiaria para proteger una porción de tu patrimonio ante movimientos del tipo de cambio.",
        rendimientoEstimadoAnualPct: 0.082,
        plazoMinimo: "90 días",
        nivelRiesgo: "medio",
        badge: "Cobertura",
        recomendado: false,
      },
    ];

    return {
      aplicaInversion: true,
      estadoFinanciero: "listo_para_invertir",
      perfilInversionista: "agresivo",
      capacidadMensualCentavos: capacidadCentavos,
      montoRecomendadoCentavos: montoSugeridoCentavos ?? 5_000_000, // 50,000 MXN default patrimonial
      motivo:
        "Cuentas con portafolio patrimonial establecido. Las recomendaciones buscan optimizar diversificación y controlar riesgo.",
      sugerencias,
      siguientePaso: "Revisa la distribución por instrumento o ejecuta una estrategia de rebalanceo periódico.",
    };
  }

  // 3. Caso Ana / Usuarios con perfil conservador o comenzando a invertir
  const montoInicio = montoSugeridoCentavos ?? Math.min(capacidadCentavos, 500_000); // hasta 5,000 MXN

  const sugerencias: OpcionSugerenciaInversion[] = [
    {
      id: "sug_pagare_28d",
      titulo: "Pagaré Bancario Banorte a 28 días",
      tipo: "instrumento",
      descripcion:
        "Tasa fija garantizada y pago de rendimientos al vencimiento del plazo. Respaldado por el IPAB hasta 400 mil UDIS.",
      rendimientoEstimadoAnualPct: 0.108,
      plazoMinimo: "28 días",
      nivelRiesgo: "muy_bajo",
      badge: "Ideal para iniciar",
      recomendado: true,
    },
    {
      id: "sug_fondo_liquidez_diaria",
      titulo: "Fondo Deuda Gubernamental Banorte (NTEGUB)",
      tipo: "instrumento",
      descripcion:
        "Invierte en deuda del Gobierno Federal (CETES y Bonos M). Retiros de lunes a viernes en horario bancario.",
      rendimientoEstimadoAnualPct: 0.112,
      plazoMinimo: "Diaria",
      nivelRiesgo: "muy_bajo",
      badge: "Disponibilidad 24/7",
      recomendado: false,
    },
    {
      id: "sug_meta_fondo_emergencia",
      titulo: "Fondo de Emergencia (3 meses de gastos)",
      tipo: "meta",
      descripcion:
        "Antes de comprometer capital a plazos mayores, asegúrate de mantener 3 meses de gastos seguros en un apartado líquido.",
      badge: "Base de salud",
      recomendado: false,
    },
  ];

  return {
    aplicaInversion: true,
    estadoFinanciero: "requiere_fondo_emergencia",
    perfilInversionista: "conservador",
    capacidadMensualCentavos: capacidadCentavos,
    montoRecomendadoCentavos: montoInicio,
    motivo:
      "Cuentas con capacidad de ahorro libre y sin deudas de crédito. Recomendamos instrumentos de liquidez diaria y bajo riesgo para tu etapa inicial.",
    sugerencias,
    siguientePaso: "Comienza con un Pagaré a 28 días o programa un apartado de ahorro quincenal para crear el hábito.",
  };
}
