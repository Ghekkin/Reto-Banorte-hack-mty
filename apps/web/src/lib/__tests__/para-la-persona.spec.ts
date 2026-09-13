import { describe, expect, it } from "vitest";
import { accionLegible } from "../para-la-persona";

describe("accionLegible", () => {
  it("nombra la accion en palabras y nunca ensena el context", () => {
    const texto = accionLegible({ name: "aplicar_plan_pago", context: { plazoMeses: 12, tarjetaId: "tdc_beto" } });
    expect(texto).toBe("Aplicar el plan de pago");
    expect(texto).not.toContain("{");
    expect(texto).not.toContain("_");
  });

  it("usa el dato que la persona reconoce cuando viene en el context", () => {
    expect(accionLegible({ name: "preguntar", context: { pregunta: "¿Cuánto me ahorro?" } })).toBe("¿Cuánto me ahorro?");
    expect(accionLegible({ name: "cancelar_suscripcion", context: { suscripcionId: "s1", concepto: "Netflix" } })).toBe(
      "Cancelar Netflix",
    );
    expect(accionLegible({ name: "ver_categoria", context: { categoriaId: "c1", categoria: "Vivienda" } })).toBe(
      "Ver Vivienda",
    );
  });

  it("una accion que no esta en la tabla sale sin guiones bajos", () => {
    expect(accionLegible({ name: "abrir_detalle_nuevo", context: {} })).toBe("Abrir detalle nuevo");
  });
});
