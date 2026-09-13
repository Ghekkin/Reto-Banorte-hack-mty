import { describe, expect, it } from "vitest";
import { armarMensajes } from "../pantalla";

/**
 * Reporte de usuario (2026-09-13): al tocar "Ver Restaurantes" desde el chat, tanto
 * `GastoPorCategoria` como `DetalleCategoria` mostraban "$0.00" en el monto grande, y el
 * desglose de abajo traía datos de relleno (Restaurantes $6,200 / Supermercado $8,300;
 * "Cargo general" $350) en vez de los reales, aunque el texto de Maya sí los mencionaba
 * bien. Causa: `normalizarListaDeComponentes` reparaba `totalCentavos`/`categorias`/
 * `movimientos` como si fueran literales ausentes o mal formados, sin reconocer que un
 * binding `{"path": "..."}` (la forma correcta y documentada, ver
 * `packages/catalogo/ejemplos/gasto-por-categoria.jsonl` y `detalle-categoria.jsonl`) es
 * un valor legítimo que se resuelve después contra el data model. `Number({path:...})`
 * da `NaN`, y `NaN || 0` da `0`; `Array.isArray({path:...})` da `false`, así que el
 * arreglo también se pisaba con el default de demo.
 */
describe("normalización de GastoPorCategoria y DetalleCategoria con bindings", { timeout: 20000 }, () => {
  const base = {
    razon: "En agosto sumaste $7,255.50 en Restaurantes.",
    texto: "En agosto sumaste $7,255.50 en Restaurantes a lo largo de 17 consumos.",
  };

  it("no pisa totalCentavos ni categorias cuando GastoPorCategoria los manda como binding", () => {
    const datos = {
      gasto: {
        periodo: "2026-08",
        totalCentavos: 3334950,
        categorias: [
          { categoriaId: "cat_super", nombre: "Supermercado", montoCentavos: 830000 },
          { categoriaId: "cat_restaurantes", nombre: "Restaurantes", montoCentavos: 620000 },
        ],
      },
    };
    const componentes = [
      {
        id: "root",
        component: "GastoPorCategoria",
        periodo: { path: "/gasto/periodo" },
        totalCentavos: { path: "/gasto/totalCentavos" },
        categorias: { path: "/gasto/categorias" },
        razon: base.razon,
      },
    ];

    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify(componentes),
      datosJson: JSON.stringify(datos),
    });

    if (!r.ok) console.log("errores:", r.errores);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      const comp = updateMsg.updateComponents.components.find((c) => c.component === "GastoPorCategoria");
      expect(comp).toBeDefined();
      // El binding se queda intacto: nunca "0" ni el arreglo de relleno.
      expect(comp!.totalCentavos).toEqual({ path: "/gasto/totalCentavos" });
      expect(comp!.categorias).toEqual({ path: "/gasto/categorias" });

      const dataMsg = r.mensajes.find((m) => "updateDataModel" in m) as {
        updateDataModel: { value: Record<string, unknown> };
      };
      const gasto = dataMsg.updateDataModel.value.gasto as Record<string, unknown>;
      expect(gasto.totalCentavos).toBe(3334950);
    }
  });

  it("no pisa totalCentavos ni movimientos cuando DetalleCategoria los manda como binding", () => {
    const datos = {
      detalle: {
        categoria: "Restaurantes",
        periodo: "2026-08",
        totalCentavos: 725550,
        movimientos: [
          { fecha: "2026-08-15", comercio: "El Cabrito Regio", montoCentavos: 428000 },
          { fecha: "2026-08-10", comercio: "Rappi", montoCentavos: 297550 },
        ],
      },
    };
    const componentes = [
      {
        id: "root",
        component: "DetalleCategoria",
        categoria: { path: "/detalle/categoria" },
        periodo: { path: "/detalle/periodo" },
        totalCentavos: { path: "/detalle/totalCentavos" },
        movimientos: { path: "/detalle/movimientos" },
        razon: base.razon,
      },
    ];

    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify(componentes),
      datosJson: JSON.stringify(datos),
    });

    if (!r.ok) console.log("errores:", r.errores);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      const comp = updateMsg.updateComponents.components.find((c) => c.component === "DetalleCategoria");
      expect(comp).toBeDefined();
      expect(comp!.totalCentavos).toEqual({ path: "/detalle/totalCentavos" });
      expect(comp!.movimientos).toEqual({ path: "/detalle/movimientos" });

      const dataMsg = r.mensajes.find((m) => "updateDataModel" in m) as {
        updateDataModel: { value: Record<string, unknown> };
      };
      const detalle = dataMsg.updateDataModel.value.detalle as Record<string, unknown>;
      expect(detalle.totalCentavos).toBe(725550);
    }
  });

  it("sigue reparando GastoPorCategoria cuando categorias/totalCentavos vienen ausentes, con el analisis de gasto del turno", () => {
    const componentes = [
      {
        id: "root",
        component: "GastoPorCategoria",
        razon: base.razon,
      },
    ];
    // La forma real de `analizar_gasto`: el mes viene ANIDADO en `gasto` (#23).
    const datosBase = {
      analizar_gasto: {
        gasto: {
          periodo: "2026-08",
          periodoAnterior: "2026-07",
          gastoCentavos: 3141050,
          gastoAnteriorCentavos: 2640100,
          variacionPct: 0.1897,
          categoriaAtipicaId: "cat_restaurantes",
          categorias: [
            { categoriaId: "cat_vivienda", nombre: "Vivienda", montoCentavos: 2415500, variacionPct: 0 },
            { categoriaId: "cat_restaurantes", nombre: "Restaurantes", montoCentavos: 725550, variacionPct: 0.61 },
          ],
        },
      },
    };

    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify(componentes),
    }, { datosBase });

    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      const comp = updateMsg.updateComponents.components.find((c) => c.component === "GastoPorCategoria");
      expect((comp!.categorias as Array<{ nombre: string }>).map((c) => c.nombre)).toEqual(["Vivienda", "Restaurantes"]);
      expect(comp!.totalCentavos).toBe(3141050);
      expect(comp!.periodo).toBe("2026-08");
    }
  });

  it("sin analisis de gasto en el turno no inventa categorias de ejemplo (#23)", () => {
    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify([{ id: "root", component: "GastoPorCategoria", razon: base.razon }]),
    });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("620000");
  });
});
