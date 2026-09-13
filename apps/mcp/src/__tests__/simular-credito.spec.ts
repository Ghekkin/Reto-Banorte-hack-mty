import { describe, expect, it } from "vitest";
import { SalidaSimularCredito } from "@maya/schemas";
import { interesesDelPlazo, mensualidad, mesesParaLiquidar } from "../dominio/finanzas.js";
import { simularCredito } from "../tools/simular-credito.js";

/**
 * `simular_credito` y su matematica.
 *
 * **La asercion que amarra todo esto a los datos** es la primera: con el plazo que le
 * queda a Ana (15 pagos), la formula tiene que devolver EXACTAMENTE la mensualidad que
 * trae guardada en la base. Si alguien toca `mensualidad()`, esa prueba truena, y eso es
 * justo lo que debe pasar.
 *
 * El bug que origino la tool: el 2026-09-12 el modelo contesto que Ana necesitaba pagar
 * "$504,785 al mes" para liquidar en un ano. La respuesta era $5,503.20.
 */
describe("mesesParaLiquidar", () => {
  it("es la inversa de mensualidad(): pagar la cuota de 12 meses liquida en 12 meses", () => {
    const saldo = 5578308;
    const cuota = mensualidad(saldo, 0.279, 12);
    expect(mesesParaLiquidar(saldo, 0.279, cuota).meses).toBe(12);
  });

  it("un pago que no cubre el interes no liquida nunca, y lo dice", () => {
    // El interes con IVA del primer mes de Ana son $1,504.47: con $500 el saldo crece.
    const r = mesesParaLiquidar(5578308, 0.279, 50000);
    expect(r.nuncaLiquida).toBe(true);
    expect(r.meses).toBeNull();
    expect(r.filas).toEqual([]);
  });

  it("la tabla que devuelve cierra en cero exactamente", () => {
    const r = mesesParaLiquidar(5578308, 0.279, 600000);
    expect(r.meses).toBe(11);
    expect(r.filas).toHaveLength(11);
    expect(r.filas.at(-1)!.saldoFinalCentavos).toBe(0);
    // Y el ultimo pago es menor que los demas: solo cubre lo que faltaba.
    expect(r.filas.at(-1)!.mensualidadCentavos).toBeLessThan(600000);
  });

  it("los intereses sumados coinciden con los de la tabla, no se estiman aparte", () => {
    const r = mesesParaLiquidar(5578308, 0.279, 600000);
    const deLasFilas = r.filas.reduce((s, f) => s + f.interesCentavos + f.ivaInteresCentavos, 0);
    expect(r.totalInteresesCentavos).toBe(deLasFilas);
  });
});

describe("simular_credito", () => {
  it("Ana a 15 meses: da EXACTAMENTE la mensualidad que ya tiene guardada", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 15 }),
    );

    expect(res.creditoId).toBe("cred_ana_personal");
    expect(res.saldoInsolutoCentavos).toBe(5578308);
    expect(res.tasaAnual).toBe(0.279);
    // El ancla: 15 pagos restantes al 27.9 % sobre $55,783.08 son sus $4,570.95 reales.
    expect(res.mensualidadActualCentavos).toBe(457095);
    expect(res.mensualidadNuevaCentavos).toBe(457095);
    expect(res.mesesQueAdelanta).toBe(0);
    expect(res.diferenciaMensualCentavos).toBe(0);
  });

  it("Ana en 12 meses: $5,503.20 al mes, que es la cifra que el modelo se invento mal", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 12 }),
    );

    expect(res.mensualidadNuevaCentavos).toBe(550320);
    expect(res.plazoNuevoMeses).toBe(12);
    expect(res.interesesNuevosCentavos).toBe(interesesDelPlazo(5578308, 0.279, 12));
    // Termina 3 meses antes y paga $932.25 mas al mes.
    expect(res.mesesQueAdelanta).toBe(3);
    expect(res.diferenciaMensualCentavos).toBe(93225);
    // Y se ahorra intereses, porque el saldo vive menos tiempo.
    expect(res.ahorroInteresesCentavos).toBeGreaterThan(0);
    expect(res.nuncaLiquida).toBe(false);
  });

  it("alargar el plazo se reporta como MAS caro, con el ahorro en negativo", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 36 }),
    );

    expect(res.mensualidadNuevaCentavos).toBeLessThan(res.mensualidadActualCentavos);
    expect(res.ahorroInteresesCentavos).toBeLessThan(0);
    expect(res.mesesQueAdelanta).toBeLessThan(0);
    expect(res.advertencia).toMatch(/MAS caro/);
  });

  it("un abono extra de $1,000: termina en 12 meses en vez de 15", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", abonoExtraMensualCentavos: 100000 }),
    );

    expect(res.mensualidadNuevaCentavos).toBe(557095); // su cuota + el abono
    expect(res.plazoNuevoMeses).toBe(12);
    expect(res.mesesQueAdelanta).toBe(3);
    expect(res.diferenciaMensualCentavos).toBe(100000);
    expect(res.interesesNuevosCentavos).toBe(1012325);
    expect(res.ahorroInteresesCentavos).toBeGreaterThan(0);
  });

  it("con una mensualidad objetivo contesta el PLAZO, que es la pregunta inversa", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", mensualidadObjetivoCentavos: 600000 }),
    );

    expect(res.mensualidadNuevaCentavos).toBe(600000);
    expect(res.plazoNuevoMeses).toBe(11);
    expect(res.interesesNuevosCentavos).toBe(931094);
  });

  it("el resumen trae fechas reales y el saldo bajando hasta cero", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 12 }),
    );

    expect(res.amortizacionResumen).toHaveLength(6);
    // Arranca en el proximo pago pactado: la simulacion cambia el cuanto, no el cuando.
    expect(res.amortizacionResumen[0]!.fecha).toBe("2026-10-05");
    expect(res.amortizacionResumen[1]!.fecha).toBe("2026-11-05");
    expect(res.amortizacionResumen[0]!.numeroPago).toBe(1);

    for (let i = 1; i < res.amortizacionResumen.length; i++) {
      expect(res.amortizacionResumen[i]!.saldoFinalCentavos).toBeLessThan(
        res.amortizacionResumen[i - 1]!.saldoFinalCentavos,
      );
    }
    // El interes de la fila ya trae IVA: capital + interes = la mensualidad.
    const primera = res.amortizacionResumen[0]!;
    expect(primera.capitalCentavos + primera.interesCentavos).toBe(primera.mensualidadCentavos);
  });

  it("una mensualidad que no cubre el interes no devuelve plazo: devuelve el caso", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", mensualidadObjetivoCentavos: 50000 }),
    );

    expect(res.nuncaLiquida).toBe(true);
    expect(res.plazoNuevoMeses).toBe(0);
    expect(res.amortizacionResumen).toEqual([]);
    expect(res.advertencia).toMatch(/no alcanza a cubrir/);
  });

  it("avisa cuando la mensualidad se pasa de la capacidad de pago", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 3 }),
    );

    expect(res.mensualidadNuevaCentavos).toBeGreaterThan(res.capacidadPagoMensualCentavos);
    expect(res.dentroDeCapacidad).toBe(false);
    expect(res.advertencia).toMatch(/capacidad de pago/);
  });

  it("los intereses del plan ACTUAL salen de la tabla de amortizacion, no de recalcular", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 12 }),
    );

    // 24 pagos pactados, 9 hechos: le quedan 15.
    expect(res.plazoRestanteActualMeses).toBe(15);
    expect(res.interesesActualesCentavos).toBeGreaterThan(0);
  });

  it("rechaza dos escenarios a la vez: son tres preguntas distintas", async () => {
    await expect(async () =>
      simularCredito.manejar({ usuarioId: "usr_ana", plazoObjetivoMeses: 12, abonoExtraMensualCentavos: 100000 }),
    ).rejects.toThrow(/EXACTAMENTE uno/);
  });

  it("rechaza no mandar ninguno", async () => {
    await expect(async () => simularCredito.manejar({ usuarioId: "usr_ana" })).rejects.toThrow(/EXACTAMENTE uno/);
  });

  it("rechaza la tarjeta vista como credito: eso es simular_reestructura", async () => {
    await expect(async () =>
      simularCredito.manejar({ usuarioId: "usr_beto", creditoId: "cred_beto_tdc", plazoObjetivoMeses: 12 }),
    ).rejects.toThrow(/no es un credito a plazo/);
  });

  it("rechaza el credito de otra persona", async () => {
    await expect(async () =>
      simularCredito.manejar({ usuarioId: "usr_ana", creditoId: "cred_carmen_auto", plazoObjetivoMeses: 12 }),
    ).rejects.toThrow(/no es un credito a plazo de usr_ana/);
  });

  it("Beto tambien se puede simular: tiene credito de nomina aparte de la tarjeta", async () => {
    const res = SalidaSimularCredito.parse(
      await simularCredito.manejar({ usuarioId: "usr_beto", plazoObjetivoMeses: 18 }),
    );

    // El de nomina, no la tarjeta: `creditosAPlazo` excluye las filas con `tarjeta_id`.
    expect(res.creditoId).not.toBe("cred_beto_tdc");
    expect(res.saldoInsolutoCentavos).toBe(2954065);
    expect(res.plazoNuevoMeses).toBe(18);
  });
});
