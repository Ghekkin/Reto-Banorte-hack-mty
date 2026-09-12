import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, Superficie, type MensajeA2UI } from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { CATALOGO, registrarCatalogo } from "../index";

/**
 * Que cada componente PINTE de verdad con su ejemplo, no solo que su schema valide.
 * Un componente que truena al recibir sus props no lo detecta ningun schema; esto si.
 * Se pinta en el servidor (sin DOM): es el mismo arbol de React que ve el navegador.
 */
registrarLayout();
registrarCatalogo();

const RAIZ = join(import.meta.dirname, "../..");
const kebab = (n: string) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function pintar(nombre: string): string {
  const texto = readFileSync(join(RAIZ, "ejemplos", `${kebab(nombre)}.jsonl`), "utf8");
  const mensajes = texto
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
  const { estado, error } = procesarVarios(estadoVacio(), mensajes);
  expect(error).toBeUndefined();
  return renderToStaticMarkup(
    createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c_prueba", alAccionar: () => {} }),
  );
}

describe("cada componente pinta su ejemplo", () => {
  for (const entrada of CATALOGO) {
    it(`${entrada.nombre} pinta sin tronar y muestra dinero formateado`, () => {
      const html = pintar(entrada.nombre);
      expect(html.length).toBeGreaterThan(200);
      expect(html).not.toContain("Componente desconocido");
      // Todo componente del catalogo muestra al menos un monto en pesos.
      expect(html).toMatch(/\$\d{1,3}(,\d{3})*\.\d{2}/);
      // Y la linea "¿Por que veo esto?" con la razon del ejemplo.
      expect(html).toContain("Por qué veo esto");
    });
  }

  it("el estado de carga no truena cuando el data model llega vacio", () => {
    for (const entrada of CATALOGO) {
      const { estado } = procesarVarios(estadoVacio(), [
        { version: "v0.9.1", createSurface: { surfaceId: "principal", catalogId: "x" } },
        { version: "v0.9.1", updateComponents: { surfaceId: "principal", components: [{ id: "root", component: entrada.nombre, razon: "sin datos todavia" }] } },
      ]);
      const html = renderToStaticMarkup(
        createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} }),
      );
      expect(html, entrada.nombre).toContain('data-slot="skeleton"');
    }
  });
});
