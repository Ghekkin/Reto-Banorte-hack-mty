import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GastoPorCategoria } from "../gasto-por-categoria/componente";
import { entradaGastoPorCategoria, schemaGastoPorCategoria } from "../gasto-por-categoria/schema";

/**
 * `GastoPorCategoria` con gastos de fuera del banco (fase 2 de los ajustes en vivo): «también
 * le doy $2,000 al mes a mi mamá en efectivo» parchea la MISMA tarjeta con el `despues` de
 * `simular_gasto_externo`, y «Guardar gasto» dispara `registrar_gasto_externo`.
 *
 * Aquí, sin DOM: el schema viejo y el nuevo, los badges, que la fila externa no sea botón, cuándo
 * aparece el botón, la línea antes → después y que `limite` no agrupe lo que está sin guardar. El
 * clic con su `context`, el nombre de acción no declarado y el resaltado viven en
 * `gasto-fuera-del-banco-dom.spec.tsx`.
 */
const BANCO = [
  { categoriaId: "cat_vivienda", nombre: "Vivienda", montoCentavos: 720000, variacionPct: 0 },
  { categoriaId: "cat_retiros", nombre: "Retiros de efectivo", montoCentavos: 460150, variacionPct: 0.747 },
  { categoriaId: "cat_super", nombre: "Supermercado", montoCentavos: 370200, variacionPct: -0.0902 },
];
const TOTAL_BANCO = BANCO.reduce((s, c) => s + c.montoCentavos, 0); // $15,503.50
const MAMA = { nombre: "Apoyo a mi mamá", montoCentavos: 200000, fueraDelBanco: true, guardado: false, frecuencia: "mensual" as const };
const CON_MAMA = [...BANCO, MAMA];
const TOTAL_CON_MAMA = TOTAL_BANCO + MAMA.montoCentavos; // $17,503.50

function pintar(extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(GastoPorCategoria, {
      periodo: "2026-08",
      totalCentavos: TOTAL_BANCO,
      variacionPct: 0.0732,
      categorias: BANCO,
      razon: "Tus retiros de efectivo subieron 75 % contra julio",
      alAccionar: () => {},
      ...extra,
    } as never),
  );
}

/** El HTML de la fila de una categoría: desde su etiqueta de apertura hasta su nombre. */
function aperturaDeFila(html: string, nombre: string): string {
  const donde = html.indexOf(nombre);
  const inicio = Math.max(html.lastIndexOf("<button", donde), html.lastIndexOf("<div", donde));
  return html.slice(inicio, html.indexOf(">", inicio) + 1);
}

describe("GastoPorCategoria: schema con gastos de fuera", () => {
  it("lo ya pintado sigue validando, y el boton trae su etiqueta por default", () => {
    const r = schemaGastoPorCategoria.safeParse({ razon: "Una razon suficiente", periodo: "2026-08", totalCentavos: TOTAL_BANCO, categorias: BANCO });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    expect(r.data?.etiquetaBoton).toBe("Guardar gasto");
    expect(r.data?.antes).toBeUndefined();
  });

  it("acepta el `despues` y el `antes` de la tool tal cual, con aviso", () => {
    const r = schemaGastoPorCategoria.safeParse({
      razon: "Una razon suficiente",
      periodo: "2026-08",
      totalCentavos: TOTAL_CON_MAMA,
      categorias: CON_MAMA,
      antes: { totalCentavos: TOTAL_BANCO, categorias: BANCO },
      aviso: "Ya no te queda nada libre al mes.",
    });
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    expect(r.data?.categorias.at(-1)).toMatchObject({ fueraDelBanco: true, guardado: false, frecuencia: "mensual" });
  });

  it("rechaza una frecuencia que la tool no conoce", () => {
    const r = schemaGastoPorCategoria.safeParse({
      razon: "Una razon suficiente",
      periodo: "2026-08",
      totalCentavos: TOTAL_CON_MAMA,
      categorias: [...BANCO, { ...MAMA, frecuencia: "semanal" }],
    });
    expect(r.success).toBe(false);
  });

  it("declara las dos acciones, y la de tocar una fila va primero (es la default)", () => {
    expect(entradaGastoPorCategoria.acciones).toEqual(["ver_categoria", "registrar_gasto_externo"]);
  });
});

describe("GastoPorCategoria: la fila de fuera del banco", () => {
  it("sin guardar: badges «Fuera del banco» y «sin guardar», con su frecuencia", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA });
    expect(html).toContain("Fuera del banco");
    expect(html).toContain("sin guardar");
    expect(html).toContain("cada mes");
  });

  it("guardada: solo «Fuera del banco»", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: [...BANCO, { ...MAMA, guardado: true, frecuencia: "unico" }] });
    expect(html).toContain("Fuera del banco");
    expect(html).not.toContain("sin guardar");
    expect(html).toContain("solo este mes");
  });

  it("no es boton: lo de fuera no tiene movimientos que ver; las del banco si lo son", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA });
    expect(aperturaDeFila(html, "Apoyo a mi mamá")).toMatch(/^<div[^>]*data-fuera-del-banco=""/);
    expect(aperturaDeFila(html, "Supermercado")).toMatch(/^<button/);
  });

  it("la suma de lo listado sigue cuadrando: sin aviso de dato faltante", () => {
    expect(pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA })).not.toContain("sin desglosar");
  });
});

describe("GastoPorCategoria: boton «Guardar gasto»", () => {
  const boton = /<button[^>]*min-h-12[^>]*>Guardar gasto/;

  it("aparece si hay alguna fila sin guardar", () => {
    expect(pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA })).toMatch(boton);
    expect(pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA, etiquetaBoton: "Guardar apoyo" })).toContain("Guardar apoyo");
  });

  it("no aparece sin gastos de fuera ni cuando ya se guardaron", () => {
    expect(pintar()).not.toContain("Guardar gasto");
    expect(pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: [...BANCO, { ...MAMA, guardado: true }] })).not.toContain("Guardar gasto");
  });

  it("es el unico boton primario de la tarjeta", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA });
    // `variant="default"` de shadcn es el unico que pinta `bg-primary text-primary-foreground`.
    const primarios = [...html.matchAll(/<button[^>]*class="[^"]*\bbg-primary text-primary-foreground[^"]*"/g)];
    expect(primarios).toHaveLength(1);
  });
});

describe("GastoPorCategoria: antes → después del total", () => {
  it("cuando sube: «$15,503.50 → $17,503.50 · +$2,000.00 fuera del banco», sin la variacion vieja", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA, antes: { totalCentavos: TOTAL_BANCO } });
    expect(html).toMatch(/\$15,503\.50 → \$17,503\.50 · <span[^>]*>\+\$2,000\.00<\/span> fuera del banco/);
    expect(html).not.toContain("vs. el mes anterior");
  });

  it("cuando baja (quitar un gasto guardado): con signo menos", () => {
    const html = pintar({ totalCentavos: TOTAL_BANCO, categorias: BANCO, antes: { totalCentavos: TOTAL_CON_MAMA } });
    expect(html).toMatch(/\$17,503\.50 → \$15,503\.50 · <span[^>]*>−\$2,000\.00<\/span> fuera del banco/);
  });

  it("si el total no cambio, no hay linea y la variacion sigue", () => {
    const html = pintar({ antes: { totalCentavos: TOTAL_BANCO } });
    expect(html).not.toContain("fuera del banco");
    expect(html).toContain("vs. el mes anterior");
  });

  it("el aviso de la tool sale en ambar", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA, aviso: "Ya no te queda nada libre al mes." });
    expect(html).toMatch(/data-slot="alert"[^>]*text-advertencia/);
    expect(html).toContain("Ya no te queda nada libre al mes.");
  });
});

describe("GastoPorCategoria: limite con gastos de fuera", () => {
  it("una fila sin guardar nunca se agrupa en «otras»", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA, limite: 1 });
    expect(html).toContain("Apoyo a mi mamá");
    expect(html).toContain("Vivienda");
    // Se agrupan Retiros y Supermercado: $8,303.50. La de mamá no cuenta ahí.
    expect(html).toContain("otras 2: $8,303.50");
  });

  it("una fila sin guardar va arriba de la lista, aunque sea la mas chica; guardada vuelve a su lugar", () => {
    const orden = (html: string) =>
      [...CON_MAMA.map((c) => c.nombre)].sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(orden(pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: CON_MAMA }))[0]).toBe("Apoyo a mi mamá");
    const guardada = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: [...BANCO, { ...MAMA, guardado: true }] });
    expect(orden(guardada).at(-1)).toBe("Apoyo a mi mamá");
  });

  it("una guardada si se agrupa como cualquier otra", () => {
    const html = pintar({ totalCentavos: TOTAL_CON_MAMA, categorias: [...BANCO, { ...MAMA, guardado: true }], limite: 1 });
    expect(html).not.toContain("Apoyo a mi mamá");
    expect(html).toContain("otras 3: $10,303.50");
  });
});

describe("las variantes de ejemplo de GastoPorCategoria cuadran", () => {
  for (const archivo of ["gasto-por-categoria-simulado.jsonl", "gasto-por-categoria-guardado.jsonl"]) {
    it(`${archivo}: la suma de las categorias es el total`, () => {
      const lineas = readFileSync(join(import.meta.dirname, "../../ejemplos/variantes", archivo), "utf8")
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l) => JSON.parse(l) as { updateDataModel?: { value: { gasto: { totalCentavos: number; categorias: { montoCentavos: number }[] } } } });
      const gasto = lineas.find((l) => l.updateDataModel)!.updateDataModel!.value.gasto;
      expect(gasto.categorias.reduce((s, c) => s + c.montoCentavos, 0)).toBe(gasto.totalCentavos);
    });
  }
});
