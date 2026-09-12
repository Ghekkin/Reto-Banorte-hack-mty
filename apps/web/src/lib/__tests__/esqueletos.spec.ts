import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, VERSION_A2UI, type Componente } from "@maya/a2ui";
import { Lienzo } from "@/components/maya/lienzo";

/**
 * Los estados de carga del catálogo: lo que se ve entre que llega la estructura y llegan
 * los datos. Antes medían entre el 30 % y el 60 % de la tarjeta final y la rejilla saltaba
 * al llegar los datos; ahora usan `esqueletos.tsx` y miden lo mismo (medido en el
 * navegador: 0.99-1.03 del alto real).
 *
 * El alto no se puede probar sin navegador. Lo que sí: que cada componente, sin datos,
 * pinte su esqueleto y lo anuncie a un lector de pantalla, y que la tarjeta héroe ya
 * salga con el degradado desde la carga (sin el parpadeo blanco -> rojo).
 */
function pintarSinDatos(componente: Componente): string {
  const { estado } = procesarVarios(estadoVacio(), [
    { version: VERSION_A2UI, createSurface: { surfaceId: "principal", catalogId: "x" } },
    { version: VERSION_A2UI, updateComponents: { surfaceId: "principal", components: [componente] } },
  ]);
  return renderToStaticMarkup(
    createElement(Lienzo, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} }),
  );
}

const LOS_OCHO = [
  ["ResumenTarjeta", "Cargando el resumen de tu tarjeta"],
  ["PlanDePago", "Cargando las opciones de tu plan de pagos"],
  ["Confirmacion", "Confirmando la operación"],
  ["Calendario", "Cargando tus próximas fechas"],
  ["GastoPorCategoria", "Cargando tu gasto por categoría"],
  ["DetalleCategoria", "Cargando los movimientos"],
  ["SimuladorMeta", "Preparando tu simulador de ahorro"],
  ["MetaActiva", "Cargando el avance de tu meta"],
] as const;

describe("los estados de carga", () => {
  for (const [nombre, etiqueta] of LOS_OCHO) {
    it(`${nombre} pinta su esqueleto y lo anuncia`, () => {
      const html = pintarSinDatos({ id: "root", component: nombre, razon: "una razon de prueba larga" });
      expect(html).not.toContain("Componente desconocido");
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain(`aria-label="${etiqueta}"`);
      // Que sea la forma de la tarjeta y no tres barras sueltas.
      expect(html.match(/data-slot="skeleton"/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    });
  }

  it("la tarjeta héroe ya sale con el degradado mientras carga", () => {
    const html = pintarSinDatos({ id: "root", component: "ResumenTarjeta", heroe: true, razon: "una razon de prueba larga" });
    expect(html).toContain("linear-gradient");
    // Y los bloques en blanco translúcido: el gris de siempre no se ve sobre el rojo.
    expect(html).toContain("bg-white/20");
  });

  it("sin heroe, el esqueleto es la tarjeta blanca de siempre", () => {
    const html = pintarSinDatos({ id: "root", component: "ResumenTarjeta", razon: "una razon de prueba larga" });
    expect(html).not.toContain("linear-gradient");
  });
});
