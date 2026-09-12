import { afterEach, describe, expect, it, vi } from "vitest";
import { vozHabilitada } from "@/lib/voz/flag";

/**
 * La regla del premio lateral es "con el flag apagado, la demo es identica a
 * antes": esto prueba que el flag es estricto (solo `"1"` enciende) y que
 * cualquier otra cosa -vacio, "0", "true"- se queda apagada.
 */
describe("vozHabilitada", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("apagada cuando la variable no existe", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_VOZ", "");
    expect(vozHabilitada()).toBe(false);
  });

  it("apagada con cualquier valor que no sea exactamente \"1\"", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_VOZ", "true");
    expect(vozHabilitada()).toBe(false);
  });

  it("encendida solo con \"1\"", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_VOZ", "1");
    expect(vozHabilitada()).toBe(true);
  });
});
