import { describe, expect, it, vi } from "vitest";
import { nombres, NOMBRES_DE_LAYOUT } from "@maya/a2ui";
import { nombresDelCatalogo } from "@maya/catalogo";
// Importar el lienzo tiene que dejar el registro listo: es el host del renderer en la
// consola de la demo. Este import ES la prueba.
import "@/components/maya/lienzo";
import { registrarComponentes } from "@/lib/registrar-componentes";

/**
 * La prueba del 2026-09-12 09:20: la galeria registraba los componentes y el
 * lienzo de la demo no, asi que `<Superficie>` no encontraba ni `Column` y la consola
 * pintaba puros "Desconocido" mientras `/catalogo` se veia perfecta. Ninguna prueba lo
 * cazaba porque todas validaban mensajes, no el registro del navegador.
 */
describe("el registro del renderer en la consola", () => {
  it("queda completo con solo importar el lienzo", () => {
    const registrados = nombres();
    for (const nombre of [...NOMBRES_DE_LAYOUT, ...nombresDelCatalogo()]) {
      expect(registrados.has(nombre), `${nombre} no quedo registrado: ¿falta registrarComponentes()?`).toBe(true);
    }
    expect(registrados.size).toBe(NOMBRES_DE_LAYOUT.length + nombresDelCatalogo().length);
  });

  it("es idempotente: navegar entre /maya y /catalogo no reemplaza nada", () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const antes = nombres().size;
    registrarComponentes();
    registrarComponentes();
    expect(nombres().size).toBe(antes);
    expect(aviso).not.toHaveBeenCalled();
    aviso.mockRestore();
  });
});
