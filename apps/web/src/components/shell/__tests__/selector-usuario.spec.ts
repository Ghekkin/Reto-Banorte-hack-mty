import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SelectorUsuario } from "@/components/shell/selector-usuario";
import { usuarioPorId } from "@/lib/usuarios";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("SelectorUsuario", () => {
  it("renderiza el selector con el usuario activo", () => {
    const usuario = usuarioPorId("usr_beto")!;
    const html = renderToStaticMarkup(createElement(SelectorUsuario, { usuario, variante: "sidebar" }));

    expect(html).toContain("Alberto Ramírez");
    expect(html).toContain("Tarjeta al límite");
  });

  it("renderiza variante avatar para móvil", () => {
    const usuario = usuarioPorId("usr_ana")!;
    const html = renderToStaticMarkup(createElement(SelectorUsuario, { usuario, variante: "avatar" }));

    expect(html).toContain("AT");
  });
});
