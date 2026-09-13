import { describe, expect, it } from "vitest";
import { anosDesde, enmascararCorreo, enmascararTelefono, textoAntiguedad } from "../perfil";

describe("datos personales de Mas", () => {
  it("enmascara el correo y deja el dominio", () => {
    expect(enmascararCorreo("alberto.ramirez@ejemplo.mx")).toBe("al•••••@ejemplo.mx");
    expect(enmascararCorreo("ana@ejemplo.mx")).toBe("a•••••@ejemplo.mx");
    expect(enmascararCorreo("sin-arroba")).toBe("•••••");
  });

  it("del telefono solo quedan los ultimos cuatro digitos", () => {
    expect(enmascararTelefono("+52 81 1000 0002")).toBe("•••• 0002");
    expect(enmascararTelefono("12")).toBe("••••");
  });

  it("la antiguedad cuenta anos completos, no anos de calendario", () => {
    const hoy = new Date(2026, 8, 13); // 13 de septiembre de 2026
    expect(anosDesde("2016-02-15", hoy)).toBe(10);
    expect(anosDesde("2009-05-11", hoy)).toBe(17);
    expect(anosDesde("2025-09-14", hoy)).toBe(0); // le falta un dia
    expect(anosDesde("2025-09-13", hoy)).toBe(1);
  });

  it("el texto de antiguedad no dice «0 años»", () => {
    const hoy = new Date(2026, 8, 13);
    expect(textoAntiguedad("2021-08-02", hoy)).toBe("Cliente desde 2021 · 5 años");
    expect(textoAntiguedad("2025-10-01", hoy)).toBe("Cliente desde 2025");
    expect(textoAntiguedad("2025-09-13", hoy)).toBe("Cliente desde 2025 · 1 año");
  });
});
