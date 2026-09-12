import { describe, expect, it } from "vitest";
import {
  SalidaConsultarCatalogoInversiones,
  SalidaConsultarHistoricoInversion,
  SalidaConsultarInversiones,
} from "@maya/schemas";
import { consultarCatalogoInversiones } from "../tools/consultar-catalogo-inversiones.js";
import { consultarHistoricoInversion } from "../tools/consultar-historico-inversion.js";
import { consultarInversiones } from "../tools/consultar-inversiones.js";

describe("consultar_inversiones", () => {
  it("Carmen: perfil patrimonial agresivo con portafolio millonario y ejecutiva asignada", async () => {
    const res = SalidaConsultarInversiones.parse(
      await consultarInversiones.manejar({ usuarioId: "usr_carmen" }),
    );

    expect(res.tienePerfil).toBe(true);
    expect(res.perfil).not.toBeNull();
    expect(res.perfil!.tipo).toBe("agresivo");
    expect(res.perfil!.puntajeCuestionario).toBe(76);
    expect(res.perfil!.horizonteMeses).toBe(120);
    expect(res.perfil!.toleranciaPerdidaPct).toBe(0.25);
    expect(res.perfil!.ejecutivo).toContain("Mariana Cárdenas");

    expect(res.tienePortafolio).toBe(true);
    expect(res.portafolio).not.toBeNull();
    expect(res.portafolio!.nombre).toBe("Portafolio patrimonial");
    expect(res.portafolio!.valorActualCentavos).toBe(281073746); // ~$2,810,737.46 MXN
    expect(res.portafolio!.aportadoCentavos).toBe(245000000);
    expect(res.portafolio!.rendimientoAcumuladoCentavos).toBe(36073746); // +$360,737.46 MXN
    expect(res.portafolio!.rendimientoPct).toBeCloseTo(0.1472, 4);

    expect(res.posiciones).toHaveLength(8);
    // Ordenadas por valor de mercado descendente
    expect(res.posiciones[0]!.clave).toBe("IVVPESO");
    expect(res.posiciones[0]!.valorMercadoCentavos).toBeGreaterThan(80000000);
    expect(res.posiciones[0]!.plusvaliaCentavos).toBeGreaterThan(0);

    // Modelo recomendado agresivo
    expect(res.modeloRecomendado.length).toBeGreaterThan(0);
    const clavesModelo = res.modeloRecomendado.map((m) => m.clave);
    expect(clavesModelo).toContain("IVVPESO");
    expect(clavesModelo).toContain("GFNORTEO");
  });

  it("Ana: perfil conservador con portafolio inicial de ~$25,000", async () => {
    const res = SalidaConsultarInversiones.parse(
      await consultarInversiones.manejar({ usuarioId: "usr_ana" }),
    );

    expect(res.tienePerfil).toBe(true);
    expect(res.perfil!.tipo).toBe("conservador");
    expect(res.perfil!.puntajeCuestionario).toBe(28);
    expect(res.perfil!.horizonteMeses).toBe(24);

    expect(res.tienePortafolio).toBe(true);
    expect(res.portafolio!.valorActualCentavos).toBe(2526201); // ~$25,262.01 MXN
    expect(res.portafolio!.aportadoCentavos).toBe(2400002);
    expect(res.portafolio!.rendimientoAcumuladoCentavos).toBe(126199);
    expect(res.portafolio!.rendimientoPct).toBeCloseTo(0.0526, 4);

    expect(res.posiciones).toHaveLength(8);
    const nombres = res.posiciones.map((p) => p.nombre);
    expect(nombres).toContain("CETES 28 días");
    expect(nombres).toContain("CETES 182 días");
  });

  it("Beto: tiene perfil conservador pero sin portafolio activo (salir de deudas primero)", async () => {
    const res = SalidaConsultarInversiones.parse(
      await consultarInversiones.manejar({ usuarioId: "usr_beto" }),
    );

    expect(res.tienePerfil).toBe(true);
    expect(res.perfil!.tipo).toBe("conservador");
    expect(res.perfil!.objetivo).toMatch(/salir de deudas/i);

    expect(res.tienePortafolio).toBe(false);
    expect(res.portafolio).toBeNull();
    expect(res.posiciones).toHaveLength(0);

    // Aunque no tenga portafolio, conoce el modelo recomendado para su perfil
    expect(res.modeloRecomendado.length).toBeGreaterThan(0);
  });

  it("falla si el usuario no existe", async () => {
    await expect(async () =>
      consultarInversiones.manejar({ usuarioId: "usr_fantasma" }),
    ).rejects.toThrow(/no existe el usuario/);
  });
});

describe("consultar_catalogo_inversiones", () => {
  it("sin filtros devuelve los 16 instrumentos del banco ordenados por riesgo", async () => {
    const res = SalidaConsultarCatalogoInversiones.parse(
      await consultarCatalogoInversiones.manejar({}),
    );

    expect(res.total).toBe(16);
    expect(res.instrumentos).toHaveLength(16);
    // Riesgo 1 primero (CETES, BONDDIA, pagarés)
    expect(res.instrumentos[0]!.riesgo).toBe(1);
    expect(res.instrumentos.at(-1)!.riesgo).toBe(5);
  });

  it("filtro por tipo 'deuda_gubernamental' devuelve solo CETES", async () => {
    const res = SalidaConsultarCatalogoInversiones.parse(
      await consultarCatalogoInversiones.manejar({ tipo: "deuda_gubernamental" }),
    );

    expect(res.total).toBe(3);
    for (const inst of res.instrumentos) {
      expect(inst.tipo).toBe("deuda_gubernamental");
      expect(inst.clave).toMatch(/CETES/);
      expect(inst.emisora).toBe("Gobierno Federal");
    }
  });

  it("filtro por riesgoMaximo: 2 excluye activos volátiles de renta variable y ETFs", async () => {
    const res = SalidaConsultarCatalogoInversiones.parse(
      await consultarCatalogoInversiones.manejar({ riesgoMaximo: 2 }),
    );

    expect(res.total).toBeGreaterThan(0);
    for (const inst of res.instrumentos) {
      expect(inst.riesgo).toBeLessThanOrEqual(2);
    }
    const claves = res.instrumentos.map((i) => i.clave);
    expect(claves).not.toContain("GFNORTEO");
    expect(claves).not.toContain("CEMEXCPO");
  });

  it("filtro por montoDisponibleCentavos filtra instrumentos con entrada accesible", async () => {
    const res = SalidaConsultarCatalogoInversiones.parse(
      await consultarCatalogoInversiones.manejar({ montoDisponibleCentavos: 50000 }), // $500 MXN
    );

    expect(res.total).toBeGreaterThan(0);
    for (const inst of res.instrumentos) {
      expect(inst.montoMinimoCentavos).toBeLessThanOrEqual(50000);
    }
  });
});

describe("consultar_historico_inversion", () => {
  it("CETES 28 días: serie de 12 semanas con precio ascendente y rendimiento positivo", async () => {
    const res = SalidaConsultarHistoricoInversion.parse(
      await consultarHistoricoInversion.manejar({
        instrumentoId: "inst_cetes_28",
        semanas: 12,
      }),
    );

    expect(res.instrumento.clave).toBe("CETES28");
    expect(res.semanasConsultadas).toBe(12);
    expect(res.puntos).toHaveLength(12);
    expect(res.precioFinalCentavos).toBeGreaterThan(res.precioInicialCentavos);
    expect(res.rendimientoPeriodoPct).toBeGreaterThan(0);

    // Fechas en orden cronológico
    const fechas = res.puntos.map((p) => p.fecha);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it("NAFTRAC (ETF IPC): serie histórica completa de precios de cierre semanales", async () => {
    const res = SalidaConsultarHistoricoInversion.parse(
      await consultarHistoricoInversion.manejar({
        instrumentoId: "inst_naftrac",
        semanas: 24,
      }),
    );

    expect(res.instrumento.nombre).toBe("ETF IPC (NAFTRAC)");
    expect(res.semanasConsultadas).toBe(24);
    expect(res.puntos).toHaveLength(24);
    for (const p of res.puntos) {
      expect(p.precioCierreCentavos).toBeGreaterThan(0);
    }
  });

  it("falla si el instrumento no existe", async () => {
    await expect(async () =>
      consultarHistoricoInversion.manejar({ instrumentoId: "inst_inexistente" }),
    ).rejects.toThrow(/no existe el instrumento/);
  });
});
