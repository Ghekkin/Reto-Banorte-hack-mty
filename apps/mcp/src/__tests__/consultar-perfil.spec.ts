import { describe, expect, it } from "vitest";
import { SalidaConsultarPerfil } from "@maya/schemas";
import { consultarPerfil } from "../tools/consultar-perfil.js";
import { buscar, tabla } from "../datos/index.js";

describe("datos en memoria", () => {
  it("carga los CSV de db/datos", () => {
    expect(tabla("usuarios").length).toBeGreaterThan(0);
    expect(buscar("usuarios", "id", "usr_beto")?.nombre).toContain("Alberto");
  });
});

describe("consultar_perfil", () => {
  it("devuelve un perfil que cumple el schema de salida", async () => {
    const salida = await consultarPerfil.manejar({ usuarioId: "usr_beto" });
    expect(() => SalidaConsultarPerfil.parse(salida)).not.toThrow();
    expect(SalidaConsultarPerfil.parse(salida).ingresoMensualCentavos).toBeGreaterThan(0);
  });

  it("falla con un id que no existe", async () => {
    await expect(async () => consultarPerfil.manejar({ usuarioId: "usr_fantasma" })).rejects.toThrow(/no existe/);
  });

  it("rechaza una entrada que no cumple el schema", async () => {
    await expect(async () => consultarPerfil.manejar({ usuarioId: "beto" })).rejects.toThrow();
  });
});
