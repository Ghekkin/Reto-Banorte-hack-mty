import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { procesarVarios } from "../procesar";
import { limpiar, registrar } from "../registro";
import { Superficie, type PiezaDeRaiz } from "../Superficie";
import { estadoVacio, VERSION_A2UI, type Componente, type MensajeA2UI } from "../tipos";

/**
 * `disponer`: quien aloja la superficie reparte las piezas de primer nivel.
 *
 * El caso que lo motivo, medido en el navegador el 2026-09-12: el agente armo
 * `Column(ResumenTarjeta, ProyeccionPagoCredito)` y el lienzo, que solo veia UN hijo (el
 * `Column`), lo metio en una columna de su rejilla. A 1,440 px las dos tarjetas quedaron
 * apiladas en 245 px de ancho con el resto de la pantalla vacio.
 */
const crear: MensajeA2UI = {
  version: VERSION_A2UI,
  createSurface: { surfaceId: "principal", catalogId: "https://ejemplo.test/catalogo/v1.json" },
};

function superficie(components: Componente[], datos: Record<string, unknown> = {}) {
  const { estado } = procesarVarios(estadoVacio(), [
    crear,
    { version: VERSION_A2UI, updateComponents: { surfaceId: "principal", components } },
    { version: VERSION_A2UI, updateDataModel: { surfaceId: "principal", path: "/", value: datos } },
  ]);
  return estado.get("principal");
}

function registrarPrueba() {
  limpiar();
  registrar("Column", ({ children }) => <div data-es="column">{children}</div>);
  registrar("Row", ({ children }) => <div data-es="row">{children}</div>);
  registrar("Tarjeta", (props) => <article>{String(props.titulo ?? "")}</article>);
}

describe("Superficie con disponer", () => {
  it("entrega los hijos de un Column raiz como piezas, en orden y sin el Column", () => {
    registrarPrueba();
    const recibidas: PiezaDeRaiz[] = [];
    const html = renderToStaticMarkup(
      <Superficie
        superficie={superficie([
          { id: "root", component: "Column", children: ["a", "b"] },
          { id: "a", component: "Tarjeta", titulo: "uno", ancho: "amplio" },
          { id: "b", component: "Tarjeta", titulo: "dos" },
        ])}
        conversacionId="c"
        alAccionar={() => {}}
        disponer={(piezas) => {
          recibidas.push(...piezas);
          return piezas.map((p) => (
            <section key={p.clave} data-pieza={p.id}>
              {p.nodo}
            </section>
          ));
        }}
      />,
    );

    expect(recibidas.map((p) => [p.id, p.componente, p.ancho])).toEqual([
      ["a", "Tarjeta", "amplio"],
      ["b", "Tarjeta", undefined],
    ]);
    expect(html).not.toContain('data-es="column"');
    expect(html).toMatch(/<section data-pieza="a">.*uno.*<\/section><section data-pieza="b">.*dos.*<\/section>/);
  });

  it("resuelve `ancho` contra el data model, igual que cualquier prop", () => {
    registrarPrueba();
    let anchos: Array<string | undefined> = [];
    renderToStaticMarkup(
      <Superficie
        superficie={superficie(
          [
            { id: "root", component: "Row", children: ["a"] },
            { id: "a", component: "Tarjeta", ancho: { path: "/ancho" } },
          ],
          { ancho: "amplio" },
        )}
        conversacionId="c"
        alAccionar={() => {}}
        disponer={(piezas) => {
          anchos = piezas.map((p) => p.ancho);
          return null;
        }}
      />,
    );
    expect(anchos).toEqual(["amplio"]);
  });

  it("una raiz que no es contenedor llega como unica pieza", () => {
    registrarPrueba();
    let ids: string[] = [];
    const html = renderToStaticMarkup(
      <Superficie
        superficie={superficie([{ id: "root", component: "Tarjeta", titulo: "sola" }])}
        conversacionId="c"
        alAccionar={() => {}}
        disponer={(piezas) => {
          ids = piezas.map((p) => p.id);
          return piezas.map((p) => <div key={p.clave}>{p.nodo}</div>);
        }}
      />,
    );
    expect(ids).toEqual(["root"]);
    expect(html).toContain("sola");
  });

  it("un Column anidado se entrega entero: solo la raiz se reparte", () => {
    registrarPrueba();
    let ids: string[] = [];
    const html = renderToStaticMarkup(
      <Superficie
        superficie={superficie([
          { id: "root", component: "Column", children: ["grupo", "c"] },
          { id: "grupo", component: "Column", children: ["a", "b"] },
          { id: "a", component: "Tarjeta", titulo: "uno" },
          { id: "b", component: "Tarjeta", titulo: "dos" },
          { id: "c", component: "Tarjeta", titulo: "tres" },
        ])}
        conversacionId="c"
        alAccionar={() => {}}
        disponer={(piezas) => {
          ids = piezas.map((p) => p.id);
          return piezas.map((p) => <div key={p.clave}>{p.nodo}</div>);
        }}
      />,
    );
    expect(ids).toEqual(["grupo", "c"]);
    expect(html).toContain('data-es="column"'); // el anidado sigue siendo un Column
  });

  it("sin disponer, la raiz se pinta tal cual", () => {
    registrarPrueba();
    const html = renderToStaticMarkup(
      <Superficie
        superficie={superficie([
          { id: "root", component: "Column", children: ["a"] },
          { id: "a", component: "Tarjeta", titulo: "uno" },
        ])}
        conversacionId="c"
        alAccionar={() => {}}
      />,
    );
    expect(html).toContain('data-es="column"');
  });
});
