import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { forzarFuentes, type EntradaPintarWidgets } from "@/lib/widgets/pintar";
import { widgetsPorCuenta } from "../widgets-por-cuenta";

/**
 * Las dos tarjetas de Inicio las decide el codigo con los datos de la cuenta
 * (`widgets-por-cuenta.ts`). Se prueba con las salidas REALES del MCP de las tres personas
 * (`lib/widgets/__tests__/fixtures/salidas-mcp.json`), que es lo que ve el jurado.
 */
type Salidas = Record<string, Record<string, Record<string, unknown>>>;
const SALIDAS = JSON.parse(
  readFileSync(new URL("../../widgets/__tests__/fixtures/salidas-mcp.json", import.meta.url), "utf8"),
) as Salidas;

/** Lo mismo que junta el prefetch de la portada, armado con las salidas del volcado. */
function datosDe(usuario: string, extra: { tienePlanActivo?: boolean; desviacion?: number } = {}): Record<string, unknown> {
  const s = SALIDAS[usuario]!;
  const tarjeta = s["consultar_tarjeta {}"] as { tarjeta?: Record<string, unknown> } | undefined;
  const inversiones = s["consultar_inversiones {}"] as { portafolio?: Record<string, unknown> | null } | undefined;
  const creditos = s['consultar_creditos {"incluirAmortizacion":true,"proximosPagos":12}'] ?? s["consultar_creditos {}"];
  return {
    panorama_inicial: { tarjeta: tarjeta?.tarjeta ? { ...tarjeta.tarjeta, tienePlanActivo: extra.tienePlanActivo ?? false } : null },
    consultar_creditos: creditos,
    analizar_ahorro: {
      inversion: {
        ...inversiones,
        portafolio: inversiones?.portafolio
          ? { ...inversiones.portafolio, ...(extra.desviacion !== undefined ? { desviacionModeloPct: extra.desviacion } : {}) }
          : null,
      },
    },
  };
}

describe("widgetsPorCuenta", () => {
  it("Beto (tarjeta al 96.7 % con mora): tarjeta y plan de pago", () => {
    expect(widgetsPorCuenta(datosDe("usr_beto")).fuentes).toEqual(["tarjeta", "plan_de_pago"]);
  });

  it("Beto con el plan ya aplicado: tarjeta y gasto del mes (el plan ya no se cotiza)", () => {
    expect(widgetsPorCuenta(datosDe("usr_beto", { tienePlanActivo: true })).fuentes).toEqual(["tarjeta", "gasto_del_mes"]);
  });

  it("Ana (credito personal al 27.9 %) lleva el credito aunque tambien tenga portafolio desviado", () => {
    const eleccion = widgetsPorCuenta(datosDe("usr_ana"));
    expect(eleccion.fuentes).toEqual(["credito", "simulador_meta"]);
    expect(eleccion.ids).toEqual(["credito", "meta"]);
  });

  it("Carmen (hipoteca y auto al corriente, portafolio desviado): portafolio y rebalanceo", () => {
    expect(widgetsPorCuenta(datosDe("usr_carmen")).fuentes).toEqual(["portafolio", "rebalanceo"]);
  });

  it("Carmen ya rebalanceada: portafolio y salud", () => {
    expect(widgetsPorCuenta(datosDe("usr_carmen", { desviacion: 0 })).fuentes).toEqual(["portafolio", "salud"]);
  });

  it("sin deuda urgente ni portafolio: gasto y salud", () => {
    expect(widgetsPorCuenta({}).fuentes).toEqual(["gasto_del_mes", "salud"]);
  });
});

describe("forzarFuentes", () => {
  const pedida: EntradaPintarWidgets = {
    razon: "Tu credito personal cuesta 27.9 % al año",
    texto: "Te dejo lo urgente.",
    conclusion: {
      titular: "Tu credito es lo que mas te cuesta hoy",
      datos: [
        { etiqueta: "Desviacion", widget: "port", campo: "desviacionModeloPct" },
        { etiqueta: "Saldo", widget: "cred", campo: "saldoInsolutoCentavos" },
      ],
    },
    widgets: [
      { id: "port", fuente: "rebalanceo", heroe: true, razon: "Tu portafolio se desvio de su modelo" },
      { id: "cred", fuente: "credito", parametros: '{"creditoId":"cred_ana_personal"}', razon: "Tu credito cuesta 27.9 %" },
    ],
  };

  it("deja exactamente las fuentes decididas, en orden, con la primera de heroe", () => {
    const r = forzarFuentes(pedida, { fuentes: ["credito", "simulador_meta"], ids: ["credito", "meta"] });
    expect(r.widgets.map((w) => [w.id, w.fuente, w.heroe])).toEqual([
      ["cred", "credito", true],
      ["meta", "simulador_meta", false],
    ]);
    // Lo que el modelo pidio para la fuente que si toca se respeta.
    expect(r.widgets[0]!.parametros).toBe('{"creditoId":"cred_ana_personal"}');
  });

  it("descarta las cifras de la conclusion que citaban una tarjeta quitada", () => {
    const r = forzarFuentes(pedida, { fuentes: ["credito", "simulador_meta"], ids: ["credito", "meta"] });
    expect(r.conclusion.datos).toEqual([{ etiqueta: "Saldo", widget: "cred", campo: "saldoInsolutoCentavos" }]);
  });
});
