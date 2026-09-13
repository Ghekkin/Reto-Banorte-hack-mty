import { describe, expect, it } from "vitest";
import { armarMensajes, nombresParecidos, type EntradaPintarPantalla } from "../pantalla";

/**
 * Issue #42: la normalizacion de `pintar_pantalla` reconoce alias que manda el modelo
 * (`tasaAnual` por `tasaAnualPct`, `veredicto` por `titular`…) y los copia a la prop real, pero no
 * los quitaba. La validacion oficial (JSON Schema de A2UI con `unevaluatedProperties: false`) es
 * estricta: el alias sobrante rechazaba la pantalla aunque la prop real ya estuviera puesta.
 *
 * Todas las pruebas pasan por `armarMensajes`, el mismo camino que usa el cierre: normalizacion,
 * schema de cada componente y validador oficial. Una prop de mas solo se nota ahi.
 */

const entrada: EntradaPintarPantalla = {
  razon: "Tu credito personal es lo que mas intereses te cobra este mes",
  texto: "Adelantar pagos te ahorra intereses.",
  componentesJson: "[]",
};

type Armado = ReturnType<typeof armarMensajes>;

function componenteArmado(r: Armado, nombre: string): Record<string, unknown> {
  if (!r.ok) throw new Error(`se esperaba ok y vino: ${r.errores.join(" | ")}`);
  const mensaje = r.mensajes.find((m) => "updateComponents" in m) as { updateComponents: { components: Array<Record<string, unknown>> } };
  const comp = mensaje.updateComponents.components.find((c) => c.component === nombre);
  if (!comp) throw new Error(`no hay ${nombre} en la pantalla`);
  return comp;
}

// --- Salidas del MCP con la forma de `packages/schemas` (valores de la base del 2026-09-13) ---

const consultarCreditos = {
  tarjeta: null,
  creditoMasCaroId: "cred_ana_personal",
  creditos: [
    {
      id: "cred_ana_personal",
      alias: "Crédito Personal",
      saldoInsolutoCentavos: 5578308,
      mensualidadCentavos: 457095,
      tasaAnual: 0.279,
      pagosRestantes: 15,
      amortizacion: [10, 11, 12, 13].map((n, i) => ({
        numeroPago: n,
        estatus: "pendiente",
        capitalCentavos: 306648 + i * 1000,
        interesCentavos: 129696 - i * 1000,
        saldoFinalCentavos: 5271660 - i * 300000,
      })),
    },
  ],
};

const analizarAhorro = {
  ahorro: {
    meta: { id: "meta_base_ana_emergencia", nombre: "Fondo de emergencia", estatus: "activa" },
    escenarios: [{ frecuencia: "mensual", aportacionCentavos: 132500, mesesEstimados: 36 }],
    frecuencia: "mensual",
    montoObjetivoCentavos: 9600000,
    saldoInicialCentavos: 4815000,
    aportacionCentavos: 265000,
    capacidadMensualCentavos: 498617,
  },
};

const simularPagoCredito = {
  creditoId: "cred_ana_personal",
  saldoInsolutoCentavos: 5578308,
  ahorroInteresesCentavos: 347021,
  mesesMenos: 4,
  actual: { mensualidadCentavos: 457095, plazoRestanteMeses: 15, totalInteresesEstimadosCentavos: 1278115 },
  simulado: { mensualidadCentavos: 600000, plazoRestanteMeses: 11, totalInteresesEstimadosCentavos: 931094 },
};

const fugas = [
  { id: "sus_netflix", concepto: "Netflix", comercio: "Netflix", montoCentavos: 21900, periodicidad: "mensual", sinUsoReciente: false },
  { id: "sus_gym", concepto: "Smart Fit", comercio: "Smart Fit", montoCentavos: 49900, periodicidad: "mensual", sinUsoReciente: true },
];

type CasoDeAlias = {
  componente: string;
  crudo: Record<string, unknown>;
  datosBase?: Record<string, unknown>;
  alias: string;
  prop: string;
  esperado: unknown;
};

const ESCENARIO = { etiqueta: "Camino actual", mensualidadCentavos: 457095, costoTotalCentavos: 6856423, tiempoMeses: 15, descripcion: "Seguir igual" };

/** Cada alias que reconoce `normalizarListaDeComponentes`, en un componente que por lo demas es valido. */
const CASOS: CasoDeAlias[] = [
  ...["tasaAnual", "TasaAnualPct"].map((alias) => ({
    componente: "ProyeccionPagoCredito",
    crudo: { id: "credito", component: "ProyeccionPagoCredito", [alias]: 0.3 },
    datosBase: { consultar_creditos: consultarCreditos },
    alias,
    prop: "tasaAnualPct",
    esperado: 0.3,
  })),
  ...["veredicto", "texto", "titulo", "mensaje"].map((alias) => ({
    componente: "Conclusion",
    crudo: { id: "conclusion", component: "Conclusion", [alias]: "Tu credito es lo urgente" },
    alias,
    prop: "titular",
    esperado: "Tu credito es lo urgente",
  })),
  {
    componente: "SimuladorMeta",
    crudo: { id: "meta", component: "SimuladorMeta", objetivoCentavos: 9000000 },
    datosBase: { analizar_ahorro: analizarAhorro },
    alias: "objetivoCentavos",
    prop: "metaCentavos",
    esperado: 9000000,
  },
  {
    componente: "SimuladorMeta",
    crudo: { id: "meta", component: "SimuladorMeta", aportacionMensualCentavos: 300000 },
    datosBase: { analizar_ahorro: analizarAhorro },
    alias: "aportacionMensualCentavos",
    prop: "aportacionCentavos",
    esperado: 300000,
  },
  {
    componente: "ComparadorAntesDespues",
    crudo: { id: "comparador", component: "ComparadorAntesDespues", title: "Pagar $6,000 contra seguir igual" },
    datosBase: { simular_pago_credito: simularPagoCredito },
    alias: "title",
    prop: "titulo",
    esperado: "Pagar $6,000 contra seguir igual",
  },
  ...["ahorroCentavos", "ahorro", "ahorroNeto"].map((alias) => ({
    componente: "ComparadorAntesDespues",
    crudo: { id: "comparador", component: "ComparadorAntesDespues", [alias]: 347021 },
    datosBase: { simular_pago_credito: simularPagoCredito },
    alias,
    prop: "ahorroNetoCentavos",
    esperado: 347021,
  })),
  ...["mesesAhorrados", "ahorroMeses"].map((alias) => ({
    componente: "ComparadorAntesDespues",
    crudo: { id: "comparador", component: "ComparadorAntesDespues", [alias]: 4 },
    datosBase: { simular_pago_credito: simularPagoCredito },
    alias,
    prop: "ahorroTiempoMeses",
    esperado: 4,
  })),
  ...["actual", "antes", "escenario1"].map((alias) => ({
    componente: "ComparadorAntesDespues",
    crudo: { id: "comparador", component: "ComparadorAntesDespues", [alias]: ESCENARIO },
    datosBase: { simular_pago_credito: simularPagoCredito },
    alias,
    prop: "escenarioActual",
    esperado: expect.objectContaining({ mensualidadCentavos: 457095, costoTotalCentavos: 6856423, tiempoMeses: 15 }),
  })),
  ...["estrategia", "despues", "escenario2", "propuesta"].map((alias) => ({
    componente: "ComparadorAntesDespues",
    crudo: { id: "comparador", component: "ComparadorAntesDespues", [alias]: { ...ESCENARIO, mensualidadCentavos: 600000, tiempoMeses: 11 } },
    datosBase: { simular_pago_credito: simularPagoCredito },
    alias,
    prop: "escenarioEstrategia",
    esperado: expect.objectContaining({ mensualidadCentavos: 600000, tiempoMeses: 11 }),
  })),
  ...[
    ["totalMensual", "totalMensualCentavos", 71800],
    ["total_mensual_centavos", "totalMensualCentavos", 71800],
    ["totalAnual", "totalAnualCentavos", 861600],
    ["total_anual_centavos", "totalAnualCentavos", 861600],
    ["pct_del_ingreso", "pctDelIngreso", 0.0224],
  ].map(([alias, prop, valor]) => ({
    componente: "AlertaFugas",
    crudo: { id: "fugas", component: "AlertaFugas", fugas, [alias as string]: valor },
    datosBase: { panorama_inicial: { perfil: { ingresoMensualCentavos: 3200000 } } },
    alias: alias as string,
    prop: prop as string,
    esperado: valor,
  })),
];

describe("#42: cada alias reconocido llena la prop real, se quita, y la pantalla valida", () => {
  it.each(CASOS.map((c) => [`${c.componente}.${c.alias} -> ${c.prop}`, c] as const))("%s", (_nombre, caso) => {
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify([caso.crudo]) }, caso.datosBase ? { datosBase: caso.datosBase } : {});
    const comp = componenteArmado(r, caso.componente);
    expect(comp[caso.prop]).toEqual(caso.esperado);
    expect(comp).not.toHaveProperty(caso.alias);
  });

  it("un alias ENLAZADO pasa a la prop real como enlace y no reaparece al reponer los enlaces", () => {
    const r = armarMensajes(
      {
        ...entrada,
        componentesJson: JSON.stringify([{ id: "credito", component: "ProyeccionPagoCredito", tasaAnual: { path: "/credito/tasa" } }]),
        datosJson: JSON.stringify({ credito: { tasa: 0.279 } }),
      },
      { datosBase: { consultar_creditos: consultarCreditos } },
    );
    const comp = componenteArmado(r, "ProyeccionPagoCredito");
    expect(comp.tasaAnualPct).toEqual({ path: "/credito/tasa" });
    expect(comp).not.toHaveProperty("tasaAnual");
  });

  it("`antes` es alias en ComparadorAntesDespues pero prop propia de GastoPorCategoria: ahi no se toca", () => {
    const antes = { totalCentavos: 1200000, periodo: "2026-07" };
    const r = armarMensajes({
      ...entrada,
      componentesJson: JSON.stringify([
        {
          id: "gasto",
          component: "GastoPorCategoria",
          periodo: "2026-08",
          categorias: [{ categoriaId: "cat_super", nombre: "Supermercado", montoCentavos: 900000, pctDelTotal: 1, variacionPct: 0.1 }],
          totalCentavos: 900000,
          antes,
        },
      ]),
    });
    expect(componenteArmado(r, "GastoPorCategoria").antes).toEqual(antes);
  });
});

describe("#42: props que el componente no declara", () => {
  // Los dos rechazos reales de hoy por prop inexistente (`banorte.corrida_tools` 147 y 1772),
  // con los argumentos tal cual los mando el modelo.
  it("DistribucionPortafolio con `portafolioId` (corrida_tools 147) pasa sin esa prop", () => {
    const portafolio = {
      id: "portafolio",
      component: "DistribucionPortafolio",
      portafolioId: "port_ana",
      valorTotalCentavos: 2526201,
      rendimientoTotalPct: 0.0526,
      desviacionModeloPct: 0.0775,
      clases: [
        { claseId: "deuda_gob", nombre: "CETES 182 días", tipo: "deuda_gubernamental", montoCentavos: 452652, pesoPct: 0.1792, pesoObjetivoPct: 0.15 },
        { claseId: "cetes_28", nombre: "CETES 28 días", tipo: "deuda_gubernamental", montoCentavos: 416291, pesoPct: 0.1648, pesoObjetivoPct: 0.2 },
        { claseId: "ntedia", nombre: "Fondo de Deuda Corto Plazo", tipo: "fondo_deuda", montoCentavos: 398402, pesoPct: 0.1577, pesoObjetivoPct: 0.2 },
        { claseId: "bonddia", nombre: "BONDDIA", tipo: "fondo_deuda", montoCentavos: 394601, pesoPct: 0.1562, pesoObjetivoPct: 0.15 },
      ],
      razon: "Tu portafolio de inversión presenta una desviación de 7.75% respecto a tu modelo recomendado de perfil conservador.",
      action: { event: { name: "ver_orden_rebalanceo", context: { portafolioId: "port_ana" } } },
    };
    const comp = componenteArmado(armarMensajes({ ...entrada, componentesJson: JSON.stringify([portafolio]) }), "DistribucionPortafolio");
    expect(comp).not.toHaveProperty("portafolioId");
    expect(comp.valorTotalCentavos).toBe(2526201);
    // El `portafolioId` que si declara el catalogo, el del `context` de la accion, se queda.
    expect(comp.action).toEqual(portafolio.action);
  });

  it("PlanDePago con `heroe: true` (corrida_tools 1772) pasa sin heroe, porque PlanDePago no lo declara", () => {
    const plan = {
      id: "root_plan",
      heroe: true,
      razon: "Reestructurar a 18 meses reduce tu mensualidad a $3,193.35 y corta el ciclo de intereses altos de tu tarjeta.",
      action: { event: { name: "aplicar_plan_pago", context: { tarjetaId: "tar_beto_clasica" } } },
      opciones: [
        { cat: 0.2427, plazoMeses: 12, ahorroCentavos: 13634554, mensualidadCentavos: 443333 },
        { cat: 0.2858, plazoMeses: 18, recomendado: true, ahorroCentavos: 13206520, mensualidadCentavos: 319335 },
        { cat: 0.3303, plazoMeses: 24, ahorroCentavos: 12660934, mensualidadCentavos: 262234 },
        { cat: 0.3762, plazoMeses: 36, ahorroCentavos: 11490130, mensualidadCentavos: 207345 },
      ],
      component: "PlanDePago",
      tarjetaId: "tar_beto_clasica",
      plazoElegido: 18,
    };
    const comp = componenteArmado(armarMensajes({ ...entrada, componentesJson: JSON.stringify([plan]) }), "PlanDePago");
    expect(comp).not.toHaveProperty("heroe");
    expect(comp.plazoElegido).toBe(18);
  });

  it("un nombre mal escrito de una prop OPCIONAL de texto que falta no se tira en silencio: su texto pasa a la prop real (#46)", () => {
    const aviso = {
      id: "aviso",
      component: "AvisoConsultaNoValida",
      razon: "Invertir mientras pagas intereses del 60% en tu tarjeta resulta contraproducente para tu dinero.",
      tipoInvalidez: "deuda_prioritaria",
      titulo: "Te conviene atender tu tarjeta antes de invertir",
      explicacion: "Tu tarjeta cobra mas intereses de lo que rinde cualquier inversion formal.",
      alternativasSugeridas: ["Quiero pagar menos intereses de mi tarjeta"],
      datoClav: "62.1% CAT en tarjeta",
    };
    const comp = componenteArmado(armarMensajes({ ...entrada, componentesJson: JSON.stringify([aviso]) }), "AvisoConsultaNoValida");
    expect(comp.datoClave).toBe("62.1% CAT en tarjeta");
    expect(comp).not.toHaveProperty("datoClav");
  });

  it("un nombre mal escrito de una prop OPCIONAL numerica que falta no se adopta: la validacion lo nombra (#42, #46)", () => {
    const aviso = {
      id: "aviso",
      component: "AvisoConsultaNoValida",
      razon: "Invertir mientras pagas intereses del 60% en tu tarjeta resulta contraproducente para tu dinero.",
      tipoInvalidez: "deuda_prioritaria",
      titulo: "Te conviene atender tu tarjeta antes de invertir",
      explicacion: "Tu tarjeta cobra mas intereses de lo que rinde cualquier inversion formal.",
      alternativasSugeridas: ["Quiero pagar menos intereses de mi tarjeta"],
      montoReferenciaCentavo: 4738600,
    };
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify([aviso]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain('la propiedad "montoReferenciaCentavo" no existe');
  });

  it("un nombre mal escrito de una prop OBLIGATORIA se sigue reportando como faltante", () => {
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify([{ id: "meta", component: "SimuladorMeta", metaCentavo: 9600000 }]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain("metaCentavos");
  });

  it("una prop de sobra que no se parece a ninguna que falte se quita aunque el modelo la haya mandado con dato", () => {
    const r = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify([{ id: "credito", component: "ProyeccionPagoCredito", colorFavorito: "rojo" }]) },
      { datosBase: { consultar_creditos: consultarCreditos } },
    );
    expect(componenteArmado(r, "ProyeccionPagoCredito")).not.toHaveProperty("colorFavorito");
  });
});

describe("nombresParecidos", () => {
  it.each([
    ["tasaAnual", "tasaAnualPct", true],
    ["tipo", "tipoInvalidez", true],
    ["metaCentavo", "metaCentavos", true],
    ["datoClav", "datoClave", true],
    ["total_mensual_centavos", "totalMensualCentavos", true],
    ["portafolioId", "desviacionModeloPct", false],
    ["heroe", "id", false],
    ["colorFavorito", "saldoInsolutoCentavos", false],
    ["valorActualCentavos", "valorTotalCentavos", false],
  ])("%s ~ %s = %s", (a, b, esperado) => {
    expect(nombresParecidos(a, b)).toBe(esperado);
  });
});
