import { beforeEach, describe, expect, it } from "vitest";
import { SalidaConsultarCreditos } from "@maya/schemas";
import { aEntero, buscar, filtrar, reiniciarEstado, tabla } from "../datos/index.js";
import { consultarCreditos } from "../tools/consultar-creditos.js";

/**
 * Que la fila de `creditos` y su tabla de `amortizaciones` cuenten la misma historia. Issue #24:
 * la hipoteca de Carmen decia "vigente, 0 dias de mora, proximo pago el 10 de julio" con los pagos
 * 99, 100 y 101 en `vencido`, mientras buro la reporta 100 % puntual. Ninguna tool lo notaba:
 * cada una leia una mitad.
 *
 * Invariantes, para cada credito a plazo (las filas con `tarjeta_id` son la tarjeta y no tienen tabla):
 * - `pagos_realizados` es el numero de filas `pagado`;
 * - el proximo pago es la primera fila sin pagar: su `fecha` es `fecha_proximo_pago` y su saldo
 *   inicial es `saldo_insoluto_centavos`;
 * - un credito sin dias de mora no tiene filas `vencido`;
 * - y la deuda que reporta buro es la suma de los saldos insolutos de TODAS sus filas de `creditos`.
 */
beforeEach(() => reiniciarEstado());

const aPlazo = () => tabla("creditos").filter((c) => !c.tarjeta_id);

const filasDe = (creditoId: string) =>
  filtrar("amortizaciones", "credito_id", creditoId).sort((a, b) => aEntero(a.numero_pago) - aEntero(b.numero_pago));

describe("cada credito a plazo cuadra con su tabla de amortizacion", () => {
  it.each(aPlazo().map((c) => [c.id!]))("%s", (creditoId) => {
    const credito = buscar("creditos", "id", creditoId)!;
    const filas = filasDe(creditoId);
    const pagadas = filas.filter((f) => f.estatus === "pagado");
    const siguiente = filas.find((f) => f.estatus !== "pagado")!;

    expect(pagadas).toHaveLength(aEntero(credito.pagos_realizados));
    expect(siguiente.fecha).toBe(credito.fecha_proximo_pago);
    expect(aEntero(siguiente.saldo_inicial_centavos)).toBe(aEntero(credito.saldo_insoluto_centavos));
    if (aEntero(credito.dias_mora) === 0) {
      expect(filas.filter((f) => f.estatus === "vencido").map((f) => f.numero_pago)).toEqual([]);
    }
  });

  it("buro reporta como deuda la suma de los saldos insolutos de cada persona", () => {
    for (const fila of tabla("buro")) {
      const suma = filtrar("creditos", "usuario_id", fila.usuario_id!).reduce((s, c) => s + aEntero(c.saldo_insoluto_centavos), 0);
      expect([fila.usuario_id, suma]).toEqual([fila.usuario_id, aEntero(fila.deuda_total_centavos)]);
    }
  });
});

describe("la hipoteca de Carmen, al corriente como dice buro", () => {
  it("consultar_creditos: proximo pago en octubre, 101 pagos hechos y sin mora", async () => {
    const salida = SalidaConsultarCreditos.parse(
      await consultarCreditos.manejar({ usuarioId: "usr_carmen", creditoId: "cred_carmen_hipotecario", incluirAmortizacion: true }),
    );
    const hipoteca = salida.creditos[0]!;
    expect(hipoteca.fechaProximoPago).toBe("2026-10-10");
    expect(hipoteca.pagosRealizados).toBe(101);
    expect(hipoteca.pagosRestantes).toBe(139);
    expect(hipoteca.saldoInsolutoCentavos).toBe(137691032);
    expect(hipoteca.diasMora).toBe(0);
    expect(hipoteca.amortizacion[0]).toMatchObject({ numeroPago: 102, fecha: "2026-10-10", estatus: "pendiente" });
    expect(salida.deudaCreditosCentavos).toBe(137691032 + 19066096);
  });
});
