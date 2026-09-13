import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaConsultarCreditos,
  SalidaEjecutarDecision,
  SalidaProgramarAbonoCapital,
  SalidaSimularPagoCredito,
} from "@maya/schemas";
import { accionesDe, aDecimal, aEntero, buscar, filtrar, reiniciarEstado } from "../datos/index.js";
import { simularConCuota } from "../dominio/finanzas.js";
import { consultarCreditos } from "../tools/consultar-creditos.js";
import { ejecutarDecision } from "../tools/ejecutar-decision.js";
import { programarAbonoCapital } from "../tools/programar-abono-capital.js";
import { proyectarAhorro } from "../tools/proyectar-ahorro.js";
import { simularPagoCredito } from "../tools/simular-pago-credito.js";

/**
 * Abono a capital: `simular_pago_credito` y `programar_abono_capital`
 * (`docs/algoritmos/abono-a-capital.md`).
 *
 * El ancla es la tabla del banco: con la cuota del contrato, la simulacion tiene que dar
 * EXACTAMENTE las filas pendientes de `banorte.amortizaciones`. Si eso se cumple, "pagar
 * $6,000" es la misma aritmetica con otra cuota, y no una segunda version de la verdad.
 */
beforeEach(() => reiniciarEstado());

const CREDITOS_A_PLAZO = [
  ["usr_ana", "cred_ana_personal"],
  ["usr_beto", "cred_beto_nomina"],
  ["usr_carmen", "cred_carmen_hipotecario"],
  ["usr_carmen", "cred_carmen_auto"],
] as const;

const simular = async (usuarioId: string, creditoId: string, extra: Record<string, unknown>) =>
  SalidaSimularPagoCredito.parse(await simularPagoCredito.manejar({ usuarioId, creditoId, ...extra }));

const programar = async (usuarioId: string, creditoId: string, mensualidadCentavos: number, idempotencyKey: string) =>
  SalidaProgramarAbonoCapital.parse(
    await programarAbonoCapital.manejar({ usuarioId, creditoId, mensualidadCentavos, idempotencyKey }),
  );

const credito = async (usuarioId: string, creditoId: string) =>
  SalidaConsultarCreditos.parse(
    await consultarCreditos.manejar({ usuarioId, creditoId, incluirAmortizacion: true, proximosPagos: 12 }),
  );

const pendientes = (creditoId: string) =>
  filtrar("amortizaciones", "credito_id", creditoId)
    .filter((a) => a.estatus !== "pagado")
    .sort((a, b) => aEntero(a.numero_pago) - aEntero(b.numero_pago));

describe("con la cuota del contrato, la simulacion ES la tabla del banco", () => {
  it.each(CREDITOS_A_PLAZO)("%s · %s: cada fila pendiente, al centavo", (_usuario, creditoId) => {
    const fila = buscar("creditos", "id", creditoId)!;
    const filas = simularConCuota(
      aEntero(fila.saldo_insoluto_centavos),
      aDecimal(fila.tasa_anual),
      aEntero(fila.mensualidad_centavos),
    )!;
    const tabla = pendientes(creditoId);

    expect(filas).toHaveLength(tabla.length);
    filas.forEach((f, i) => {
      const t = tabla[i]!;
      expect(f.saldoInicialCentavos, `saldo inicial pago ${t.numero_pago}`).toBe(aEntero(t.saldo_inicial_centavos));
      expect(f.capitalCentavos, `capital pago ${t.numero_pago}`).toBe(aEntero(t.capital_centavos));
      expect(f.interesCentavos, `interes pago ${t.numero_pago}`).toBe(aEntero(t.interes_centavos));
      expect(f.ivaInteresCentavos, `iva pago ${t.numero_pago}`).toBe(aEntero(t.iva_interes_centavos));
      expect(f.mensualidadCentavos, `mensualidad pago ${t.numero_pago}`).toBe(aEntero(t.mensualidad_centavos));
      expect(f.saldoFinalCentavos, `saldo final pago ${t.numero_pago}`).toBe(aEntero(t.saldo_final_centavos));
    });
  });

  it.each(CREDITOS_A_PLAZO)("%s · %s: `actual` sin abono cuadra con la tabla", async (usuarioId, creditoId) => {
    const tabla = pendientes(creditoId);
    const salida = await simular(usuarioId, creditoId, { plazoMeses: 1 });
    expect(salida.abonoProgramadoCentavos).toBe(0);
    expect(salida.actual.mensualidadCentavos).toBe(salida.mensualidadContratoCentavos);
    expect(salida.actual.plazoRestanteMeses).toBe(tabla.length);
    expect(salida.actual.fechaLiquidacion).toBe(tabla.at(-1)!.fecha);
    expect(salida.actual.totalInteresesEstimadosCentavos).toBe(
      tabla.reduce((s, t) => s + aEntero(t.interes_centavos) + aEntero(t.iva_interes_centavos), 0),
    );
  });

  it("una cuota que no cubre el interes no se simula: null, no un ciclo infinito", () => {
    // Carmen, hipoteca: $6,000 contra ~$14,644 de interes con IVA del primer mes.
    expect(simularConCuota(138985469, 0.109, 600000)).toBeNull();
  });
});

describe("«¿y si pago $6,000 al mes?»", () => {
  it("Ana: de 15 a 11 pagos y $3,470.21 menos de intereses", async () => {
    const salida = await simular("usr_ana", "cred_ana_personal", { mensualidadCentavos: 600000 });

    expect(salida.actual.plazoRestanteMeses).toBe(15);
    expect(salida.actual.totalInteresesEstimadosCentavos).toBe(1278115);
    expect(salida.posible).toBe(true);
    expect(salida.motivo).toBeNull();
    expect(salida.simulado!.mensualidadCentavos).toBe(600000);
    expect(salida.simulado!.plazoRestanteMeses).toBe(11);
    expect(salida.simulado!.totalInteresesEstimadosCentavos).toBe(931094);
    expect(salida.simulado!.fechaLiquidacion).toBe("2027-08-05");
    expect(salida.abonoMensualCentavos).toBe(142905);
    expect(salida.ahorroInteresesCentavos).toBe(347021);
    expect(salida.mesesMenos).toBe(4);
    expect(salida.aviso).toBeNull();
  });

  it("Ana: cuatro hitos (primero, ~1/3, ~2/3, liquidacion) numerados desde el contrato", async () => {
    const { simulado } = await simular("usr_ana", "cred_ana_personal", { mensualidadCentavos: 600000 });
    const hitos = simulado!.amortizacionResumen;
    expect(hitos.map((h) => h.numeroPago)).toEqual([10, 13, 16, 20]);
    expect(hitos.map((h) => h.periodo)).toEqual(["2026-10-05", "2027-01-05", "2027-04-05", "2027-08-05"]);
    expect(hitos[0]!.capitalCentavos + hitos[0]!.interesCentavos).toBe(600000);
    expect(hitos.at(-1)!.saldoFinalCentavos).toBe(0);
  });

  it("Beto: de 14 a 6 pagos y $3,312.86 menos de intereses", async () => {
    const salida = await simular("usr_beto", "cred_beto_nomina", { mensualidadCentavos: 600000 });
    expect(salida.actual.plazoRestanteMeses).toBe(14);
    expect(salida.actual.totalInteresesEstimadosCentavos).toBe(560715);
    expect(salida.simulado!.plazoRestanteMeses).toBe(6);
    expect(salida.simulado!.totalInteresesEstimadosCentavos).toBe(229429);
    expect(salida.ahorroInteresesCentavos).toBe(331286);
    expect(salida.mesesMenos).toBe(8);
    // Su deuda al mes pasa a $8,950.73 (con el minimo de la tarjeta): 25.9 %, debajo del techo.
    expect(salida.mensualidadDeudaTotalCentavos).toBe(895073);
    expect(salida.aviso).toBeNull();
  });

  it("con pocos pagos los hitos no se repiten", async () => {
    const salida = await simular("usr_beto", "cred_beto_nomina", { plazoMeses: 2 });
    expect(salida.simulado!.amortizacionResumen.map((h) => h.numeroPago)).toEqual([23, 24]);
  });

  it("pagar mas de lo que se debe liquida en un pago, y se cobra solo lo que falta", async () => {
    const salida = await simular("usr_beto", "cred_beto_nomina", { mensualidadCentavos: 10_000_000 });
    expect(salida.simulado!.plazoRestanteMeses).toBe(1);
    expect(salida.simulado!.mensualidadCentavos).toBeLessThan(10_000_000);
    expect(salida.simulado!.mensualidadCentavos).toBe(2954065 + salida.simulado!.amortizacionResumen[0]!.interesCentavos);
  });
});

describe("«quiero liquidarlo en N meses»", () => {
  it("Ana a 12 meses: exactamente 12, aunque la formula redondeada diera 13", async () => {
    const salida = await simular("usr_ana", "cred_ana_personal", { plazoMeses: 12 });
    expect(salida.simulado!.plazoRestanteMeses).toBe(12);
    // mensualidad() da 550,320 y deja un residuo que seria un pago 13: se sube un centavo.
    expect(salida.simulado!.mensualidadCentavos).toBe(550321);
    expect(salida.simulado!.totalInteresesEstimadosCentavos).toBe(1025533);
    expect(salida.ahorroInteresesCentavos).toBe(252582);
    expect(salida.mesesMenos).toBe(3);
  });

  it.each(CREDITOS_A_PLAZO)("%s · %s: todo plazo posible cierra justo en ese plazo", async (usuarioId, creditoId) => {
    const maximo = pendientes(creditoId).length;
    for (let plazo = 1; plazo <= maximo; plazo++) {
      const salida = await simular(usuarioId, creditoId, { plazoMeses: plazo });
      expect(salida.simulado!.plazoRestanteMeses, `plazo ${plazo}`).toBe(plazo);
      expect(salida.simulado!.mensualidadCentavos, `plazo ${plazo}`).toBeGreaterThanOrEqual(
        plazo === 1 ? 0 : salida.mensualidadContratoCentavos,
      );
    }
  });

  it("el plazo que ya faltaba es el contrato: abono 0 y nada cambia", async () => {
    const salida = await simular("usr_ana", "cred_ana_personal", { plazoMeses: 15 });
    expect(salida.posible).toBe(true);
    expect(salida.abonoMensualCentavos).toBe(0);
    expect(salida.simulado).toEqual(salida.actual);
    expect(salida.ahorroInteresesCentavos).toBe(0);
  });
});

describe("lo que no se logra con abonos a capital", () => {
  it("Carmen, hipoteca a $6,000: menos que el contrato, con el monto en pesos", async () => {
    const salida = await simular("usr_carmen", "cred_carmen_hipotecario", { mensualidadCentavos: 600000 });
    expect(salida.posible).toBe(false);
    expect(salida.motivo).toContain("$18,914.08");
    expect(salida.simulado).toBeNull();
    expect(salida.abonoMensualCentavos).toBe(0);
    expect(salida.ahorroInteresesCentavos).toBe(0);
    expect(salida.mesesMenos).toBe(0);
    expect(salida.aviso).toBeNull();
  });

  it("Ana a $4,000: menos que su contrato de $4,570.95", async () => {
    const salida = await simular("usr_ana", "cred_ana_personal", { mensualidadCentavos: 400000 });
    expect(salida.posible).toBe(false);
    expect(salida.motivo).toContain("$4,570.95");
    expect(salida.motivo).toMatch(/reestructurar/);
  });

  it("Ana en 16 meses: le quedan 15, alargar no se puede", async () => {
    const salida = await simular("usr_ana", "cred_ana_personal", { plazoMeses: 16 });
    expect(salida.posible).toBe(false);
    expect(salida.motivo).toContain("15 meses");
    expect(salida.motivo).toContain("$4,570.95");
    expect(salida.simulado).toBeNull();
  });
});

describe("el aviso de capacidad de pago", () => {
  it("Ana en 5 meses: $12,075.31 al mes rebasa su techo de $11,200 (35 % de $32,000)", async () => {
    const salida = await simular("usr_ana", "cred_ana_personal", { plazoMeses: 5 });
    expect(salida.posible).toBe(true);
    expect(salida.capacidadPagoMensualCentavos).toBe(1120000);
    expect(salida.mensualidadDeudaTotalCentavos).toBe(1207531);
    expect(salida.pctDelIngreso).toBe(0.3774);
    expect(salida.aviso).toContain("$12,075.31");
    expect(salida.aviso).toContain("$11,200.00");
  });

  it("el techo es lo comprometido mas lo libre de buro, no solo lo libre", async () => {
    // Carmen ya compromete $31,429.71 con $8,820.29 libres: con "solo lo libre" toda simulacion avisaria.
    const salida = await simular("usr_carmen", "cred_carmen_auto", { plazoMeses: 17 });
    expect(salida.capacidadPagoMensualCentavos).toBe(4025000);
    expect(salida.aviso).toBeNull();
  });
});

describe("errores con motivo", () => {
  it("exactamente uno de `mensualidadCentavos` y `plazoMeses`", async () => {
    await expect(simular("usr_ana", "cred_ana_personal", {})).rejects.toThrow(/exactamente uno/);
    await expect(
      simular("usr_ana", "cred_ana_personal", { mensualidadCentavos: 600000, plazoMeses: 12 }),
    ).rejects.toThrow(/exactamente uno/);
  });

  it("un credito de otra persona", async () => {
    await expect(simular("usr_ana", "cred_beto_nomina", { plazoMeses: 6 })).rejects.toThrow(/no es de usr_ana/);
  });

  it("la tarjeta vista como credito no se simula con abonos", async () => {
    await expect(simular("usr_beto", "cred_beto_tdc", { plazoMeses: 6 })).rejects.toThrow(/tarjeta/);
  });

  it("programar menos que el contrato falla con el motivo y no guarda nada", async () => {
    await expect(programar("usr_ana", "cred_ana_personal", 400000, "abono:menos")).rejects.toThrow(/\$4,570\.95/);
    expect(accionesDe("usr_ana", "programar_abono_capital")).toHaveLength(0);
  });
});

describe("programar_abono_capital: el ciclo completo", () => {
  it("Ana programa $6,000 y `consultar_creditos` cuenta la historia nueva", async () => {
    const antes = await credito("usr_ana", "cred_ana_personal");
    expect(antes.creditos[0]!.abonoMensualCentavos).toBe(0);
    expect(antes.creditos[0]!.mensualidadContratoCentavos).toBe(457095);

    const accion = await programar("usr_ana", "cred_ana_personal", 600000, "abono:ana:1");
    expect(accion.aplicado).toBe(true);
    expect(accion.yaEstaba).toBe(false);
    expect(accion.abono).toEqual({
      creditoId: "cred_ana_personal",
      alias: "Crédito Personal",
      abonoMensualCentavos: 142905,
      mensualidadContratoCentavos: 457095,
      desde: "2026-10-05",
    });
    expect(accion.antes.plazoRestanteMeses).toBe(15);
    expect(accion.despues.plazoRestanteMeses).toBe(11);
    expect(accion.ahorroInteresesCentavos).toBe(347021);
    expect(accion.mesesMenos).toBe(4);
    expect(accion.mensaje).toContain("$6,000.00");
    expect(accion.mensaje).toContain("$1,429.05");

    const despues = await credito("usr_ana", "cred_ana_personal");
    const c = despues.creditos[0]!;
    expect(c.mensualidadCentavos).toBe(600000);
    expect(c.mensualidadContratoCentavos).toBe(457095);
    expect(c.abonoMensualCentavos).toBe(142905);
    expect(c.pagosRestantes).toBe(11);
    expect(despues.mensualidadTotalCentavos).toBe(600000);
    // La tabla de pagos ya es la nueva: 11 filas, en orden, que cierran en cero.
    expect(c.amortizacion).toHaveLength(11);
    expect(c.amortizacion.map((p) => p.numeroPago)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(c.amortizacion[0]!.fecha).toBe("2026-10-05");
    expect(c.amortizacion.at(-1)!.fecha).toBe(accion.despues.fechaLiquidacion);
    expect(c.amortizacion.at(-1)!.saldoFinalCentavos).toBe(0);
    expect(c.amortizacion.every((p) => p.estatus === "pendiente")).toBe(true);
    const intereses = c.amortizacion.reduce((s, p) => s + p.interesCentavos + p.ivaInteresCentavos, 0);
    expect(intereses).toBe(931094);
  });

  it("`simular_pago_credito.actual` ya trae el abono programado", async () => {
    await programar("usr_ana", "cred_ana_personal", 600000, "abono:ana:2");
    const salida = await simular("usr_ana", "cred_ana_personal", { plazoMeses: 15 });
    expect(salida.abonoProgramadoCentavos).toBe(142905);
    expect(salida.actual.mensualidadCentavos).toBe(600000);
    expect(salida.actual.plazoRestanteMeses).toBe(11);
    // Volver al plazo del contrato es quitar el abono: se pagan mas intereses, y se dice.
    expect(salida.abonoMensualCentavos).toBe(0);
    expect(salida.ahorroInteresesCentavos).toBe(-347021);
    expect(salida.mesesMenos).toBe(-4);
  });

  it("es idempotente: la misma llave no guarda dos veces y responde lo mismo", async () => {
    const primera = await programar("usr_ana", "cred_ana_personal", 600000, "abono:ana:3");
    const segunda = await programar("usr_ana", "cred_ana_personal", 600000, "abono:ana:3");
    expect(segunda.aplicado).toBe(false);
    expect(segunda.yaEstaba).toBe(true);
    expect(segunda.antes).toEqual(primera.antes);
    expect(segunda.despues).toEqual(primera.despues);
    expect(accionesDe("usr_ana", "programar_abono_capital")).toHaveLength(1);
  });

  it("reprogramar reemplaza, y programar el contrato lo quita", async () => {
    const inicial = await credito("usr_beto", "cred_beto_nomina");

    await programar("usr_beto", "cred_beto_nomina", 600000, "abono:beto:1");
    const segunda = await programar("usr_beto", "cred_beto_nomina", 400000, "abono:beto:2");
    expect(segunda.antes.mensualidadCentavos).toBe(600000);
    expect(segunda.despues.mensualidadCentavos).toBe(400000);
    expect((await credito("usr_beto", "cred_beto_nomina")).creditos[0]!.mensualidadCentavos).toBe(400000);

    const quitar = await programar("usr_beto", "cred_beto_nomina", 251056, "abono:beto:3");
    expect(quitar.abono.abonoMensualCentavos).toBe(0);
    expect(quitar.mensaje).toMatch(/sin abono/);
    // Sin abono, todo vuelve a ser la tabla del banco, campo por campo.
    expect(await credito("usr_beto", "cred_beto_nomina")).toEqual(inicial);
  });

  it("el abono es por credito: el auto de Carmen no toca su hipoteca", async () => {
    await programar("usr_carmen", "cred_carmen_auto", 1720550, "abono:carmen:1");
    const salida = SalidaConsultarCreditos.parse(await consultarCreditos.manejar({ usuarioId: "usr_carmen" }));
    const auto = salida.creditos.find((c) => c.id === "cred_carmen_auto")!;
    const hipoteca = salida.creditos.find((c) => c.id === "cred_carmen_hipotecario")!;
    expect(auto.pagosRestantes).toBe(12);
    expect(hipoteca.abonoMensualCentavos).toBe(0);
    expect(hipoteca.pagosRestantes).toBe(142);
  });

  it("lo que se abona al credito deja de estar disponible para ahorrar", async () => {
    const capacidad = async () =>
      (await proyectarAhorro.manejar({ usuarioId: "usr_ana", montoObjetivoCentavos: 9600000 })) as { capacidadMensualCentavos: number };
    const antes = (await capacidad()).capacidadMensualCentavos;
    const { abono } = await programar("usr_ana", "cred_ana_personal", 600000, "c_ahorro:1");
    const despues = (await capacidad()).capacidadMensualCentavos;
    expect(despues).toBe(Math.max(0, antes - abono.abonoMensualCentavos));
  });

  it("`reiniciarEstado` lo borra: vuelve el contrato", async () => {
    const inicial = await credito("usr_ana", "cred_ana_personal");
    await programar("usr_ana", "cred_ana_personal", 600000, "abono:ana:4");
    await reiniciarEstado();
    expect(accionesDe("usr_ana", "programar_abono_capital")).toHaveLength(0);
    expect(await credito("usr_ana", "cred_ana_personal")).toEqual(inicial);
  });
});

describe("programar_abono_capital via ejecutar_decision", () => {
  it("despacha, y `estadoPosterior` es el credito con su tabla nueva", async () => {
    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "programar_abono_capital",
        context: { creditoId: "cred_ana_personal", mensualidadCentavos: 600000, idempotencyKey: "abono:orq:1" },
      }),
    );
    expect(compuesto.accion).toBe("programar_abono_capital");
    const resultado = SalidaProgramarAbonoCapital.parse(compuesto.resultadoAccion);
    expect(resultado.aplicado).toBe(true);
    expect(resultado.despues.plazoRestanteMeses).toBe(11);

    const esperado = await credito("usr_ana", "cred_ana_personal");
    expect(compuesto.estadoPosterior).toEqual(esperado);
    expect(esperado.creditos[0]!.amortizacion).toHaveLength(11);
  });

  it("el `usuarioId` del context no se cuela: el credito de otra persona no se programa", async () => {
    await expect(
      ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "programar_abono_capital",
        context: {
          usuarioId: "usr_beto",
          creditoId: "cred_beto_nomina",
          mensualidadCentavos: 600000,
          idempotencyKey: "abono:orq:2",
        },
      }),
    ).rejects.toThrow(/no es de usr_ana/);
  });
});
