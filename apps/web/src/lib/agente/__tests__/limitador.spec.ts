import { beforeEach, describe, expect, it } from "vitest";
import {
  esperarDisponibilidadTokens,
  puedeEmitirTokens,
  registrarTokensDeSalida,
  reiniciarLimitador,
  tokensDeSalidaEnElUltimoMinuto,
} from "../limitador";

describe("limitador de tokens de salida por minuto", () => {
  beforeEach(() => {
    reiniciarLimitador();
  });

  it("registra tokens y calcula el total dentro del último minuto", () => {
    const t0 = 1_000_000;
    registrarTokensDeSalida(5_000, t0);
    registrarTokensDeSalida(10_000, t0 + 10_000);

    expect(tokensDeSalidaEnElUltimoMinuto(t0 + 20_000)).toBe(15_000);
  });

  it("expira tokens más viejos que la ventana de 60 segundos", () => {
    const t0 = 1_000_000;
    registrarTokensDeSalida(20_000, t0); // en t0
    registrarTokensDeSalida(30_000, t0 + 40_000); // en t0 + 40s

    // En t0 + 61s, el primer registro de 20k debe haber expirado
    expect(tokensDeSalidaEnElUltimoMinuto(t0 + 61_000)).toBe(30_000);

    // En t0 + 101s, ambos registros deben haber expirado
    expect(tokensDeSalidaEnElUltimoMinuto(t0 + 101_000)).toBe(0);
  });

  it("verifica capacidad dentro del límite de 240k", () => {
    const t0 = 1_000_000;
    registrarTokensDeSalida(230_000, t0);

    // Con 230k usados, aún caben 2k estimados
    expect(puedeEmitirTokens(2_000, t0 + 10_000)).toBe(true);

    // Pero no caben 15k estimados (excedería 240k)
    expect(puedeEmitirTokens(15_000, t0 + 10_000)).toBe(false);
  });

  it("esperarDisponibilidadTokens pasa cuando hay capacidad", async () => {
    await expect(esperarDisponibilidadTokens(1_000)).resolves.toBeUndefined();
  });
});
