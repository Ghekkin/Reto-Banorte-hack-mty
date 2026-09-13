// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { procesarVarios } from "../procesar";
import { registrar, limpiar } from "../registro";
import { Superficie } from "../Superficie";
import { estadoVacio, VERSION_A2UI, type MensajeA2UI } from "../tipos";

/**
 * La frontera de error solo existe en el cliente: React no ejecuta `getDerivedStateFromError`
 * al renderizar en servidor, asi que este test vive aparte, con un DOM real (happy-dom)
 * y `createRoot`, en vez de `renderToStaticMarkup` como los demas.
 */

const crear: MensajeA2UI = {
  version: VERSION_A2UI,
  createSurface: { surfaceId: "principal", catalogId: "https://ejemplo.test/catalogo/v1.json" },
};

describe("un componente que truena al pintar", () => {
  it("se cae solo el, y los demas siguen en pie", async () => {
    limpiar();
    registrar("Column", ({ children }) => <div>{children}</div>);
    registrar("Sano", () => <p>estoy bien</p>);
    registrar("Roto", () => {
      throw new Error("prop con la forma equivocada");
    });
    const { estado } = procesarVarios(estadoVacio(), [
      crear,
      {
        version: VERSION_A2UI,
        updateComponents: {
          surfaceId: "principal",
          components: [
            { id: "root", component: "Column", children: ["a", "b"] },
            { id: "a", component: "Roto" },
            { id: "b", component: "Sano" },
          ],
        },
      },
    ]);

    const silencio = console.error;
    console.error = () => {}; // React y la frontera reportan el error por consola; aqui es esperado.
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    const raiz = createRoot(contenedor);
    try {
      await act(async () => {
        raiz.render(
          <Superficie superficie={estado.get("principal")} conversacionId="c" alAccionar={() => {}} />,
        );
      });
      const html = contenedor.innerHTML;
      expect(html).toContain("estoy bien");
      expect(html).toContain("Esta tarjeta no se pudo mostrar");
      // El motivo va a la consola, no a la pantalla de la persona.
      expect(html).not.toContain("prop con la forma equivocada");
      expect(html).not.toContain("Roto");
    } finally {
      await act(async () => raiz.unmount());
      console.error = silencio;
      limpiar();
    }
  });
});
