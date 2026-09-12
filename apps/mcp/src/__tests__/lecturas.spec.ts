import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaCompararPeriodos,
  SalidaConsultarMovimientos,
  SalidaConsultarTarjeta,
  SalidaSimularReestructura,
} from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { compararPeriodos } from "../tools/comparar-periodos.js";
import { consultarMovimientos } from "../tools/consultar-movimientos.js";
import { consultarTarjeta } from "../tools/consultar-tarjeta.js";
import { simularReestructura } from "../tools/simular-reestructura.js";

/**
 * Las tools de lectura, con el estado en cero. Lo que se prueba no es que "devuelvan
 * algo": es que Beto y Ana reciban respuestas OPUESTAS, porque de eso vive la
 * adaptabilidad que se demuestra en pantalla.
 */
beforeEach(() => reiniciarEstado());

describe("consultar_tarjeta", () => {
  it("Beto: tarjeta al limite y con mora", async () => {
    const salida = SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_beto" }));
    expect(salida.tarjeta).not.toBeNull();
    expect(salida.tarjeta!.usoDelLimite).toBeGreaterThan(0.9);
    expect(salida.tarjeta!.diasMora).toBeGreaterThan(0);
    expect(salida.alerta).toBe("mora");
    expect(salida.planActivo).toBeNull();
    expect(salida.interesesUltimoMesCentavos).toBeGreaterThan(0);
  });

  it("Ana: no tiene tarjeta de credito, y la tool lo dice sin fallar", async () => {
    const salida = SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_ana" }));
    expect(salida.tarjeta).toBeNull();
    expect(salida.alerta).toBe("sin_tarjeta_credito");
  });

  it("Carmen: uso alto pero sin mora", async () => {
    const salida = SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_carmen" }));
    expect(salida.tarjeta!.diasMora).toBe(0);
    expect(salida.alerta).toBe("saludable");
  });
});

describe("simular_reestructura", () => {
  it("Beto: cuatro plazos, el de 18 meses recomendado y el ahorro de la tabla", async () => {
    const salida = SalidaSimularReestructura.parse(await simularReestructura.manejar({ usuarioId: "usr_beto" }));
    expect(salida.opciones.map((o) => o.plazoMeses)).toEqual([12, 18, 24, 36]);
    expect(salida.plazoRecomendado).toBe(18);
    expect(salida.escenarioMinimo.meses).toBe(209);
    const dieciocho = salida.opciones.find((o) => o.plazoMeses === 18)!;
    expect(dieciocho.esRecomendado).toBe(true);
    expect(dieciocho.mensualidadCentavos).toBe(319335);
    expect(dieciocho.ahorroVsMinimoCentavos).toBe(13206520);
    expect(dieciocho.cabeEnCapacidad).toBe(true);
  });

  it("cotiza un plazo que el banco no tiene en su tabla", async () => {
    const salida = SalidaSimularReestructura.parse(
      await simularReestructura.manejar({ usuarioId: "usr_beto", plazosMeses: [9] }),
    );
    expect(salida.opciones).toHaveLength(1);
    expect(salida.opciones[0]!.plazoMeses).toBe(9);
    expect(salida.opciones[0]!.mensualidadCentavos).toBeGreaterThan(319335);
  });

  it("Ana: falla con un motivo que el agente puede contar en pantalla", async () => {
    await expect(async () => simularReestructura.manejar({ usuarioId: "usr_ana" })).rejects.toThrow(
      /no tiene tarjeta de credito/,
    );
  });
});

describe("consultar_movimientos", () => {
  it("filtra por categoria y devuelve el total del filtro, no de la pagina", async () => {
    const salida = SalidaConsultarMovimientos.parse(
      await consultarMovimientos.manejar({
        usuarioId: "usr_beto",
        desde: "2026-08-01",
        hasta: "2026-08-31",
        categoriaId: "cat_restaurantes",
        limite: 2,
      }),
    );
    expect(salida.total).toBeGreaterThan(salida.mostrados);
    expect(salida.mostrados).toBe(2);
    expect(salida.movimientos.every((m) => m.categoriaId === "cat_restaurantes")).toBe(true);
    expect(salida.movimientos[0]!.categoria).toBe("Restaurantes");
    expect(salida.sumaCargosCentavos).toBe(103500);
  });

  it("por defecto son los ultimos 30 dias y trae algo (los datos terminan en una fecha fija)", async () => {
    const salida = SalidaConsultarMovimientos.parse(await consultarMovimientos.manejar({ usuarioId: "usr_beto" }));
    expect(salida.total).toBeGreaterThan(0);
  });
});

describe("comparar_periodos", () => {
  it("Beto en agosto: el gasto cuadra con diagnostico_habitos", async () => {
    const salida = SalidaCompararPeriodos.parse(
      await compararPeriodos.manejar({ usuarioId: "usr_beto", periodo: "2026-08" }),
    );
    expect(salida.periodoAnterior).toBe("2026-07");
    expect(salida.gastoCentavos).toBe(3334950);
    expect(salida.gastoAnteriorCentavos).toBe(3107400);
    expect(salida.ingresoCentavos).toBe(3450000);
    expect(salida.categorias.map((c) => c.categoriaId)).not.toContain("cat_transferencias");
    expect(salida.efectoDelPlan).toBeNull();
  });

  it("la categoria atipica no es la mas grande, es la que se salio de su patron", async () => {
    const salida = SalidaCompararPeriodos.parse(
      await compararPeriodos.manejar({ usuarioId: "usr_beto", periodo: "2026-08" }),
    );
    expect(salida.categorias[0]!.categoriaId).toBe("cat_vivienda");
    expect(salida.categoriaAtipicaId).not.toBe("cat_vivienda");
    const atipica = salida.categorias.find((c) => c.esAtipica);
    expect(atipica?.categoriaId).toBe(salida.categoriaAtipicaId);
  });

  it("las participaciones suman uno", async () => {
    const salida = SalidaCompararPeriodos.parse(
      await compararPeriodos.manejar({ usuarioId: "usr_ana", periodo: "2026-08" }),
    );
    const total = salida.categorias.reduce((s, c) => s + c.participacionPct, 0);
    expect(total).toBeCloseTo(1, 2);
  });
});
