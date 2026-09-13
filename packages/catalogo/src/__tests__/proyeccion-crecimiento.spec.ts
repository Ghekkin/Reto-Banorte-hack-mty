import { describe, expect, it } from "vitest";

/**
 * El espejo de `apps/mcp/src/__tests__/proyectar-inversion.spec.ts`.
 *
 * `ProyeccionCrecimiento` simula la curva en el navegador cuando la persona mueve el
 * slider, y la **calibra** contra el cierre que mandó `proyectar_inversion`
 * (`factor = rendimientoEsperado / simulado`). Si las dos fórmulas divergen, el factor
 * deja de valer 1 y la gráfica se dobla para tapar la diferencia: se ve bien y miente.
 *
 * Por eso aquí se repite la iteración del componente con los MISMOS números que la prueba
 * del MCP, y se comprueba que el factor de calibración sale exactamente 1. No se importa
 * `simular()` porque es privada del componente; se replica, que es justo lo que se está
 * vigilando. Si alguien cambia una de las dos, una de estas dos pruebas truena.
 */

/** La iteración del componente, calcada de `proyeccion-crecimiento/componente.tsx`. */
function simularComoElComponente(
  capitalInicialCentavos: number,
  aportacionCentavos: number,
  tasaAnual: number,
  plazoMeses: number,
): { total: number; aportado: number; rendimiento: number } {
  const r = tasaAnual / 12;
  let saldo = capitalInicialCentavos;
  for (let m = 1; m <= plazoMeses; m++) {
    saldo = (saldo + aportacionCentavos) * (1 + r);
  }
  const aportado = capitalInicialCentavos + aportacionCentavos * plazoMeses;
  const rendimiento = Math.round(saldo - aportado);
  return { total: aportado + rendimiento, aportado, rendimiento };
}

describe("la curva del cliente contra la de la tool", () => {
  it("da el mismo cierre que proyectarCrecimiento del MCP", () => {
    // Los mismos números que `proyectar_inversion.spec.ts`.
    const r = simularComoElComponente(2530000, 200000, 0.0525, 60);
    expect(r.aportado).toBe(14530000);
    expect(r.rendimiento).toBe(2505782);
    expect(r.total).toBe(17035782);
  });

  it("y el mismo con capital solo, sin aportaciones", () => {
    const r = simularComoElComponente(100000000, 0, 0.12, 12);
    expect(r.total).toBe(112682503);
    expect(r.rendimiento).toBe(12682503);
  });

  it("el factor de calibracion vale 1 cuando la tool y el componente coinciden", () => {
    const simulado = simularComoElComponente(2530000, 200000, 0.0525, 60).rendimiento;
    // Lo que devuelve la tool para esa misma entrada.
    const rendimientoDeLaTool = 2505782;
    expect(rendimientoDeLaTool / simulado).toBe(1);
  });

  it("una tasa adversa produce perdida, y el cliente ya NO la aplasta a cero", () => {
    const r = simularComoElComponente(100000000, 0, -0.05, 24);
    expect(r.rendimiento).toBe(-9535160);
    expect(r.total).toBeLessThan(r.aportado);
  });
});
