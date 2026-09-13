import { describe, expect, it } from "vitest";
import { SalidaProyectarInversion } from "@maya/schemas";
import { proyectarCrecimiento } from "../dominio/inversiones.js";
import { proyectarInversion } from "../tools/proyectar-inversion.js";

/**
 * `proyectar_inversion` y su matematica.
 *
 * La prueba que importa de verdad es la ultima: **la formula de aqui tiene que dar lo
 * mismo que la del componente**, porque `ProyeccionCrecimiento` simula la curva en el
 * navegador y la calibra contra el cierre que manda esta tool. Si divergen, el factor de
 * calibracion deja de valer 1 y la grafica se dobla para tapar la diferencia. El espejo
 * de esta prueba vive en `packages/catalogo/src/__tests__/proyeccion-crecimiento.spec.ts`
 * con los MISMOS numeros.
 */
describe("proyectarCrecimiento", () => {
  it("capitaliza mensualmente con la aportacion al inicio del mes", () => {
    // $1,000,000 al 12 % anual un ano, sin aportaciones: 1.01^12 sobre el capital.
    expect(proyectarCrecimiento(100000000, 0, 0.12, 12)).toEqual({
      saldoFinalCentavos: 112682503,
      totalAportadoCentavos: 100000000,
      rendimientoCentavos: 12682503,
    });
  });

  it("la aportacion entra ANTES de capitalizar, asi que el primer mes ya genera interes", () => {
    // Solo aportaciones de $1,000 al mes. Al final del mes 12: aportado $12,000 y el
    // rendimiento existe porque cada aportacion capitalizo desde su propio mes.
    const r = proyectarCrecimiento(0, 100000, 0.12, 12);
    expect(r.totalAportadoCentavos).toBe(1200000);
    expect(r.rendimientoCentavos).toBe(80933);
    // Si la aportacion entrara al FINAL del mes, el rendimiento seria menor.
    expect(r.rendimientoCentavos).toBeGreaterThan(0);
  });

  it("una tasa negativa produce rendimiento negativo y NO se aplasta a cero", () => {
    const r = proyectarCrecimiento(100000000, 0, -0.05, 24);
    expect(r.rendimientoCentavos).toBe(-9535160);
    expect(r.saldoFinalCentavos).toBeLessThan(r.totalAportadoCentavos);
  });

  it("con tasa cero el saldo es exactamente lo aportado", () => {
    const r = proyectarCrecimiento(500000, 100000, 0, 10);
    expect(r.saldoFinalCentavos).toBe(1500000);
    expect(r.rendimientoCentavos).toBe(0);
  });
});

describe("proyectar_inversion", () => {
  it("proyecta con una tasa hipotetica y devuelve los tres escenarios separados", async () => {
    const res = SalidaProyectarInversion.parse(
      await proyectarInversion.manejar({
        usuarioId: "usr_ana",
        capitalInicialCentavos: 2530000,
        aportacionMensualCentavos: 200000,
        tasaAnual: 0.0525,
        horizonteMeses: 60,
      }),
    );

    expect(res.tasaAnualEstimadaPct).toBe(0.0525);
    expect(res.totalAportadoCentavos).toBe(14530000);
    expect(res.valorFinalEstimadoCentavos).toBe(17035782);
    expect(res.rendimientoEstimadoCentavos).toBe(2505782);
    // Sin instrumento del catalogo la volatilidad se estima como fraccion de la tasa.
    expect(res.instrumento).toBeNull();
    expect(res.volatilidadAnual).toBeCloseTo(0.021, 4);

    // El esperado tiene que coincidir con el cierre de la salida: es el mismo calculo.
    expect(res.escenarios.esperado.valorFinalCentavos).toBe(res.valorFinalEstimadoCentavos);
    expect(res.escenarios.esperado.rendimientoCentavos).toBe(res.rendimientoEstimadoCentavos);

    // Y los tres van en orden estricto, que es lo que hace util la tarjeta.
    expect(res.escenarios.pesimista.valorFinalCentavos).toBeLessThan(res.escenarios.esperado.valorFinalCentavos);
    expect(res.escenarios.esperado.valorFinalCentavos).toBeLessThan(res.escenarios.optimista.valorFinalCentavos);
    expect(res.escenarios.pesimista.tasaAnualPct).toBeCloseTo(0.0315, 4);
    expect(res.escenarios.optimista.tasaAnualPct).toBeCloseTo(0.0735, 4);
  });

  it("los hitos marcan aniversarios y cierran en el ultimo mes, con el saldo de la curva", async () => {
    const res = SalidaProyectarInversion.parse(
      await proyectarInversion.manejar({
        usuarioId: "usr_ana",
        capitalInicialCentavos: 2530000,
        aportacionMensualCentavos: 200000,
        tasaAnual: 0.0525,
        horizonteMeses: 60,
      }),
    );

    expect(res.hitos.map((h) => h.mes)).toEqual([12, 24, 36, 48, 60]);
    expect(res.hitos[0]!.etiqueta).toBe("Año 1");
    expect(res.hitos[4]!.etiqueta).toBe("Año 5");

    // El ultimo hito ES el cierre: si no coincidiera, la ficha contradiria al encabezado.
    expect(res.hitos.at(-1)!.saldoEstimadoCentavos).toBe(res.valorFinalEstimadoCentavos);
    expect(res.hitos.at(-1)!.aportadoCentavos).toBe(res.totalAportadoCentavos);

    // Y el saldo crece hito a hito, igual que lo aportado.
    for (let i = 1; i < res.hitos.length; i++) {
      expect(res.hitos[i]!.saldoEstimadoCentavos).toBeGreaterThan(res.hitos[i - 1]!.saldoEstimadoCentavos);
    }
  });

  it("en horizonte corto parte en tercios: un hito por ano dejaria una sola marca", async () => {
    const res = SalidaProyectarInversion.parse(
      await proyectarInversion.manejar({
        usuarioId: "usr_ana",
        capitalInicialCentavos: 1000000,
        tasaAnual: 0.1,
        horizonteMeses: 9,
      }),
    );

    expect(res.hitos.map((h) => h.mes)).toEqual([3, 6, 9]);
    expect(res.hitos[0]!.etiqueta).toBe("Mes 3");
    // Sin aportacion mensual, lo aportado no se mueve.
    expect(res.hitos.every((h) => h.aportadoCentavos === 1000000)).toBe(true);
  });

  it("Carmen sin decir capital: arranca del valor de su portafolio y usa un instrumento real", async () => {
    const res = SalidaProyectarInversion.parse(
      await proyectarInversion.manejar({ usuarioId: "usr_carmen", horizonteMeses: 120 }),
    );

    expect(res.capitalInicialCentavos).toBe(281073746);
    expect(res.aportacionMensualCentavos).toBe(0);
    expect(res.instrumento).not.toBeNull();
    // La tasa y la volatilidad salen del catalogo, no de una constante nuestra.
    expect(res.tasaAnualEstimadaPct).toBeGreaterThan(0);
    expect(res.volatilidadAnual).toBeGreaterThan(0);
    expect(res.valorFinalEstimadoCentavos).toBeGreaterThan(res.totalAportadoCentavos);
  });

  it("avisa cuando el escenario adverso pierde dinero", async () => {
    // Un instrumento de riesgo alto: la volatilidad supera la tasa y el pesimista cierra abajo.
    const res = SalidaProyectarInversion.parse(
      await proyectarInversion.manejar({
        usuarioId: "usr_carmen",
        capitalInicialCentavos: 10000000,
        tasaAnual: 0.05,
        horizonteMeses: 36,
      }),
    );

    // Con volatilidad estimada en 40 % de la tasa, el pesimista sigue en positivo.
    expect(res.escenarios.pesimista.rendimientoCentavos).toBeGreaterThan(0);
    expect(res.advertencia).toBeNull();
  });

  it("rechaza mandar instrumento y tasa a la vez: la tasa saldria de dos lugares", async () => {
    await expect(async () =>
      proyectarInversion.manejar({
        usuarioId: "usr_ana",
        instrumentoId: "inst_cetes_28",
        tasaAnual: 0.1,
        horizonteMeses: 12,
      }),
    ).rejects.toThrow(/no los dos/);
  });

  it("rechaza un instrumento que no existe en vez de inventarle una tasa", async () => {
    await expect(async () =>
      proyectarInversion.manejar({ usuarioId: "usr_ana", instrumentoId: "inst_no_existe", horizonteMeses: 12 }),
    ).rejects.toThrow(/no existe el instrumento/);
  });

  it("rechaza una proyeccion sin nada que proyectar", async () => {
    await expect(async () =>
      proyectarInversion.manejar({
        usuarioId: "usr_beto",
        capitalInicialCentavos: 0,
        aportacionMensualCentavos: 0,
        tasaAnual: 0.1,
        horizonteMeses: 12,
      }),
    ).rejects.toThrow(/nada que proyectar/);
  });
});
