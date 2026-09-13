import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConsolaMaya } from "@/components/maya/consola-maya";
import { usuarioPorId } from "@/lib/usuarios";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("ConsolaMaya", () => {
  it("muestra el saludo y sugerencias adaptadas para Beto en estado limpio", () => {
    const usuario = usuarioPorId("usr_beto")!;
    const html = renderToStaticMarkup(createElement(ConsolaMaya, { usuario }));

    expect(html).toContain("Hola, Alberto");
    expect(html).toContain("Quiero pagar menos intereses");
  });

  it("muestra el saludo y sugerencias adaptadas para Ana al cambiar a ella", () => {
    const usuario = usuarioPorId("usr_ana")!;
    const html = renderToStaticMarkup(createElement(ConsolaMaya, { usuario }));

    expect(html).toContain("Hola, Ana");
    expect(html).toContain("Quiero empezar a ahorrar");
  });

  it("muestra el saludo y sugerencias adaptadas para Carmen al cambiar a ella", () => {
    const usuario = usuarioPorId("usr_carmen")!;
    const html = renderToStaticMarkup(createElement(ConsolaMaya, { usuario }));

    expect(html).toContain("Hola, Carmen");
    expect(html).toContain("¿Cómo va mi portafolio?");
  });
});
