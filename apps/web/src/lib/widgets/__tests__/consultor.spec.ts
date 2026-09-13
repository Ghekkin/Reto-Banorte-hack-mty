import { describe, expect, it, vi } from "vitest";
import { canonico, consultaHecha, crearConsultor, huellaDe, llave, ToolNoPermitida } from "../consultor";

describe("el consultor", () => {
  const llamarOk = () => vi.fn(async (_tool: string, argumentos: Record<string, unknown>) => ({ resultado: { eco: argumentos }, ok: true, ms: 2 }));

  it("usuarioId sale de la sesion aunque el pedido traiga otro", async () => {
    const llamar = llamarOk();
    const consultor = crearConsultor({ usuarioId: "usr_beto", llamar });
    const c = await consultor.consultar("consultar_tarjeta", { usuarioId: "usr_carmen" });
    expect(llamar).toHaveBeenCalledWith("consultar_tarjeta", { usuarioId: "usr_beto" });
    expect(c.argumentos.usuarioId).toBe("usr_beto");
  });

  it("una tool de accion no pasa, ni aunque alguien la pida por su nombre", async () => {
    const llamar = llamarOk();
    const consultor = crearConsultor({ usuarioId: "usr_beto", llamar });
    for (const accion of ["aplicar_plan_pago", "rebalancear_portafolio", "ejecutar_decision", "cancelar_suscripcion"]) {
      await expect(consultor.consultar(accion, {})).rejects.toBeInstanceOf(ToolNoPermitida);
    }
    expect(llamar).not.toHaveBeenCalled();
  });

  it("los mismos argumentos en otro orden son la misma consulta: una sola llamada", async () => {
    const llamar = llamarOk();
    const consultor = crearConsultor({ usuarioId: "usr_ana", llamar });
    await Promise.all([
      consultor.consultar("consultar_movimientos", { categoriaId: "cat_x", limite: 15 }),
      consultor.consultar("consultar_movimientos", { limite: 15, categoriaId: "cat_x" }),
    ]);
    expect(llamar).toHaveBeenCalledTimes(1);
    expect(consultor.llamadas()).toHaveLength(1);
  });

  it("lo sembrado del prefetch no se vuelve a pedir", async () => {
    const llamar = llamarOk();
    const sembrada = consultaHecha("analizar_gasto", { usuarioId: "usr_ana" }, { gasto: 1 }, true, 5);
    const consultor = crearConsultor({ usuarioId: "usr_ana", llamar, sembradas: [sembrada] });
    const c = await consultor.consultar("analizar_gasto", {});
    expect(c).toBe(sembrada);
    expect(llamar).not.toHaveBeenCalled();
  });

  it("una consulta que falla no se cachea: el reintento vuelve a llamar", async () => {
    const llamar = vi
      .fn()
      .mockResolvedValueOnce({ resultado: { error: "caido" }, ok: false, ms: 1 })
      .mockResolvedValueOnce({ resultado: { ok: 1 }, ok: true, ms: 1 });
    const consultor = crearConsultor({ usuarioId: "usr_ana", llamar });
    expect((await consultor.consultar("detectar_fugas", {})).ok).toBe(false);
    expect((await consultor.consultar("detectar_fugas", {})).ok).toBe(true);
    expect(llamar).toHaveBeenCalledTimes(2);
  });

  it("la huella es canonica: el orden de las llaves no la cambia", () => {
    expect(huellaDe({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(huellaDe({ b: [1, { d: 3, c: 2 }], a: 1 }));
    expect(huellaDe({ a: 1 })).not.toBe(huellaDe({ a: 2 }));
    expect(canonico({ b: undefined, a: 1 })).toBe('{"a":1}');
    expect(llave("t", { y: 1, x: 2 })).toBe('t {"x":2,"y":1}');
  });
});
