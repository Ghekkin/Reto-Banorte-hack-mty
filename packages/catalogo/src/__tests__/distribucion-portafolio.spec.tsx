import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DistribucionPortafolio } from "../distribucion-portafolio/componente";

/**
 * Issue #26: la dona de `DistribucionPortafolio` como héroe restaba 0.2 de opacidad por clase,
 * así que desde la sexta el blanco quedaba en 0 o en alfa negativo y la clase desaparecía de la
 * dona y de la lista (el portafolio de Carmen trae 8). En la tarjeta blanca el quinto color era
 * el tinte (invisible sobre blanco) y desde el sexto se repetían.
 *
 * Lo que se cuida: toda clase tiene un cuadrito visible en la lista, con cuantas clases lleguen,
 * y nunca hay más colores que los que se distinguen (4): de la cuarta en adelante van juntas en
 * «Otras», con el mismo color en la dona y en la lista.
 */
const CARMEN = [
  { claseId: "renta_var_mx", nombre: "Renta variable México", tipo: "Renta variable", montoCentavos: 90000000, pesoPct: 0.25 },
  { claseId: "renta_var_global", nombre: "Renta variable global", tipo: "Renta variable", montoCentavos: 72000000, pesoPct: 0.2 },
  { claseId: "cetes", nombre: "CETES 28", tipo: "Renta fija", montoCentavos: 54000000, pesoPct: 0.15 },
  { claseId: "fibras", nombre: "FIBRAs", tipo: "Inmobiliario", montoCentavos: 43200000, pesoPct: 0.12 },
  { claseId: "pagare", nombre: "Pagaré Banorte", tipo: "Renta fija", montoCentavos: 39600000, pesoPct: 0.11 },
  { claseId: "bonddia", nombre: "BONDDIA", tipo: "Liquidez", montoCentavos: 25200000, pesoPct: 0.07 },
  { claseId: "deuda_mediano", nombre: "Fondo de Deuda Mediano Plazo", tipo: "Renta fija", montoCentavos: 21600000, pesoPct: 0.06 },
  { claseId: "corporativa", nombre: "Deuda Corporativa AAA", tipo: "Renta fija", montoCentavos: 14400000, pesoPct: 0.04 },
];

function pintar(clases: typeof CARMEN, heroe: boolean): string {
  return renderToStaticMarkup(
    createElement(DistribucionPortafolio, {
      valorTotalCentavos: clases.reduce((s, c) => s + c.montoCentavos, 0),
      rendimientoTotalPct: 0.08,
      clases,
      heroe,
      razon: "Tu portafolio se desvió de su modelo.",
      alAccionar: () => {},
    } as never),
  );
}

/** El `background` del cuadrito de cada fila de la lista, en orden. */
function cuadritos(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>\s*<span class="size-2\.5[^"]*" style="background:([^"]*)"/g)].map((m) => m[1]!.replaceAll("&quot;", '"'));
}

/** El alfa de un color `rgb(r g b / a)` o `color-mix(... N%, transparent)`; 1 si es opaco. */
function alfa(color: string): number {
  const rgb = color.match(/\/\s*(-?[\d.]+)\s*\)/);
  if (rgb) return Number(rgb[1]);
  const mezcla = color.match(/(-?[\d.]+)%\s*,\s*transparent\)/);
  if (mezcla) return Number(mezcla[1]) / 100;
  return 1;
}

describe("DistribucionPortafolio con muchas clases (#26)", () => {
  for (const heroe of [true, false]) {
    const cual = heroe ? "héroe" : "blanca";

    it(`${cual}: las 8 clases de Carmen tienen cuadrito visible en la lista`, () => {
      const colores = cuadritos(pintar(CARMEN, heroe));
      expect(colores).toHaveLength(8);
      for (const color of colores) {
        expect(color).not.toBe("");
        expect(alfa(color)).toBeGreaterThanOrEqual(0.25);
        // El tinte es casi blanco: sobre la tarjeta blanca no se ve.
        expect(color).not.toContain("--chart-5");
      }
    });

    it(`${cual}: nunca más de 4 colores; de la cuarta clase en adelante comparten el de «Otras»`, () => {
      const colores = cuadritos(pintar(CARMEN, heroe));
      expect(new Set(colores).size).toBe(4);
      expect(new Set(colores.slice(0, 3)).size).toBe(3);
      expect(new Set(colores.slice(3)).size).toBe(1);
      expect(colores.slice(0, 3)).not.toContain(colores[3]);
    });

    it(`${cual}: con 4 clases o menos, cada una con su propio color`, () => {
      const colores = cuadritos(pintar(CARMEN.slice(0, 4), heroe));
      expect(new Set(colores).size).toBe(4);
    });
  }

  it("agrupa por monto, no por el orden en que llegan: la más chica nunca queda sola", () => {
    const desordenadas = [CARMEN[7]!, CARMEN[0]!, CARMEN[6]!, CARMEN[1]!, CARMEN[2]!];
    const colores = cuadritos(pintar(desordenadas, false));
    // La lista respeta el orden recibido; Deuda Corporativa (la más chica) y Deuda Mediano van en «Otras».
    expect(colores[0]).toBe(colores[2]);
    expect(new Set([colores[1], colores[3], colores[4]]).size).toBe(3);
    expect([colores[1], colores[3], colores[4]]).not.toContain(colores[0]);
  });
});
