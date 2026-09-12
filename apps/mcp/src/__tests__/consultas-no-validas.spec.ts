import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaOrientarConsultaNoValida,
  SalidaConsultarSugerenciasInversion,
} from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { orientarConsultaNoValida } from "../tools/orientar-consulta-no-valida.js";
import { consultarSugerenciasInversion } from "../tools/consultar-sugerencias-inversion.js";

beforeEach(() => reiniciarEstado());

describe("orientar_consulta_no_valida", () => {
  it("detecta que Ana no tiene tarjeta de crédito para reestructurar", async () => {
    const res = SalidaOrientarConsultaNoValida.parse(
      await orientarConsultaNoValida.manejar({
        usuarioId: "usr_ana",
        consulta: "Quiero reestructurar mi tarjeta de crédito y congelar intereses",
      }),
    );

    expect(res.esValida).toBe(false);
    expect(res.tipoInvalidez).toBe("producto_no_aplica");
    expect(res.titulo).toContain("No cuentas con tarjeta");
    expect(res.alternativasSugeridas.length).toBeGreaterThan(0);
    expect(res.accionSugerida?.nombre).toBe("simular_meta");
  });

  it("detecta que Beto no debe invertir teniendo deuda en mora y sugiere plan de pago", async () => {
    const res = SalidaOrientarConsultaNoValida.parse(
      await orientarConsultaNoValida.manejar({
        usuarioId: "usr_beto",
        consulta: "Quiero invertir 10,000 pesos en un fondo o pagaré",
      }),
    );

    expect(res.esValida).toBe(false);
    expect(res.tipoInvalidez).toBe("deuda_prioritaria");
    expect(res.titulo).toContain("Atiende tu deuda antes de invertir");
    expect(res.datoClave).toMatch(/62\.1% CAT/);
    expect(res.accionSugerida?.nombre).toBe("ver_plan_pago");
  });

  it("detecta solicitudes fuera de alcance regulatorio (criptomonedas/forex)", async () => {
    const res = SalidaOrientarConsultaNoValida.parse(
      await orientarConsultaNoValida.manejar({
        usuarioId: "usr_ana",
        consulta: "Recomiéndame una criptomoneda o memecoin con alto rendimiento",
      }),
    );

    expect(res.esValida).toBe(false);
    expect(res.tipoInvalidez).toBe("fuera_de_alcance");
    expect(res.explicacion).toMatch(/CNBV|IPAB|Banorte/i);
    expect(res.alternativasSugeridas.length).toBeGreaterThan(0);
  });
});

describe("consultar_sugerencias_inversion", () => {
  it("para Beto advierte que la mejor inversión es liquidar su deuda de tarjeta", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({
        usuarioId: "usr_beto",
      }),
    );

    expect(res.aplicaInversion).toBe(false);
    expect(res.estadoFinanciero).toBe("deuda_prioritaria");
    expect(res.sugerencias.some((s) => s.tipo === "advertencia")).toBe(true);
    expect(res.sugerencias[0]?.titulo).toMatch(/Liquidar saldo/i);
  });

  it("para Ana sugiere pagaré bancario y fondos gubernamentales líquidos", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({
        usuarioId: "usr_ana",
        montoSugeridoCentavos: 500_000,
      }),
    );

    expect(res.aplicaInversion).toBe(true);
    expect(res.perfilInversionista).toBe("conservador");
    expect(res.sugerencias.some((s) => s.id === "sug_pagare_28d")).toBe(true);
    expect(res.sugerencias.some((s) => s.id === "sug_fondo_liquidez_diaria")).toBe(true);
  });

  it("para Carmen sugiere rebalanceo de portafolio y fondos de renta variable", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({
        usuarioId: "usr_carmen",
      }),
    );

    expect(res.aplicaInversion).toBe(true);
    expect(res.estadoFinanciero).toBe("listo_para_invertir");
    expect(res.sugerencias.some((s) => s.id === "sug_rebalanceo_estrategico")).toBe(true);
  });
});
