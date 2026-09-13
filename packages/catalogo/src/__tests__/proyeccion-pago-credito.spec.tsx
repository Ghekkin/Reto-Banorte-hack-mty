import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compararEscenarios } from "../proyeccion-pago-credito/comparacion";
import { ProyeccionPagoCredito } from "../proyeccion-pago-credito/componente";
import { entradaProyeccionPagoCredito, schemaProyeccionPagoCredito } from "../proyeccion-pago-credito/schema";

/**
 * `ProyeccionPagoCredito` se ajusta en su lugar desde el chat: «¿y si pago $4,500 al mes?»
 * parchea la MISMA tarjeta con el escenario de `simular_pago_credito`, y «Programar este pago»
 * la deja en estado programado. Lo que se cuida:
 *
 *  - lo que ya estaba pintado (sin `antes`, dos o más hitos con etiqueta) sigue validando;
 *  - la línea «antes → después» dice la dirección correcta, también cuando empeora;
 *  - el botón existe SOLO con una simulación sin programar;
 *  - el badge de programado reemplaza al botón.
 *
 * El clic con su `context` se prueba con DOM en `resaltado.spec.tsx`.
 */
const HITOS = [
  { numeroPago: 17, periodo: "2026-10-05", capitalCentavos: 317888, interesCentavos: 132112, saldoFinalCentavos: 5260412 },
  { numeroPago: 31, periodo: "2027-12-05", capitalCentavos: 373436, interesCentavos: 8844, saldoFinalCentavos: 0 },
];

/** Como va hoy: la mensualidad del contrato, 20 meses. */
const ACTUAL = { mensualidadCentavos: 353397, plazoRestanteMeses: 20, totalInteresesEstimadosCentavos: 1489628 };
/** Pagando $4,500 al mes: 15 meses y $3,856.48 menos de intereses. */
const SIMULADO = { mensualidadCentavos: 450000, plazoRestanteMeses: 15, totalInteresesEstimadosCentavos: 1103980 };

const BASE = {
  creditoId: "cred_nomina_01",
  alias: "Crédito de Nómina Banorte",
  saldoInsolutoCentavos: 5578300,
  tasaAnualPct: 0.245,
  amortizacionResumen: HITOS,
  razon: "Te faltan 20 mensualidades de tu crédito de nómina.",
};

function pintar(props: Record<string, unknown>): string {
  return renderToStaticMarkup(createElement(ProyeccionPagoCredito, { ...BASE, ...props, alAccionar: () => {} } as never));
}

describe("ProyeccionPagoCredito: schema", () => {
  it("lo que ya estaba pintado sigue validando (sin antes, hitos con etiqueta, ahorro viejo)", () => {
    const r = schemaProyeccionPagoCredito.safeParse({
      ...BASE,
      ...ACTUAL,
      ahorroConAbonoCapitalCentavos: 485000,
      amortizacionResumen: [
        { numeroPago: 1, periodo: "Próximo pago", capitalCentavos: 211000, interesCentavos: 114000, saldoFinalCentavos: 5367300 },
        { numeroPago: 20, periodo: "Liquidación final", capitalCentavos: 318000, interesCentavos: 7000, saldoFinalCentavos: 0 },
      ],
    });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    expect(r.data?.programado).toBeUndefined();
    expect(r.data?.etiquetaBoton).toBe("Programar este pago");
  });

  it("acepta el estado simulado: el escenario tal cual, antes, contrato y aviso", () => {
    const r = schemaProyeccionPagoCredito.safeParse({
      ...BASE,
      ...SIMULADO,
      fechaLiquidacion: "2027-12-05",
      antes: { ...ACTUAL, fechaLiquidacion: "2028-05-05", amortizacionResumen: HITOS },
      mensualidadContratoCentavos: 353397,
      programado: false,
      aviso: "Rebasa lo que buró estima que puedes pagar.",
    });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
  });

  it("un solo hito basta: con pocos pagos la tool manda uno", () => {
    const r = schemaProyeccionPagoCredito.safeParse({ ...BASE, ...SIMULADO, amortizacionResumen: [HITOS[1]] });
    expect(r.success).toBe(true);
    expect(schemaProyeccionPagoCredito.safeParse({ ...BASE, ...SIMULADO, amortizacionResumen: [] }).success).toBe(false);
  });

  it("declara la accion que dispara el boton", () => {
    expect(entradaProyeccionPagoCredito.acciones).toEqual(["programar_abono_capital"]);
  });
});

describe("ProyeccionPagoCredito: antes → después", () => {
  it("sin antes no hay comparacion ni boton", () => {
    const html = pintar(ACTUAL);
    expect(html).not.toContain("Terminas en");
    expect(html).not.toContain("Programar este pago");
  });

  it("cuando mejora: menos meses y menos intereses, en verde", () => {
    const html = pintar({ ...SIMULADO, antes: ACTUAL, fechaLiquidacion: "2027-12-05" });
    expect(html).toMatch(/Terminas en <span[^>]*text-exito[^>]*>15 meses<\/span> <span[^>]*>\(antes 20\)<\/span>, en diciembre de 2027/);
    expect(html).toMatch(/Pagas <span[^>]*text-exito[^>]*>\$3,856\.48 menos<\/span> de intereses/);
  });

  it("cuando empeora (pagar menos que un abono ya programado): dice más, y no en verde", () => {
    const html = pintar({ ...ACTUAL, antes: SIMULADO });
    expect(html).toMatch(/Terminas en <span[^>]*>20 meses<\/span> <span[^>]*>\(antes 15\)<\/span>/);
    expect(html).toMatch(/Pagas <span[^>]*>\$3,856\.48 más<\/span> de intereses/);
    expect(html).not.toContain("text-exito");
  });

  it("si antes es igual a lo de ahora, no hay nada que comparar", () => {
    const html = pintar({ ...ACTUAL, antes: ACTUAL });
    expect(html).not.toContain("Terminas en");
    expect(html).not.toContain("Programar este pago");
  });

  it("dice cuanto de la mensualidad va a capital cuando pasa la del contrato", () => {
    expect(pintar({ ...SIMULADO, antes: ACTUAL, mensualidadContratoCentavos: 353397 })).toContain(
      "$3,533.97 del contrato + $966.03 a capital",
    );
    expect(pintar({ ...ACTUAL, mensualidadContratoCentavos: 353397 })).not.toContain("a capital");
  });

  it("el aviso de la tool sale en ambar, tal cual", () => {
    const html = pintar({ ...SIMULADO, antes: ACTUAL, aviso: "Rebasa lo que buró estima que puedes pagar." });
    expect(html).toMatch(/data-slot="alert"[^>]*text-advertencia/);
    expect(html).toContain("Rebasa lo que buró estima que puedes pagar.");
  });

  it("funciona en heroe: sin verde ni ambar sobre el degradado", () => {
    const html = pintar({ ...SIMULADO, antes: ACTUAL, heroe: true, aviso: "Rebasa tu capacidad de pago." });
    expect(html).toContain("Terminas en");
    expect(html).toContain("Programar este pago");
    expect(html).not.toContain("text-exito");
    expect(html).not.toContain("text-advertencia");
  });

  it("compararEscenarios no produce lineas de diferencia cero", () => {
    expect(compararEscenarios(ACTUAL, { ...ACTUAL, mensualidadCentavos: 360000 })).toBeUndefined();
    expect(compararEscenarios(ACTUAL, { ...ACTUAL, plazoRestanteMeses: 19 })).toEqual({
      plazo: { ahora: 19, antes: 20, direccion: "mejor" },
    });
  });
});

describe("ProyeccionPagoCredito: boton y estado programado", () => {
  it("con una simulacion sin programar, el boton aparece con su etiqueta", () => {
    expect(pintar({ ...SIMULADO, antes: ACTUAL })).toMatch(/<button[^>]*min-h-12[^>]*>Programar este pago/);
    expect(pintar({ ...SIMULADO, antes: ACTUAL, etiquetaBoton: "Pagar $4,500 al mes" })).toContain("Pagar $4,500 al mes");
  });

  it("si la mensualidad no cambio contra antes, no hay nada que programar", () => {
    expect(pintar({ ...SIMULADO, antes: { ...ACTUAL, mensualidadCentavos: SIMULADO.mensualidadCentavos } })).not.toContain(
      "Programar este pago",
    );
  });

  it("programado: badge, sin boton, con los numeros ya aplicados y la diferencia", () => {
    const html = pintar({ ...SIMULADO, antes: ACTUAL, programado: true });
    expect(html).toContain("Abono programado");
    expect(html).not.toContain("Programar este pago");
    expect(html).toContain("$4,500.00");
    expect(html).toContain("15 meses restantes");
    expect(html).toContain("(antes 20)");
  });

  it("sin programado no hay badge", () => {
    expect(pintar({ ...SIMULADO, antes: ACTUAL, programado: false })).not.toContain("Abono programado");
  });
});
