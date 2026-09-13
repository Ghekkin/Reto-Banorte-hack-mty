import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CambiarPersona } from "@/components/mas/cambiar-persona";
import { usuarioPorId } from "@/lib/usuarios";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("CambiarPersona", () => {
  it("renderiza las tres personas de la demo", () => {
    const usuario = usuarioPorId("usr_beto")!;
    const html = renderToStaticMarkup(createElement(CambiarPersona, { usuario }));

    expect(html).toContain("Alberto Ramírez");
    expect(html).toContain("Ana Sofía Treviño");
    expect(html).toContain("Carmen Elizondo");
  });
});
