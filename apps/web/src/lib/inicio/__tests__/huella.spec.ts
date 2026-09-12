import { describe, expect, it } from "vitest";
import { armarHuella, VERSION_DEL_GENERADOR } from "../huella";

/**
 * La huella decide si el modelo corre. Lo que tiene que ser cierto: misma cuenta, misma
 * huella (y ningun token gastado); una accion o un movimiento nuevo la cambian; y subir
 * la version del generador la cambia para todos.
 */
describe("la huella del Inicio", () => {
  const base = { acciones: "0:0", movimientos: "812:2026-09-10", version: 1, componentes: 18 };

  it("es la misma para los mismos datos", () => {
    expect(armarHuella(base)).toBe(armarHuella({ ...base }));
  });

  it("cambia cuando se aplica una accion", () => {
    expect(armarHuella({ ...base, acciones: "1:7" })).not.toBe(armarHuella(base));
  });

  it("cambia cuando hay movimientos nuevos", () => {
    expect(armarHuella({ ...base, movimientos: "813:2026-09-12" })).not.toBe(armarHuella(base));
  });

  it("cambia cuando sube la version del generador o crece el catalogo", () => {
    expect(armarHuella({ ...base, version: 2 })).not.toBe(armarHuella(base));
    expect(armarHuella({ ...base, componentes: 19 })).not.toBe(armarHuella(base));
  });

  it("se lee de un vistazo y trae la version vigente por default", () => {
    const huella = armarHuella({ acciones: "1:7", movimientos: "812:2026-09-10" });
    expect(huella.startsWith(`v${VERSION_DEL_GENERADOR}|`)).toBe(true);
    expect(huella).toContain("a:1:7");
    expect(huella).toContain("m:812:2026-09-10");
  });
});
