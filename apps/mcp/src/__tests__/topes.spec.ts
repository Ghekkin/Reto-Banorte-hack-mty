import { beforeEach, describe, expect, it } from "vitest";
import { SalidaCrearTopeGasto } from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { crearTopeGasto } from "../tools/crear-tope-gasto.js";

beforeEach(() => reiniciarEstado());

const LLAVE_1 = "c_prueba_tope:2026-09-13T01:00:00Z";
const LLAVE_2 = "c_prueba_tope:2026-09-13T02:00:00Z";

describe("crear_tope_gasto", () => {
  it("crea un nuevo tope para una categoría sin tope previo (ej. supermercado)", async () => {
    const res = SalidaCrearTopeGasto.parse(
      await crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_super",
        montoLimiteCentavos: 600000,
        idempotencyKey: LLAVE_1,
      }),
    );

    expect(res.aplicado).toBe(true);
    expect(res.yaEstaba).toBe(false);
    expect(res.tope.categoriaId).toBe("cat_super");
    expect(res.tope.categoria).toBe("Supermercado");
    expect(res.tope.montoLimiteCentavos).toBe(600000);
    expect(res.tope.gastadoActualCentavos).toBeGreaterThan(0);
    expect(res.promedioHistoricoCentavos).toBeGreaterThan(0);
    expect(["dentro", "cerca", "excedido"]).toContain(res.tope.estatus);
  });

  it("trampa 1: calcula gastado en vivo y no lee el 0 del CSV en topes existentes", async () => {
    // Ana ya tiene un tope base de restaurantes en el CSV con límite de $4,500 (450000 centavos)
    const res = SalidaCrearTopeGasto.parse(
      await crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_restaurantes",
        montoLimiteCentavos: 450000,
        idempotencyKey: LLAVE_1,
      }),
    );

    // Duplicado reconocido
    expect(res.yaEstaba).toBe(true);
    expect(res.aplicado).toBe(false);

    // Trampa 1: El gastado no viene en 0, se calcula con los movimientos reales ($7,255.50)
    expect(res.tope.gastadoActualCentavos).toBe(725550);
    expect(res.tope.montoLimiteCentavos).toBe(450000);
    expect(res.tope.pctUsado).toBeCloseTo(725550 / 450000, 4);
    expect(res.tope.estatus).toBe("excedido");

    // Promedio de los 3 meses previos
    expect(res.promedioHistoricoCentavos).toBe(252917);
  });

  it("idempotencia: misma llave produce un solo cambio", async () => {
    const primera = SalidaCrearTopeGasto.parse(
      await crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_salud",
        montoLimiteCentavos: 100000,
        idempotencyKey: LLAVE_2,
      }),
    );
    expect(primera.aplicado).toBe(true);
    expect(primera.yaEstaba).toBe(false);

    const segunda = SalidaCrearTopeGasto.parse(
      await crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_salud",
        montoLimiteCentavos: 100000,
        idempotencyKey: LLAVE_2,
      }),
    );
    expect(segunda.aplicado).toBe(false);
    expect(segunda.yaEstaba).toBe(true);
  });

  it("rechaza fijar tope sobre categorías de ingreso", async () => {
    await expect(async () =>
      crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_nomina",
        montoLimiteCentavos: 2000000,
        idempotencyKey: LLAVE_1,
      }),
    ).rejects.toThrow(/no se puede poner un tope a una categoria de ingreso/);
  });

  it("rechaza monto límite menor o igual a cero", async () => {
    await expect(async () =>
      crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_super",
        montoLimiteCentavos: 0,
        idempotencyKey: LLAVE_1,
      }),
    ).rejects.toThrow(/mayor que cero/);
  });

  it("rechaza categoría inexistente", async () => {
    await expect(async () =>
      crearTopeGasto.manejar({
        usuarioId: "usr_ana",
        categoriaId: "cat_inexistente",
        montoLimiteCentavos: 50000,
        idempotencyKey: LLAVE_1,
      }),
    ).rejects.toThrow(/no existe la categoria/);
  });
});
