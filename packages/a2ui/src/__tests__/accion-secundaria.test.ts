import { afterEach, describe, expect, it } from "vitest";
import { emitirAccion } from "../acciones";
import { accionesDe, definirAcciones, limpiar } from "../registro";

/**
 * Un componente A2UI lleva una sola `action`, pero una tarjeta puede necesitar dos botones
 * (abrir una fila y «Guardar gasto»). La segunda sale con su propio nombre, solo si el catalogo
 * la declara, y sin heredar los enlaces del context de la primera.
 */
describe("accion secundaria declarada en el catalogo", () => {
  afterEach(() => limpiar());

  const tarjeta = {
    id: "gasto",
    component: "GastoPorCategoria",
    action: { event: { name: "ver_categoria", context: { periodo: { path: "/gasto/periodo" } } } },
  };

  it("sale con el nombre pedido y solo con el context que mando el componente", () => {
    const accion = emitirAccion({
      componente: tarjeta,
      surfaceId: "principal",
      dataModel: { gasto: { periodo: "2026-08" } },
      conversacionId: "c_1",
      contextoExtra: { nombre: "Renta", montoCentavos: 350000 },
      nombre: "registrar_gasto_externo",
      ahora: () => "2026-09-13T09:00:00Z",
    });
    expect(accion).toEqual({
      name: "registrar_gasto_externo",
      surfaceId: "principal",
      sourceComponentId: "gasto",
      timestamp: "2026-09-13T09:00:00Z",
      context: { nombre: "Renta", montoCentavos: 350000, idempotencyKey: "c_1:2026-09-13T09:00:00Z" },
    });
  });

  it("con el nombre de la declarada, es la de siempre: con sus enlaces resueltos", () => {
    const accion = emitirAccion({
      componente: tarjeta,
      surfaceId: "principal",
      dataModel: { gasto: { periodo: "2026-08" } },
      conversacionId: "c_1",
      nombre: "ver_categoria",
      ahora: () => "t",
    });
    expect(accion?.name).toBe("ver_categoria");
    expect(accion?.context).toMatchObject({ periodo: "2026-08" });
  });

  it("el registro guarda las acciones de cada componente y se limpia", () => {
    definirAcciones("GastoPorCategoria", ["ver_categoria", "registrar_gasto_externo"]);
    expect(accionesDe("GastoPorCategoria")).toContain("registrar_gasto_externo");
    expect(accionesDe("PlanDePago")).toEqual([]);
    limpiar();
    expect(accionesDe("GastoPorCategoria")).toEqual([]);
  });
});
