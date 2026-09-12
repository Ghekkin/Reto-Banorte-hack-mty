import { beforeEach, describe, expect, it } from "vitest";
import { SalidaConsultarCreditos } from "@maya/schemas";
import { aEntero, buscar, reiniciarEstado } from "../datos/index.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { consultarCreditos } from "../tools/consultar-creditos.js";

/**
 * `consultar_creditos`. La prueba que importa es la primera: que la tarjeta NO se
 * cuente dos veces. En los datos, la tarjeta de Beto existe tambien como fila de
 * `creditos` (`cred_beto_tdc`), y sumar la tabla completa inflaria su deuda en
 * $47,386.
 *
 * El ancla contra la que se verifica es `buro`, que es una fuente independiente:
 * `deuda_total_centavos` y `pago_mensual_comprometido_centavos` tienen que salir
 * exactos.
 */
beforeEach(() => reiniciarEstado());

const creditos = async (usuarioId: string, extra: Record<string, unknown> = {}) =>
  SalidaConsultarCreditos.parse(await consultarCreditos.manejar({ usuarioId, ...extra }));

const deBuro = (usuarioId: string, campo: string) => aEntero(buscar("buro", "usuario_id", usuarioId)![campo]);

describe("la tarjeta no se cuenta dos veces", () => {
  it("Beto: `creditos` trae solo el de nomina; la tarjeta va aparte", async () => {
    const salida = await creditos("usr_beto");
    expect(salida.creditos).toHaveLength(1);
    expect(salida.creditos[0]!.id).toBe("cred_beto_nomina");
    // cred_beto_tdc es la tarjeta vista como credito: no puede estar aqui.
    expect(salida.creditos.map((c) => c.id)).not.toContain("cred_beto_tdc");
    expect(salida.tarjeta).not.toBeNull();
    expect(salida.tarjeta!.id).toBe("tar_beto_clasica");
  });

  it("Beto: el total cuadra con buro al centavo", async () => {
    const salida = await creditos("usr_beto");
    expect(salida.deudaCreditosCentavos).toBe(2954065);
    expect(salida.deudaTarjetaCentavos).toBe(4738600);
    expect(salida.deudaTotalCentavos).toBe(7692665);
    expect(salida.deudaTotalCentavos).toBe(deBuro("usr_beto", "deuda_total_centavos"));
    expect(salida.mensualidadTotalCentavos).toBe(deBuro("usr_beto", "pago_mensual_comprometido_centavos"));
  });

  it("Ana: sin tarjeta de credito, pero con deuda", async () => {
    const salida = await creditos("usr_ana");
    expect(salida.tarjeta).toBeNull();
    expect(salida.deudaTarjetaCentavos).toBe(0);
    // La respuesta que estaba equivocada antes de esta tool: Ana NO debe cero.
    expect(salida.deudaTotalCentavos).toBe(5578308);
    expect(salida.deudaTotalCentavos).toBe(deBuro("usr_ana", "deuda_total_centavos"));
    expect(salida.creditos[0]!.alias).toBe("Crédito Personal");
  });

  it("Carmen: dos creditos, ordenados del mas grande al mas chico", async () => {
    const salida = await creditos("usr_carmen");
    expect(salida.creditos.map((c) => c.id)).toEqual(["cred_carmen_hipotecario", "cred_carmen_auto"]);
    expect(salida.creditos[0]!.tipo).toBe("hipotecario");
    expect(salida.deudaCreditosCentavos).toBe(deBuro("usr_carmen", "deuda_total_centavos"));
    // Su tarjeta si suma al total, aunque buro no la tenga fichada.
    expect(salida.deudaTotalCentavos).toBe(salida.deudaCreditosCentavos + 2841500);
  });
});

describe("ratio de deuda sobre ingreso", () => {
  it("coincide con el que el diagnostico mensual reporta por su cuenta", async () => {
    // Dos calculos independientes sobre las mismas personas: si no cuadran, uno miente.
    expect((await creditos("usr_beto")).ratioDeudaIngreso).toBe(0.1583);
    expect((await creditos("usr_ana")).ratioDeudaIngreso).toBe(0.1428);
  });
});

describe("el credito mas caro", () => {
  it("Beto: gana la tarjeta, con 62.1 % de CAT contra 33 % del credito de nomina", async () => {
    const salida = await creditos("usr_beto");
    expect(salida.creditoMasCaroId).toBe("tar_beto_clasica");
  });

  it("Ana: sin tarjeta, gana su unico credito", async () => {
    expect((await creditos("usr_ana")).creditoMasCaroId).toBe("cred_ana_personal");
  });

  it("Carmen: el auto (17 %) es mas caro que la hipoteca (13.6 %), pero gana su tarjeta", async () => {
    expect((await creditos("usr_carmen")).creditoMasCaroId).toBe("tar_carmen_oro");
  });
});

describe("amortizacion", () => {
  it("no viene si no se pide: la salida se mantiene corta", async () => {
    const salida = await creditos("usr_beto");
    expect(salida.creditos[0]!.amortizacion).toEqual([]);
  });

  it("trae los proximos pagos pendientes, nunca los ya pagados", async () => {
    const salida = await creditos("usr_beto", { incluirAmortizacion: true });
    const pagos = salida.creditos[0]!.amortizacion;
    expect(pagos).toHaveLength(3);
    expect(pagos[0]!.numeroPago).toBe(23);
    expect(pagos.every((p) => p.estatus !== "pagado")).toBe(true);
    // El saldo insoluto del credito es el saldo inicial del siguiente pago.
    expect(pagos[0]!.mensualidadCentavos).toBe(251056);
  });

  it("`proximosPagos` manda sobre el default", async () => {
    const salida = await creditos("usr_carmen", { incluirAmortizacion: true, proximosPagos: 6 });
    expect(salida.creditos[0]!.amortizacion).toHaveLength(6);
  });

  it("el avance del plazo sale de los pagos hechos", async () => {
    const salida = await creditos("usr_beto");
    const credito = salida.creditos[0]!;
    expect(credito.pagosRealizados).toBe(22);
    expect(credito.plazoMeses).toBe(36);
    expect(credito.pagosRestantes).toBe(14);
    expect(credito.avancePct).toBeCloseTo(0.6111, 4);
  });
});

describe("filtros y errores", () => {
  it("un credito concreto acota `creditos`, pero los totales siguen siendo de toda la deuda", async () => {
    const salida = await creditos("usr_carmen", { creditoId: "cred_carmen_auto" });
    expect(salida.creditos).toHaveLength(1);
    expect(salida.creditos[0]!.id).toBe("cred_carmen_auto");
    // "¿Cuanto debo?" no cambia de respuesta porque se pida el detalle de uno.
    expect(salida.deudaCreditosCentavos).toBe(deBuro("usr_carmen", "deuda_total_centavos"));
  });

  it("un credito de otra persona no se devuelve", async () => {
    await expect(creditos("usr_ana", { creditoId: "cred_carmen_auto" })).rejects.toThrow(/no es de usr_ana/);
  });

  it("pedir la tarjeta por `creditoId` no la saca de la nada", async () => {
    await expect(creditos("usr_beto", { creditoId: "cred_beto_tdc" })).rejects.toThrow(/no es de usr_beto/);
  });
});

describe("despues de aplicar un plan de pago", () => {
  it("reestructurar no borra la deuda: la vuelve mensualidad fija", async () => {
    const antes = await creditos("usr_beto");
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "test-creditos-plan-1",
    });
    const despues = await creditos("usr_beto");

    expect(despues.tarjeta!.tienePlanActivo).toBe(true);
    // Lo que se debe sigue ahi: cambio de revolvente a diferido.
    expect(despues.deudaTarjetaCentavos).toBe(antes.deudaTarjetaCentavos);
    expect(despues.deudaTotalCentavos).toBe(antes.deudaTotalCentavos);
    // Lo que SI cambia: lo que paga al mes, y que ya no hay mora.
    expect(despues.tarjeta!.mensualidadCentavos).not.toBe(antes.tarjeta!.mensualidadCentavos);
    expect(despues.tarjeta!.diasMora).toBe(0);
  });

  it("con el plan, la tarjeta deja de ser la deuda mas cara", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "test-creditos-plan-2",
    });
    const salida = await creditos("usr_beto");
    // El CAT del plan (25 %) queda por debajo del credito de nomina (33 %).
    expect(salida.creditoMasCaroId).toBe("cred_beto_nomina");
  });
});
