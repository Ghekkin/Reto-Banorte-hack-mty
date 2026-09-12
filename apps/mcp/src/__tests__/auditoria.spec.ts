import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaAplicarPlanPago,
  SalidaCompararPeriodos,
  SalidaConsultarPlan,
  SalidaConsultarTarjeta,
} from "@maya/schemas";
import { accionesDe, reiniciarEstado } from "../datos/index.js";
import { planAplicado, tarjetaDeCredito } from "../dominio/consultas.js";
import { sumarMeses, ultimoMesCerrado } from "../dominio/tiempo.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { compararPeriodos } from "../tools/comparar-periodos.js";
import { consultarMovimientos } from "../tools/consultar-movimientos.js";
import { consultarPlan } from "../tools/consultar-plan.js";
import { consultarTarjeta } from "../tools/consultar-tarjeta.js";
import { crearApartado } from "../tools/crear-apartado.js";

/**
 * Lo que salio de la auditoria del backend (2026-09-12): cada `it` es un hueco que
 * existia y ya no. Si alguno vuelve a fallar, volvio el hueco.
 */
beforeEach(() => reiniciarEstado());

describe("una tarjeta de debito no es una tarjeta de credito", () => {
  it("consultar_tarjeta con el id de la debito de Ana no la disfraza de credito", async () => {
    await expect(async () =>
      consultarTarjeta.manejar({ usuarioId: "usr_ana", tarjetaId: "tar_ana_debito" }),
    ).rejects.toThrow(/debito/);
  });

  it("y una tarjeta ajena tampoco pasa", () => {
    expect(() => tarjetaDeCredito("usr_ana", "tar_beto_clasica")).toThrow(/no es de usr_ana/);
  });
});

describe("el plan es por tarjeta", () => {
  it("planAplicado filtra por tarjeta y no confunde una con otra", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "auditoria:0001",
    });
    expect(planAplicado("usr_beto", "tar_beto_clasica")?.plazoMeses).toBe(18);
    expect(planAplicado("usr_beto", "tar_otra")).toBeNull();
    expect(planAplicado("usr_beto")?.plazoMeses).toBe(18);
  });
});

describe("una accion se aplica una vez o ninguna", () => {
  it("la misma llave de idempotencia no aplica dos veces, aunque la tool se llame dos veces", async () => {
    const llamada = {
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "auditoria:0002",
    };
    await aplicarPlanPago.manejar(llamada);
    await aplicarPlanPago.manejar(llamada);

    // En produccion esto lo garantiza el indice UNICO de `idempotency_key`, no el
    // codigo: dos inserts con la misma llave dejan una sola fila.
    expect(accionesDe("usr_beto", "aplicar_plan_pago")).toHaveLength(1);
    expect(SalidaConsultarPlan.parse(await consultarPlan.manejar({ usuarioId: "usr_beto" })).hayPlan).toBe(true);
  });
});

describe("el tiempo del dominio", () => {
  it("sumarMeses aguanta meses negativos y fin de mes", () => {
    expect(sumarMeses("2026-03-31", -1)).toBe("2026-02-28");
    expect(sumarMeses("2026-01-15", -1)).toBe("2025-12-15");
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2024-01-31", 1)).toBe("2024-02-29");
    expect(sumarMeses("2026-12-05", 1)).toBe("2027-01-05");
  });

  it("ultimoMesCerrado: un mes a medias no cuenta, el ultimo dia si", () => {
    expect(ultimoMesCerrado("2026-09-12")).toBe("2026-08");
    expect(ultimoMesCerrado("2026-09-30")).toBe("2026-09");
    expect(ultimoMesCerrado("2026-01-01")).toBe("2025-12");
  });

  it("comparar_periodos sin periodo usa el ultimo mes cerrado, no el mes a medias", async () => {
    const salida = SalidaCompararPeriodos.parse(await compararPeriodos.manejar({ usuarioId: "usr_beto" }));
    expect(salida.periodo).toBe("2026-08");
    expect(salida.periodoAnterior).toBe("2026-07");
  });
});

describe("entradas que no tienen sentido se rechazan con un motivo", () => {
  it("un rango de fechas al reves", async () => {
    await expect(async () =>
      consultarMovimientos.manejar({ usuarioId: "usr_beto", desde: "2026-08-31", hasta: "2026-08-01" }),
    ).rejects.toThrow(/al reves/);
  });

  it("apartar de la cuenta de otra persona", async () => {
    await expect(async () =>
      crearApartado.manejar({
        usuarioId: "usr_beto",
        nombre: "Con dinero ajeno",
        montoObjetivoCentavos: 1000000,
        aportacionCentavos: 100000,
        cuentaOrigenId: "cta_ana_ahorro",
        idempotencyKey: "auditoria:0003",
      }),
    ).rejects.toThrow(/no es de usr_beto/);
  });

  it("un segundo plan sobre la misma tarjeta no se aplica", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "auditoria:0004",
    });
    const otra = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({
        usuarioId: "usr_beto",
        tarjetaId: "tar_beto_clasica",
        plazoMeses: 12,
        idempotencyKey: "auditoria:0005",
      }),
    );
    expect(otra.aplicado).toBe(false);
    expect(otra.plan.plazoMeses).toBe(18);
    const tarjeta = SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_beto" }));
    expect(tarjeta.planActivo?.plazoMeses).toBe(18);
  });
});
