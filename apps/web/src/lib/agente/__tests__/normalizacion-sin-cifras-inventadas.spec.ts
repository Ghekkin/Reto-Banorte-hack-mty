import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOGO } from "@maya/catalogo";
import { armarMensajes, normalizarListaDeComponentes, type EntradaPintarPantalla } from "../pantalla";

/**
 * La normalizacion de `pintar_pantalla` completa lo que el modelo omite, pero **nunca con una
 * cifra que no salio del MCP** (ADR 0011):
 *
 * - #23: hasta el 2026-09-13 llenaba los huecos con literales (el saldo de la tarjeta de Beto como
 *   saldo de cualquier credito, una tasa de 27.9 %, un portafolio de CETES de ejemplo) y la
 *   pantalla pasaba la validacion con numeros que no eran de nadie.
 * - #28: la mascara por omision era `ÔÇóÔÇóÔÇóÔÇó 4821` (mojibake) porque leia `consultar_tarjeta`
 *   sin su anidado `tarjeta`.
 * - #39: una prop enlazada (`{path}`) pasaba por `Number()` y quedaba en NaN o en 0.
 * - #40: al aviso le agregaba `motivo` y `sugerencias`, que su schema no tiene: nunca pintaba.
 */

const entrada: EntradaPintarPantalla = {
  razon: "Tu credito personal es lo que mas intereses te cobra este mes",
  texto: "Adelantar pagos te ahorra intereses.",
  componentesJson: "[]",
};

function componenteArmado(r: ReturnType<typeof armarMensajes>, nombre: string): Record<string, unknown> {
  if (!r.ok) throw new Error(`se esperaba ok y vino: ${r.errores.join(" | ")}`);
  const mensaje = r.mensajes.find((m) => "updateComponents" in m) as { updateComponents: { components: Array<Record<string, unknown>> } };
  const comp = mensaje.updateComponents.components.find((c) => c.component === nombre);
  if (!comp) throw new Error(`no hay ${nombre} en la pantalla`);
  return comp;
}

function numerosDentro(valor: unknown, ruta = ""): string[] {
  if (typeof valor === "number") return [`${ruta}=${valor}`];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => numerosDentro(v, `${ruta}[${i}]`));
  if (valor && typeof valor === "object") return Object.entries(valor).flatMap(([k, v]) => numerosDentro(v, ruta ? `${ruta}.${k}` : k));
  return [];
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
  inversion: {
    portafolio: { id: "port_ana", valorActualCentavos: 2526201, aportadoCentavos: 2400002, rendimientoPct: 0.0526, desviacionModeloPct: 0.0775 },
    posiciones: [
      { id: "pos_002", nombre: "CETES 182 días", tipo: "deuda_gubernamental", valorMercadoCentavos: 1515720, pesoPct: 0.6, pesoObjetivoPct: 0.5 },
      { id: "pos_003", nombre: "Fondo Banorte Deuda", tipo: "fondo_deuda", valorMercadoCentavos: 1010481, pesoPct: 0.4, pesoObjetivoPct: 0.5 },
    ],
    perfil: { tipo: "conservador" },
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

const consultarTarjeta = {
  alerta: "mora",
  planActivo: null,
  tarjeta: { id: "tar_beto_clasica", mascara: "•••• 4821", saldoCentavos: 4738600, limiteCentavos: 4900000, pagoMinimoCentavos: 295073, fechaLimitePago: "2026-08-31", diasMora: 12 },
};

describe("#23: sin la tool en el turno, la normalizacion no pone ninguna cifra", () => {
  it.each(CATALOGO.map((c) => c.nombre))("%s suelto (objeto) sale sin un solo numero inventado", (nombre) => {
    const [comp] = normalizarListaDeComponentes([{ id: "t", component: nombre }], entrada, {});
    expect(numerosDentro(comp)).toEqual([]);
  });

  it.each(["ProyeccionPagoCredito", "ComparadorAntesDespues", "SimuladorMeta"])("%s por nombre suelto sale sin cifras", (nombre) => {
    const [comp] = normalizarListaDeComponentes([nombre], entrada, {});
    expect(numerosDentro(comp)).toEqual([]);
  });

  it("una ProyeccionPagoCredito sin consultar_creditos se rechaza en vez de salir con el saldo de la tarjeta de Beto", () => {
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify(["ProyeccionPagoCredito"]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain("saldoInsolutoCentavos");
    expect(JSON.stringify(r)).not.toContain("4738600");
  });

  it("con consultar_creditos, la llena con el credito real: tasa de `tasaAnual` e intereses con la formula del catalogo", () => {
    const r = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify(["ProyeccionPagoCredito"]) },
      { datosBase: { consultar_creditos: consultarCreditos } },
    );
    const comp = componenteArmado(r, "ProyeccionPagoCredito");
    expect(comp).toMatchObject({
      creditoId: "cred_ana_personal",
      alias: "Crédito Personal",
      saldoInsolutoCentavos: 5578308,
      mensualidadCentavos: 457095,
      tasaAnualPct: 0.279,
      plazoRestanteMeses: 15,
      totalInteresesEstimadosCentavos: 457095 * 15 - 5578308,
    });
    expect((comp.amortizacionResumen as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  it("SimuladorMeta sin proyeccion se rechaza; con la de analizar_ahorro sale con SU meta y SU capacidad", () => {
    const sin = armarMensajes({ ...entrada, componentesJson: JSON.stringify([{ id: "meta", component: "SimuladorMeta" }]) });
    expect(sin.ok).toBe(false);
    expect(JSON.stringify(sin)).not.toContain("5578308");

    const con = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify([{ id: "meta", component: "SimuladorMeta" }]) },
      { datosBase: { analizar_ahorro: analizarAhorro } },
    );
    expect(componenteArmado(con, "SimuladorMeta")).toMatchObject({
      metaCentavos: 9600000,
      aportacionCentavos: 265000,
      aportacionMaximaCentavos: 498617,
    });
  });

  it("ComparadorAntesDespues sale de simular_pago_credito, sin «Pagando $5,500 al mes…» de relleno", () => {
    const sin = armarMensajes({ ...entrada, componentesJson: JSON.stringify(["ComparadorAntesDespues"]) });
    expect(sin.ok).toBe(false);
    expect(JSON.stringify(sin)).not.toContain("5,500");

    const con = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify(["ComparadorAntesDespues"]) },
      { datosBase: { simular_pago_credito: simularPagoCredito } },
    );
    const comp = componenteArmado(con, "ComparadorAntesDespues");
    expect(comp).toMatchObject({
      ahorroNetoCentavos: 347021,
      ahorroTiempoMeses: 4,
      escenarioActual: { mensualidadCentavos: 457095, costoTotalCentavos: 5578308 + 1278115, tiempoMeses: 15 },
      escenarioEstrategia: { mensualidadCentavos: 600000, costoTotalCentavos: 5578308 + 931094, tiempoMeses: 11 },
    });
    expect(JSON.stringify(comp)).not.toContain("5,500");
  });

  it("DistribucionPortafolio sin inversiones se rechaza; con ellas trae SUS posiciones y SU rendimiento", () => {
    const sin = armarMensajes({ ...entrada, componentesJson: JSON.stringify([{ id: "p", component: "DistribucionPortafolio" }]) });
    expect(sin.ok).toBe(false);
    expect(JSON.stringify(sin)).not.toContain("0.087");

    const con = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify([{ id: "p", component: "DistribucionPortafolio" }]) },
      { datosBase: { analizar_ahorro: analizarAhorro } },
    );
    const comp = componenteArmado(con, "DistribucionPortafolio");
    expect(comp).toMatchObject({ valorTotalCentavos: 2526201, rendimientoTotalPct: 0.0526 });
    expect((comp.clases as Array<{ nombre: string }>).map((c) => c.nombre)).toEqual(["CETES 182 días", "Fondo Banorte Deuda"]);
  });
});

describe("#28: la mascara de ResumenTarjeta", () => {
  it("sale de consultar_tarjeta (anidada en `tarjeta`) con viñetas bien codificadas", () => {
    const r = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify([{ id: "tarjeta", component: "ResumenTarjeta" }]) },
      { datosBase: { consultar_tarjeta: consultarTarjeta } },
    );
    expect(componenteArmado(r, "ResumenTarjeta")).toMatchObject({ mascara: "•••• 4821", saldoCentavos: 4738600, limiteCentavos: 4900000 });
  });

  it("sin la tarjeta en el turno no pinta una mascara de ejemplo", () => {
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify([{ id: "tarjeta", component: "ResumenTarjeta" }]) });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("4821");
  });

  it("pantalla.ts no trae texto con la codificacion rota", () => {
    const fuente = readFileSync(new URL("../pantalla.ts", import.meta.url), "utf8");
    expect(fuente.match(/ÔÇ|├[®í¡│]|┬¿|┬┐/g)).toBeNull();
  });
});

describe("#39: una prop enlazada llega intacta a la validacion", () => {
  it("DistribucionPortafolio con rendimiento y desviacion enlazados pasa (antes: NaN y rechazo)", () => {
    const componentes = [
      {
        id: "distribucion",
        component: "DistribucionPortafolio",
        valorTotalCentavos: { path: "/portafolio/valorTotalCentavos" },
        rendimientoTotalPct: { path: "/portafolio/rendimientoTotalPct" },
        desviacionModeloPct: { path: "/portafolio/desviacionModeloPct" },
        aportadoCentavos: { path: "/portafolio/aportadoCentavos" },
        clases: { path: "/portafolio/clases" },
      },
    ];
    const datosJson = {
      portafolio: {
        valorTotalCentavos: 281073746,
        rendimientoTotalPct: 0.1472,
        desviacionModeloPct: 0.0672,
        aportadoCentavos: 245000000,
        clases: [{ claseId: "pos_014", nombre: "ETF Global Desarrollado", tipo: "etf", montoCentavos: 85544711, pesoPct: 0.3042, pesoObjetivoPct: 0.25 }],
      },
    };
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify(componentes), datosJson: JSON.stringify(datosJson) });
    const comp = componenteArmado(r, "DistribucionPortafolio");
    expect(comp.rendimientoTotalPct).toEqual({ path: "/portafolio/rendimientoTotalPct" });
    expect(comp.valorTotalCentavos).toEqual({ path: "/portafolio/valorTotalCentavos" });
    expect(comp.aportadoCentavos).toEqual({ path: "/portafolio/aportadoCentavos" });
  });

  it("los enlaces de ProyeccionPagoCredito, TermometroSaludFinanciera y OrdenRebalanceo no se vuelven 0 ni se pisan", () => {
    const enlaces = {
      ProyeccionPagoCredito: ["saldoInsolutoCentavos", "mensualidadCentavos", "totalInteresesEstimadosCentavos", "amortizacionResumen"],
      TermometroSaludFinanciera: ["puntajeSalud", "montoAhorradoCentavos"],
      OrdenRebalanceo: ["valorTotalCentavos", "comisionTotalCentavos", "movimientos"],
    } as const;
    for (const [nombre, props] of Object.entries(enlaces)) {
      const crudo: Record<string, unknown> = { id: "t", component: nombre };
      for (const prop of props) crudo[prop] = { path: `/x/${prop}` };
      const [comp] = normalizarListaDeComponentes([crudo], entrada, { consultar_creditos: consultarCreditos });
      for (const prop of props) expect(comp![prop], `${nombre}.${prop}`).toEqual({ path: `/x/${prop}` });
    }
  });

  it("un escenario de ComparadorAntesDespues con la mensualidad enlazada la conserva", () => {
    const [comp] = normalizarListaDeComponentes(
      [{ id: "c", component: "ComparadorAntesDespues", escenarioActual: { mensualidadCentavos: { path: "/sim/actual" }, costoTotalCentavos: 6856423, tiempoMeses: 15 } }],
      entrada,
      {},
    );
    expect((comp!.escenarioActual as Record<string, unknown>).mensualidadCentavos).toEqual({ path: "/sim/actual" });
  });
});

describe("#40: AvisoConsultaNoValida pinta", () => {
  // Los argumentos reales de `cor_8b16275bd37741cdbb601853` (paso 1): «quiero invertir» de Beto.
  const avisoReal = {
    id: "aviso",
    ancho: "amplio",
    heroe: true,
    razon: "Invertir mientras pagas intereses del 60% en tu tarjeta resulta contraproducente para tu dinero.",
    titulo: "Te conviene atender tu tarjeta antes de invertir",
    component: "AvisoConsultaNoValida",
    datoClave: "Costo de deuda: ~62.1% CAT vs Inversión: ~10.5%",
    explicacion:
      "Cualquier peso invertido hoy generaría alrededor del 10.5% anual, mientras que tu tarjeta genera más del 60% en intereses y comisiones. Si convertimos tu saldo a mensualidades fijas bajas la tasa y detienes el crecimiento de la deuda.",
    etiquetaMonto: "Saldo deudor actual",
    tipoInvalidez: "deuda_prioritaria",
    accionSugerida: { nombre: "simular_plan", context: { tarjetaId: "tar_beto_clasica" }, etiqueta: "Ver opciones de reestructura" },
    alternativasSugeridas: [
      "Quiero pagar menos intereses de mi tarjeta",
      "¿En qué se me fue el dinero este mes?",
      "Simular plan de pago con mensualidades fijas",
    ],
    montoReferenciaCentavos: 4738600,
  };
  const orientacion = {
    esValida: false,
    tipoInvalidez: "deuda_prioritaria",
    titulo: "Recomendación prioritaria: Atiende tu deuda antes de invertir",
    explicacion: "Actualmente tu tarjeta presenta un saldo de $47,386.00 con intereses elevados (CAT superior al 60%).",
    datoClave: "Costo de deuda: ~62.1% CAT vs Rendimiento inversión fija: ~10.5%",
    alternativasSugeridas: ["Quiero pagar menos intereses de mi tarjeta", "Simular plan de pago con mensualidades fijas"],
    accionSugerida: { nombre: "ver_plan_pago", context: { tarjetaId: "tar_beto_clasica" }, etiqueta: "Ver opciones de reestructura" },
  };

  it("con los argumentos reales de la corrida pasa y no lleva props que el schema no tiene", () => {
    const r = armarMensajes(
      {
        razon: "Alberto busca invertir pero tiene $47,386 en su tarjeta al 96.7% del límite y 12 días de mora.",
        texto: "Ninguna inversión te pagará tanto como lo que te cuesta esta deuda.",
        componentesJson: JSON.stringify([{ id: "root", component: "Column", separacion: "normal" }, avisoReal]),
        datosJson: {},
      },
      { datosBase: { orientar_consulta_no_valida: orientacion } },
    );
    const comp = componenteArmado(r, "AvisoConsultaNoValida");
    expect(comp).not.toHaveProperty("motivo");
    expect(comp).not.toHaveProperty("sugerencias");
    expect(comp.titulo).toBe(avisoReal.titulo);
  });

  it("lo que le falte sale de orientar_consulta_no_valida, con los nombres del schema", () => {
    const { explicacion: _e, alternativasSugeridas: _a, tipoInvalidez: _t, ...incompleto } = avisoReal;
    const r = armarMensajes(
      { ...entrada, componentesJson: JSON.stringify([incompleto]) },
      { datosBase: { orientar_consulta_no_valida: orientacion } },
    );
    expect(componenteArmado(r, "AvisoConsultaNoValida")).toMatchObject({
      explicacion: orientacion.explicacion,
      alternativasSugeridas: orientacion.alternativasSugeridas,
      tipoInvalidez: "deuda_prioritaria",
    });
  });
});
