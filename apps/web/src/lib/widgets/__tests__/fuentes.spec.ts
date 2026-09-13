import { describe, expect, it } from "vitest";
import { revisarProps } from "@/lib/agente/pantalla";
import { elegirHitos, FUENTES, fuente, rangoDelMes, TOOLS_DE_WIDGETS } from "../fuentes";
import { hojasNumericas } from "../cifras";
import { salida } from "./mcp-falso";

/**
 * Los adaptadores contra salidas REALES del MCP. Dos cosas por fuente: que las props que
 * produce pasen el schema del componente (si no, la tarjeta no se pinta), y que cada cifra
 * sea exactamente la de la tool (si no, el widget mentiria aunque el modelo no escribiera
 * nada).
 */

function adaptar(id: string, usuarioId: string, parametros: Record<string, unknown> = {}) {
  const f = fuente(id)!;
  const crudo = salida(usuarioId, f.tool, f.argumentos(parametros));
  expect(crudo, `el fixture no tiene ${f.tool} ${JSON.stringify(f.argumentos(parametros))} de ${usuarioId}`).toBeDefined();
  return { f, crudo, adaptado: f.adaptar(crudo, parametros) };
}

function propsValidas(componente: string, props: Record<string, unknown>) {
  expect(revisarProps({ id: "w", component: componente, razon: "Una razon de prueba suficientemente larga", ...props })).toEqual([]);
}

describe("el registro de fuentes", () => {
  it("cada fuente llena un componente del catalogo con una tool de lectura", () => {
    const deAccion = ["aplicar_plan_pago", "crear_apartado", "cancelar_suscripcion", "crear_tope_gasto", "ejecutar_decision", "rebalancear_portafolio"];
    for (const f of FUENTES) expect(deAccion).not.toContain(f.tool);
    expect([...TOOLS_DE_WIDGETS].some((t) => deAccion.includes(t))).toBe(false);
    expect(new Set(FUENTES.map((f) => f.id)).size).toBe(FUENTES.length);
  });

  it("ninguna variante acepta una cifra de resultado", () => {
    const prohibidas = /Centavos$|Pct$|^cat$|saldo|monto|total|puntaje/i;
    for (const f of FUENTES) {
      for (const llave of Object.keys(f.variantes.shape)) expect(llave).not.toMatch(prohibidas);
    }
  });

  it("los parametros rechazan llaves desconocidas: el modelo no puede colar un saldo", () => {
    for (const f of FUENTES) {
      expect(f.parametros.safeParse({ saldoCentavos: 1 }).success, f.id).toBe(false);
      expect(f.variantes.safeParse({ totalCentavos: 1 }).success, f.id).toBe(false);
    }
  });
});

describe("adaptadores con datos reales", () => {
  it("tarjeta (Beto): saldo, limite, minimo y mora tal cual los da consultar_tarjeta", () => {
    const { crudo, adaptado } = adaptar("tarjeta", "usr_beto");
    const t = (crudo as { tarjeta: Record<string, number | string> }).tarjeta;
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    expect(adaptado.props).toMatchObject({
      saldoCentavos: t.saldoCentavos,
      limiteCentavos: t.limiteCentavos,
      pagoMinimoCentavos: t.pagoMinimoCentavos,
      diasMora: t.diasMora,
      planActivo: false,
    });
    propsValidas("ResumenTarjeta", adaptado.props);
  });

  it("tarjeta (Ana, sin tarjeta): no aplica, en vez de inventar una en ceros", () => {
    const { adaptado } = adaptar("tarjeta", "usr_ana");
    expect(adaptado).toEqual({ ok: false, motivo: "la persona no tiene tarjeta de credito" });
  });

  it("plan_de_pago (Beto): una opcion por plazo, ordenadas, con la recomendada preseleccionada", () => {
    const { crudo, adaptado } = adaptar("plan_de_pago", "usr_beto");
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    const s = crudo as { opciones: Array<{ plazoMeses: number; mensualidadCentavos: number; ahorroVsMinimoCentavos: number }>; plazoRecomendado: number };
    const opciones = adaptado.props.opciones as Array<{ plazoMeses: number; mensualidadCentavos: number; ahorroCentavos: number }>;
    expect(opciones.map((o) => o.plazoMeses)).toEqual([...s.opciones.map((o) => o.plazoMeses)].sort((a, b) => a - b));
    for (const o of opciones) {
      const original = s.opciones.find((x) => x.plazoMeses === o.plazoMeses)!;
      expect(o.mensualidadCentavos).toBe(original.mensualidadCentavos);
      expect(o.ahorroCentavos).toBe(original.ahorroVsMinimoCentavos);
    }
    expect(adaptado.props.plazoElegido).toBe(s.plazoRecomendado);
    propsValidas("PlanDePago", adaptado.props);
  });

  it("plan_de_pago: un plazo preseleccionado que no se cotizo se rechaza con los que si hay", () => {
    const { f, adaptado } = adaptar("plan_de_pago", "usr_beto", { plazosMeses: [6, 24] });
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    expect(f.revisarVariantes!(adaptado.props, { plazoElegido: 24 })).toBeUndefined();
    expect(f.revisarVariantes!(adaptado.props, { plazoElegido: 18 })).toMatch(/6, 24/);
  });

  it("credito (Ana): el mas caro con saldo, intereses por la formula del catalogo y hitos de la tabla", () => {
    const { crudo, adaptado } = adaptar("credito", "usr_ana");
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    const c = (crudo as { creditos: Array<Record<string, number>> }).creditos[0]!;
    expect(adaptado.props.saldoInsolutoCentavos).toBe(c.saldoInsolutoCentavos);
    expect(adaptado.props.totalInteresesEstimadosCentavos).toBe(c.mensualidadCentavos! * c.pagosRestantes! - c.saldoInsolutoCentavos!);
    expect((adaptado.props.amortizacionResumen as unknown[]).length).toBeGreaterThanOrEqual(2);
    propsValidas("ProyeccionPagoCredito", adaptado.props);
  });

  it("gasto_del_mes (Beto): el total es el de la tool y las categorias suman ese total", () => {
    const { crudo, adaptado } = adaptar("gasto_del_mes", "usr_beto");
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    const g = (crudo as { gasto: { gastoCentavos: number; periodo: string } }).gasto;
    expect(adaptado.props.totalCentavos).toBe(g.gastoCentavos);
    expect(adaptado.props.periodo).toBe(g.periodo);
    const suma = (adaptado.props.categorias as Array<{ montoCentavos: number }>).reduce((s, c) => s + c.montoCentavos, 0);
    expect(suma).toBe(g.gastoCentavos);
    propsValidas("GastoPorCategoria", adaptado.props);
  });

  it("gasto_del_mes con periodo pide ESE mes a la tool", () => {
    const f = fuente("gasto_del_mes")!;
    expect(f.argumentos({ periodo: "2026-07" })).toEqual({ periodo: "2026-07" });
    const { adaptado } = adaptar("gasto_del_mes", "usr_beto", { periodo: "2026-07" });
    expect(adaptado.ok && adaptado.props.periodo).toBe("2026-07");
  });

  it("gasto_comparado (Carmen) contra junio", () => {
    const { adaptado } = adaptar("gasto_comparado", "usr_carmen", { periodo: "2026-08", periodoAnterior: "2026-06" });
    expect(adaptado.ok).toBe(true);
    if (adaptado.ok) propsValidas("GastoPorCategoria", adaptado.props);
  });

  it("detalle_categoria (Beto): la suma de cargos del rango, que cuadra con su renglon en el gasto", () => {
    const { adaptado } = adaptar("detalle_categoria", "usr_beto", { categoriaId: "cat_restaurantes", periodo: "2026-08" });
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    const gasto = fuente("gasto_del_mes")!.adaptar(salida("usr_beto", "analizar_gasto"), {});
    const renglon = gasto.ok && (gasto.props.categorias as Array<{ categoriaId: string; montoCentavos: number }>).find((c) => c.categoriaId === "cat_restaurantes");
    expect(adaptado.props.totalCentavos).toBe(renglon && renglon.montoCentavos);
    propsValidas("DetalleCategoria", adaptado.props);
  });

  it("fugas (Carmen): totales de la tool y las sin uso primero", () => {
    const { crudo, adaptado } = adaptar("fugas", "usr_carmen");
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    expect(adaptado.props.totalMensualCentavos).toBe((crudo as { totalMensualCentavos: number }).totalMensualCentavos);
    const fugas = adaptado.props.fugas as Array<{ sinUsoReciente: boolean }>;
    const primeraConUso = fugas.findIndex((x) => !x.sinUsoReciente);
    expect(fugas.slice(primeraConUso === -1 ? fugas.length : primeraConUso).every((x) => !x.sinUsoReciente)).toBe(true);
    propsValidas("AlertaFugas", adaptado.props);
  });

  it("salud (Carmen): el ahorro liquido sale del MCP, ya no lo estima nadie", () => {
    const { crudo, adaptado } = adaptar("salud", "usr_carmen");
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    expect(adaptado.props.montoAhorradoCentavos).toBe((crudo as { ahorroLiquidoCentavos: number }).ahorroLiquidoCentavos);
    expect(adaptado.props.puntajeSalud).toBe(85);
    propsValidas("TermometroSaludFinanciera", adaptado.props);
  });

  it("salud: con un MCP viejo sin ahorroLiquidoCentavos, no aplica en vez de pintar un cero", () => {
    const f = fuente("salud")!;
    const { ahorroLiquidoCentavos: _fuera, ...viejo } = salida("usr_carmen", f.tool) as Record<string, unknown>;
    expect(f.adaptar(viejo, {}).ok).toBe(false);
  });

  it("simulador_meta (Beto): la simulacion con el objetivo que se pidio", () => {
    const { crudo, adaptado } = adaptar("simulador_meta", "usr_beto", { montoObjetivoCentavos: 7_000_000, nombre: "Fondo de emergencia" });
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    const s = crudo as { montoObjetivoCentavos: number; aportacionCentavos: number };
    expect(adaptado.props).toMatchObject({ nombre: "Fondo de emergencia", metaCentavos: s.montoObjetivoCentavos, aportacionCentavos: s.aportacionCentavos });
    propsValidas("SimuladorMeta", adaptado.props);
  });

  it("meta_activa (Ana) si, (Beto, sin meta) no", () => {
    const ana = adaptar("meta_activa", "usr_ana");
    expect(ana.adaptado.ok).toBe(true);
    if (ana.adaptado.ok) propsValidas("MetaActiva", ana.adaptado.props);
    const beto = fuente("meta_activa")!.adaptar(salida("usr_beto", "proyectar_ahorro"), {});
    expect(beto.ok).toBe(false);
  });

  it("portafolio y rebalanceo (Carmen): valor total y ordenes de la simulacion", () => {
    const portafolio = adaptar("portafolio", "usr_carmen");
    expect(portafolio.adaptado.ok).toBe(true);
    if (portafolio.adaptado.ok) {
      expect(portafolio.adaptado.props.valorTotalCentavos).toBe(281073746);
      propsValidas("DistribucionPortafolio", portafolio.adaptado.props);
    }
    const rebalanceo = adaptar("rebalanceo", "usr_carmen");
    expect(rebalanceo.adaptado.ok).toBe(true);
    if (rebalanceo.adaptado.ok) {
      expect(rebalanceo.adaptado.props.movimientos).toEqual((rebalanceo.crudo as { movimientos: unknown }).movimientos);
      propsValidas("OrdenRebalanceo", rebalanceo.adaptado.props);
    }
  });

  it("rendimiento_historico: los puntos de precio de la tool", () => {
    const { crudo, adaptado } = adaptar("rendimiento_historico", "usr_carmen", { instrumentoId: "inst_naftrac", semanas: 12 });
    expect(adaptado.ok).toBe(true);
    if (!adaptado.ok) return;
    expect((adaptado.props.puntos as unknown[]).length).toBe((crudo as { puntos: unknown[] }).puntos.length);
    propsValidas("RendimientoHistorico", adaptado.props);
  });

  it("toda cifra de una tarjeta adaptada es una hoja de la salida de su tool (o una formula declarada)", () => {
    // La unica cifra derivada es `totalInteresesEstimadosCentavos` (formula del catalogo) y
    // `aportacionMinimaCentavos`/`aportacionMaximaCentavos` (topes del slider). Todo lo demas
    // tiene que existir tal cual en lo que devolvio el MCP.
    const derivadas = new Set(["totalInteresesEstimadosCentavos", "aportacionMinimaCentavos", "aportacionMaximaCentavos", "plazoRestanteMeses"]);
    const casos: Array<[string, string, Record<string, unknown>]> = [
      ["tarjeta", "usr_beto", {}],
      ["plan_de_pago", "usr_beto", {}],
      ["gasto_del_mes", "usr_ana", {}],
      ["salud", "usr_beto", {}],
      ["fugas", "usr_ana", {}],
      ["portafolio", "usr_carmen", {}],
      ["credito", "usr_ana", {}],
    ];
    for (const [id, usuario, parametros] of casos) {
      const { crudo, adaptado } = adaptar(id, usuario, parametros);
      if (!adaptado.ok) throw new Error(`${id} no aplico: ${adaptado.motivo}`);
      const hojas = new Set(hojasNumericas(crudo));
      for (const [campo, valor] of Object.entries(adaptado.props)) {
        if (derivadas.has(campo)) continue;
        for (const n of hojasNumericas(valor)) expect(hojas.has(n), `${id}.${campo} = ${n} no esta en la salida de la tool`).toBe(true);
      }
    }
  });
});

describe("resolver: la clave como la dice la persona", () => {
  it("rendimiento_historico traduce «naftrac» al id del instrumento con consultar_inversiones", async () => {
    const { consultorFalso } = await import("./mcp-falso");
    const { armarWidget } = await import("../armar");
    const { consultor } = consultorFalso("usr_carmen");
    const r = await armarWidget(
      { id: "historico", fuente: "rendimiento_historico", parametros: '{"clave":"naftrac","semanas":12}', razon: "Preguntaste por NAFTRAC" },
      consultor,
    );
    expect(r.ok, r.ok ? "" : r.errores.join("; ")).toBe(true);
    if (!r.ok) return;
    // La procedencia guarda el id resuelto: el auditor reproduce sin volver a resolver.
    expect(r.procedencia.parametros).toEqual({ instrumentoId: "inst_naftrac", semanas: 12 });
    expect(r.procedencia.argumentos).toMatchObject({ instrumentoId: "inst_naftrac" });
  });

  it("una clave que no esta en su portafolio ni en su modelo dice cuales si", async () => {
    const { consultorFalso } = await import("./mcp-falso");
    const { armarWidget } = await import("../armar");
    const { consultor } = consultorFalso("usr_carmen");
    const r = await armarWidget({ id: "historico", fuente: "rendimiento_historico", parametros: '{"clave":"TSLA"}', razon: "Preguntaste por TSLA" }, consultor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0]).toMatch(/no hay un instrumento «TSLA».*NAFTRAC/);
  });
});

describe("utilidades", () => {
  it("rangoDelMes respeta meses cortos y bisiestos", () => {
    expect(rangoDelMes("2026-02")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
    expect(rangoDelMes("2028-02")).toEqual({ desde: "2028-02-01", hasta: "2028-02-29" });
    expect(rangoDelMes("2026-08")).toEqual({ desde: "2026-08-01", hasta: "2026-08-31" });
  });

  it("elegirHitos: 1, 3, 6 y el ultimo, sin repetir y dentro de la tabla", () => {
    expect(elegirHitos(12)).toEqual([0, 2, 5, 11]);
    expect(elegirHitos(4)).toEqual([0, 2, 3]);
    expect(elegirHitos(1)).toEqual([0]);
    expect(elegirHitos(0)).toEqual([]);
  });
});
