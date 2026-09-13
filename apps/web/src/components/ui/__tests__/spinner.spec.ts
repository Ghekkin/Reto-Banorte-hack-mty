import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Spinner } from "@/components/ui/spinner";

/** La app es en espanol: un lector de pantalla no debe decir "Loading" al enviar. Issue #20. */
describe("Spinner", () => {
  it("se anuncia en espanol por omision", () => {
    const html = renderToStaticMarkup(createElement(Spinner));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Cargando"');
    expect(html).not.toContain("Loading");
  });

  it("quien lo usa puede cambiar el texto o esconderlo", () => {
    expect(renderToStaticMarkup(createElement(Spinner, { "aria-label": "Enviando tu pregunta" }))).toContain(
      'aria-label="Enviando tu pregunta"',
    );
    expect(renderToStaticMarkup(createElement(Spinner, { "aria-hidden": true }))).toContain('aria-hidden="true"');
  });
});
