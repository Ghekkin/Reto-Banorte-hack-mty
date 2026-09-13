import { beforeEach, describe, expect, it } from "vitest";
import { SalidaAplicarPlanPago, SalidaProgramarAbonoCapital, SalidaSimularReestructura, type GastoExterno } from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { capacidadPagoMensual } from "../dominio/consultas.js";
import { capacidadParaLaTarjeta } from "../dominio/creditos.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { programarAbonoCapital } from "../tools/programar-abono-capital.js";
import { registrarGastoExterno } from "../tools/registrar-gasto-externo.js";
import { simularReestructura } from "../tools/simular-reestructura.js";

/**
 * Issue #25: la mensualidad de un plan de reestructura se compara contra lo que la persona
 * puede pagar POR LA TARJETA, no contra lo libre de buro. El plan reemplaza el minimo, y buro
 * ya lo tiene restado de lo libre (`docs/algoritmos/oferta-de-reestructura.md`).
 *
 * Cifras del volcado:
 * - Beto: techo $12,075.00 (comprometido $5,461.29 + libre $6,613.71); nomina $2,510.56; minimo
 *   de la tarjeta $2,950.73, que buro SI cuenta en lo comprometido. Por la tarjeta: $9,564.44.
 * - Carmen: techo $40,250.00; hipoteca $18,914.08 + auto $12,515.63. Buro NO cuenta su tarjeta
 *   (el comprometido es exactamente los dos creditos), asi que por la tarjeta: $8,820.29.
 */
beforeEach(() => reiniciarEstado());

const RENTA: GastoExterno = { nombre: "Renta", montoCentavos: 400000, frecuencia: "mensual" };

const simular = async (usuarioId: string, plazosMeses?: number[]) =>
  SalidaSimularReestructura.parse(await simularReestructura.manejar({ usuarioId, ...(plazosMeses ? { plazosMeses } : {}) }));

describe("capacidadParaLaTarjeta", () => {
  it("Beto: lo libre de buro mas el minimo que el plan reemplaza", () => {
    expect(capacidadPagoMensual("usr_beto")).toBe(661371);
    expect(capacidadParaLaTarjeta("usr_beto")).toBe(661371 + 295073);
  });

  it("Carmen: buro no cuenta su tarjeta, asi que no se le suma el minimo", () => {
    expect(capacidadParaLaTarjeta("usr_carmen")).toBe(4025000 - 1891408 - 1251563);
    expect(capacidadParaLaTarjeta("usr_carmen")).toBe(882029);
  });

  it("un abono a capital programado es dinero comprometido: baja lo que queda para la tarjeta", async () => {
    const { abono } = SalidaProgramarAbonoCapital.parse(
      await programarAbonoCapital.manejar({
        usuarioId: "usr_beto",
        creditoId: "cred_beto_nomina",
        mensualidadCentavos: 251056 + 100000,
        idempotencyKey: "capacidad-tarjeta:abono",
      }),
    );
    expect(abono.abonoMensualCentavos).toBe(100000);
    expect(capacidadParaLaTarjeta("usr_beto")).toBe(956444 - 100000);
  });
});

describe("simular_reestructura contra la capacidad para la tarjeta", () => {
  it("Beto sin cambios: reporta la capacidad para la tarjeta y el guion no se mueve (18 meses)", async () => {
    const salida = await simular("usr_beto");
    expect(salida.capacidadPagoMensualCentavos).toBe(956444);
    expect(salida.plazoRecomendado).toBe(18);
    expect(salida.opciones.map((o) => [o.plazoMeses, o.mensualidadCentavos, o.cabeEnCapacidad])).toEqual([
      [12, 443333, true],
      [18, 319335, true],
      [24, 262234, true],
      [36, 207345, true],
    ]);
  });

  it("Beto con $4,000 de renta: el plan de 12 meses sigue cabiendo, porque el minimo deja de pagarse", async () => {
    await registrarGastoExterno.manejar({ usuarioId: "usr_beto", gastos: [RENTA], idempotencyKey: "capacidad-tarjeta:renta-1" });
    // Lo libre de buro baja a $2,613.71: contra eso, 12, 18 y 24 meses "no cabian".
    expect(capacidadPagoMensual("usr_beto")).toBe(261371);
    const salida = await simular("usr_beto");
    expect(salida.capacidadPagoMensualCentavos).toBe(556444);
    expect(salida.opciones.every((o) => o.cabeEnCapacidad)).toBe(true);
    expect(salida.plazoRecomendado).toBe(18);
  });

  it("sin plazo marcado por el banco, recomienda el mas corto que cabe con el minimo sumado", async () => {
    await registrarGastoExterno.manejar({ usuarioId: "usr_beto", gastos: [RENTA], idempotencyKey: "capacidad-tarjeta:renta-2" });
    const salida = await simular("usr_beto", [9, 12, 24]);
    const nueve = salida.opciones.find((o) => o.plazoMeses === 9)!;
    // La de 9 meses no cabe ni con el minimo sumado; la de 12 si. Contra lo libre de buro ($2,613.71)
    // no cabia ninguna y se recomendaba la de 24 (la mas larga).
    expect(nueve.mensualidadCentavos).toBeGreaterThan(556444);
    expect(salida.plazoRecomendado).toBe(12);
    expect(salida.opciones.find((o) => o.plazoMeses === 12)!.cabeEnCapacidad).toBe(true);
  });
});

describe("aplicar_plan_pago avisa con la misma capacidad", () => {
  it("Beto con $4,000 de renta aplica 12 meses sin el aviso de 'arriba de tu capacidad'", async () => {
    await registrarGastoExterno.manejar({ usuarioId: "usr_beto", gastos: [RENTA], idempotencyKey: "capacidad-tarjeta:renta-3" });
    const salida = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({ usuarioId: "usr_beto", tarjetaId: "tar_beto_clasica", plazoMeses: 12, idempotencyKey: "capacidad-tarjeta:plan-12" }),
    );
    expect(salida.aplicado).toBe(true);
    expect(salida.mensaje).not.toMatch(/arriba de tu capacidad/);
  });

  it("y si de verdad no cabe, avisa con la capacidad para la tarjeta", async () => {
    await registrarGastoExterno.manejar({
      usuarioId: "usr_beto",
      gastos: [{ nombre: "Renta", montoCentavos: 900000, frecuencia: "mensual" }],
      idempotencyKey: "capacidad-tarjeta:renta-4",
    });
    const salida = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({ usuarioId: "usr_beto", tarjetaId: "tar_beto_clasica", plazoMeses: 12, idempotencyKey: "capacidad-tarjeta:plan-12b" }),
    );
    // 956,444 - 900,000 = 56,444 por la tarjeta: $564.44.
    expect(salida.mensaje).toMatch(/arriba de tu capacidad estimada \(\$564\.44\)/);
  });
});
