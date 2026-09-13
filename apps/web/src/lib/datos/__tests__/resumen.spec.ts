import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Fila } from "../tablas";

/**
 * `resumenDe` es el numero del heroe de Inicio, de Mas y de `GET /api/perfil|panorama`.
 * "Disponible" es lo que la persona puede usar HOY: nomina y ahorro. Ni el credito (resta) ni
 * la inversion (es patrimonio, no liquidez, y ya se reporta como portafolio). Issue #32.
 */

const filas: Record<string, Fila[]> = {};

vi.mock("../tablas", async (original) => ({
  ...(await original<typeof import("../tablas")>()),
  leerTabla: async (tabla: string) => filas[tabla] ?? [],
}));

const { resumenDe } = await import("../consultas");

function cuenta(id: string, tipo: string, saldoCentavos: number, principal = false): Fila {
  return {
    id,
    usuario_id: "usr_carmen",
    tipo,
    alias: id,
    numero_mascara: "•••• 0001",
    saldo_centavos: String(saldoCentavos),
    es_principal: principal ? "true" : "false",
    estatus: "activa",
  };
}

describe("resumenDe", () => {
  beforeEach(() => {
    // Las cuentas de Carmen en la base del 2026-09-13.
    filas.cuentas = [
      cuenta("reserva", "ahorro", 48_200_000),
      cuenta("tarjeta_oro", "credito", -2_841_500),
      cuenta("portafolio", "inversion", 287_450_000),
      cuenta("corriente", "nomina", 18_734_200, true),
    ];
    filas.creditos = [];
  });

  it("el disponible es solo lo liquido: sin la cuenta de inversion ni la de credito", async () => {
    const resumen = await resumenDe("usr_carmen");
    expect(resumen.disponibleCentavos).toBe(66_934_200); // $669,342.00, no $3,543,842.00
  });

  it("una persona sin cuenta de inversion no cambia", async () => {
    filas.cuentas = [cuenta("ahorro", "ahorro", 63_200), cuenta("tdc", "credito", -4_738_600), cuenta("nomina", "nomina", 218_740, true)];
    expect((await resumenDe("usr_carmen")).disponibleCentavos).toBe(281_940);
  });

  it("la cuenta principal sigue siendo la marcada", async () => {
    expect((await resumenDe("usr_carmen")).cuentaPrincipal?.id).toBe("corriente");
  });
});
