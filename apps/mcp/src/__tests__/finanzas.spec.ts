import { describe, expect, it } from "vitest";
import { aDecimal, aEntero, buscar, filtrar } from "../datos/index.js";
import {
  calcularCAT,
  escenarioPagoMinimo,
  mensualidad,
  ofertaReestructura,
  pagoMinimoTarjeta,
  tablaAmortizacion,
} from "../dominio/finanzas.js";

/**
 * El puerto a TypeScript de `scripts/lib/finanzas.mjs` tiene que dar EXACTAMENTE los
 * mismos numeros que el generador de datos. Si no, la pantalla diria una cosa y la base
 * otra, y el primero en notarlo seria un juez.
 */
describe("finanzas contra los datos generados", () => {
  const tarjeta = buscar("tarjetas", "id", "tar_beto_clasica")!;
  const saldo = aEntero(tarjeta.saldo_centavos);
  const tasaTarjeta = aDecimal(tarjeta.tasa_anual);

  it("el pago minimo de la tarjeta reproduce el de la base (tolerancia: un peso)", () => {
    const calculado = pagoMinimoTarjeta(saldo, tasaTarjeta);
    expect(Math.abs(calculado - aEntero(tarjeta.pago_minimo_centavos))).toBeLessThanOrEqual(100);
  });

  it("reproduce las cuatro ofertas de banorte.planes_reestructura", () => {
    const minimo = escenarioPagoMinimo(saldo, tasaTarjeta);
    for (const fila of filtrar("planes_reestructura", "tarjeta_id", "tar_beto_clasica")) {
      const oferta = ofertaReestructura({
        saldoCentavos: saldo,
        tasaPlan: aDecimal(fila.tasa_anual),
        plazoMeses: aEntero(fila.plazo_meses),
        tasaTarjeta,
        minimo,
      });
      expect(oferta.mensualidadCentavos, `mensualidad ${fila.id}`).toBe(aEntero(fila.mensualidad_centavos));
      expect(oferta.cat, `cat ${fila.id}`).toBe(aDecimal(fila.cat));
      expect(oferta.totalAPagarCentavos, `total ${fila.id}`).toBe(aEntero(fila.total_a_pagar_centavos));
      expect(oferta.interesesTotalesCentavos, `intereses ${fila.id}`).toBe(aEntero(fila.intereses_totales_centavos));
      expect(oferta.ahorroVsMinimoCentavos, `ahorro ${fila.id}`).toBe(aEntero(fila.ahorro_vs_minimo_centavos));
      expect(oferta.mesesVsMinimo, `meses ${fila.id}`).toBe(aEntero(fila.meses_vs_minimo));
    }
  });

  it("el caso de referencia del doc: $47,386 al 21.9 % a 18 meses", () => {
    expect(mensualidad(4738600, 0.219, 18)).toBe(319335);
    expect(calcularCAT(4738600, 319335, 18, 0)).toBe(0.2858);
  });

  it("la tabla de amortizacion cierra en cero y cada fila cuadra", () => {
    const filas = tablaAmortizacion(4738600, 0.219, 18);
    expect(filas).toHaveLength(18);
    expect(filas.at(-1)!.saldoFinalCentavos).toBe(0);
    for (const f of filas) {
      expect(f.saldoFinalCentavos).toBe(f.saldoInicialCentavos - f.capitalCentavos);
      expect(f.mensualidadCentavos).toBe(f.capitalCentavos + f.interesCentavos + f.ivaInteresCentavos);
    }
  });

  it("pagando el minimo, Beto tarda 209 meses", () => {
    expect(escenarioPagoMinimo(saldo, tasaTarjeta).meses).toBe(209);
  });
});
