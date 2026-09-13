import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GastoPorCategoria } from "../gasto-por-categoria/componente";
import { schemaGastoPorCategoria } from "../gasto-por-categoria/schema";

/**
 * Las props de VARIANTE de `GastoPorCategoria`: `orden` y `limite`.
 *
 * Existen para el ciclo live. "Ordenalo por variacion" y "solo las 3 mas grandes" no son
 * otra pantalla ni otros datos: son la MISMA tarjeta vista de otra forma, asi que el agente
 * las cambia con `ajustar_pantalla` y la tarjeta se reordena sin volver a pedir nada al MCP.
 *
 * Lo que se cuida aqui es la invariante que este componente ya tenia y que un `limite` mal
 * hecho romperia: **el total del encabezado tiene que cuadrar con lo que la tarjeta lista**.
 * Por eso `limite` no desaparece categorias, las agrupa en un renglon neutro; el aviso ambar
 * "Faltan X sin desglosar" sigue reservado para cuando el modelo recorto `categorias` de
 * verdad, que es el bug que ese aviso existe para delatar.
 */
const CATEGORIAS = [
  { categoriaId: "cat_vivienda", nombre: "Vivienda", montoCentavos: 720000, variacionPct: 0 },
  { categoriaId: "cat_retiros", nombre: "Retiros de efectivo", montoCentavos: 460150, variacionPct: 0.747 },
  { categoriaId: "cat_super", nombre: "Supermercado", montoCentavos: 370200, variacionPct: -0.0902 },
  { categoriaId: "cat_ahorro", nombre: "Ahorro", montoCentavos: 100000 },
];
const TOTAL = CATEGORIAS.reduce((s, c) => s + c.montoCentavos, 0);

function pintar(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(GastoPorCategoria, {
      periodo: "2026-08",
      totalCentavos: TOTAL,
      categorias: CATEGORIAS,
      razon: "Tus retiros de efectivo subieron 75 % contra julio",
      ...extra,
    }),
  );
}

/** El orden en que salen los nombres en el HTML. */
function ordenPintado(html: string): string[] {
  return CATEGORIAS.map((c) => ({ nombre: c.nombre, donde: html.indexOf(c.nombre) }))
    .filter((c) => c.donde !== -1)
    .sort((a, b) => a.donde - b.donde)
    .map((c) => c.nombre);
}

describe("GastoPorCategoria: orden", () => {
  it("por default ordena por monto, de mayor a menor", () => {
    expect(ordenPintado(pintar())).toEqual(["Vivienda", "Retiros de efectivo", "Supermercado", "Ahorro"]);
  });

  it("por variacion pone arriba la que mas subio", () => {
    const orden = ordenPintado(pintar({ orden: "variacion" }));
    expect(orden[0]).toBe("Retiros de efectivo");
    // Y la que no trae variacion se va al final: "no se sabe" no es "no cambio".
    expect(orden.at(-1)).toBe("Ahorro");
  });

  it("por nombre ordena alfabeticamente en espanol", () => {
    expect(ordenPintado(pintar({ orden: "nombre" }))).toEqual([
      "Ahorro",
      "Retiros de efectivo",
      "Supermercado",
      "Vivienda",
    ]);
  });

  it("el default del schema es monto, para que el agente no tenga que ponerlo", () => {
    const props = schemaGastoPorCategoria.parse({
      razon: "Una razon suficientemente larga",
      periodo: "2026-08",
      totalCentavos: TOTAL,
      categorias: CATEGORIAS,
    });
    expect(props.orden).toBe("monto");
  });
});

describe("GastoPorCategoria: limite", () => {
  it("lista solo las N primeras tras ordenar", () => {
    const html = pintar({ limite: 2 });
    expect(ordenPintado(html)).toEqual(["Vivienda", "Retiros de efectivo"]);
  });

  it("lo que deja fuera lo agrupa en un renglon, no lo desaparece", () => {
    const html = pintar({ limite: 2 });
    // Las otras dos suman $4,702.00.
    expect(html).toContain("otras 2");
    expect(html).toContain("$4,702.00");
  });

  it("agrupar NO enciende el aviso de dato faltante: el limite es deliberado", () => {
    expect(pintar({ limite: 2 })).not.toContain("sin desglosar");
  });

  /**
   * El aviso ambar sigue siendo el delator de su bug original: si `categorias` no suma
   * `totalCentavos`, es que el modelo recorto la lista pese al schema.
   */
  it("pero si el modelo recorto de verdad, el aviso sigue apareciendo", () => {
    const html = pintar({ categorias: CATEGORIAS.slice(0, 2), totalCentavos: TOTAL });
    expect(html).toContain("sin desglosar");
  });

  it("sin limite se listan todas", () => {
    expect(ordenPintado(pintar())).toHaveLength(CATEGORIAS.length);
    expect(pintar()).not.toContain("otras");
  });
});
