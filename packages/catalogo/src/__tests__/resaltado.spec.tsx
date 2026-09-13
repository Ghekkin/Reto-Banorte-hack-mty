// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estadoVacio, procesarVarios, Superficie, type Accion, type MensajeA2UI } from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { registrarCatalogo } from "../index";
import { DURACION_RESALTADO_MS, cuentaComoCambio, usarCambio } from "../resaltado";

/**
 * Con DOM de verdad (happy-dom) porque lo que se prueba pasa DESPUES del primer render: el
 * resaltado que se enciende al cambiar una prop y se apaga solo, y el clic del boton con el
 * `context` que viaja al agente. `renderToStaticMarkup` no ve ni efectos ni clics.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contenedor.remove();
  vi.useRealTimers();
});

/** Pinta `"si"`/`"no"` segun `usarCambio(valor)`. */
function Sonda({ valor }: { valor: number | undefined }) {
  return createElement("output", null, usarCambio(valor) ? "si" : "no");
}

const leer = () => contenedor.querySelector("output")?.textContent;

describe("usarCambio", () => {
  it("no resalta al montar", async () => {
    await act(async () => raiz.render(createElement(Sonda, { valor: 353397 })));
    expect(leer()).toBe("no");
  });

  it("resalta al cambiar el valor y se apaga solo", async () => {
    vi.useFakeTimers();
    await act(async () => raiz.render(createElement(Sonda, { valor: 353397 })));
    await act(async () => raiz.render(createElement(Sonda, { valor: 450000 })));
    expect(leer()).toBe("si");

    await act(async () => vi.advanceTimersByTime(DURACION_RESALTADO_MS - 1));
    expect(leer()).toBe("si");
    await act(async () => vi.advanceTimersByTime(1));
    expect(leer()).toBe("no");
  });

  it("dos cambios seguidos cuentan desde el ultimo", async () => {
    vi.useFakeTimers();
    await act(async () => raiz.render(createElement(Sonda, { valor: 1 })));
    await act(async () => raiz.render(createElement(Sonda, { valor: 2 })));
    await act(async () => vi.advanceTimersByTime(1000));
    await act(async () => raiz.render(createElement(Sonda, { valor: 3 })));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(leer()).toBe("si");
    await act(async () => vi.advanceTimersByTime(DURACION_RESALTADO_MS - 1000));
    expect(leer()).toBe("no");
  });

  it("re-renderizar con el mismo valor no resalta", async () => {
    await act(async () => raiz.render(createElement(Sonda, { valor: 20 })));
    await act(async () => raiz.render(createElement(Sonda, { valor: 20 })));
    expect(leer()).toBe("no");
  });

  it("que llegue el dato (esqueleto que se llena) no es un cambio", async () => {
    await act(async () => raiz.render(createElement(Sonda, { valor: undefined })));
    await act(async () => raiz.render(createElement(Sonda, { valor: 20 })));
    expect(leer()).toBe("no");
  });

  it("limpia su temporizador al desmontar", async () => {
    vi.useFakeTimers();
    await act(async () => raiz.render(createElement(Sonda, { valor: 1 })));
    await act(async () => raiz.render(createElement(Sonda, { valor: 2 })));
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => raiz.render(createElement("div")));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cuentaComoCambio: solo de un valor a otro valor", () => {
    expect(cuentaComoCambio(1, 2)).toBe(true);
    expect(cuentaComoCambio(1, 1)).toBe(false);
    expect(cuentaComoCambio(undefined, 2)).toBe(false);
    expect(cuentaComoCambio(null, 2)).toBe(false);
    expect(cuentaComoCambio(2, undefined)).toBe(false);
  });
});

/* --- La tarjeta completa, con el motor A2UI: el parche y el clic ---------------- */

registrarLayout();
registrarCatalogo();

const EJEMPLOS = join(import.meta.dirname, "../../ejemplos");
const leerJsonl = (ruta: string): MensajeA2UI[] =>
  readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);

describe("ProyeccionPagoCredito en la superficie", () => {
  // happy-dom no mide: Recharts avisa que la grafica mide 0 px. La grafica no es lo que se prueba.
  beforeEach(() => void vi.spyOn(console, "warn").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("el parche de ajustar_pantalla resalta mensualidad, meses e intereses sin remontar la tarjeta", async () => {
    vi.useFakeTimers();
    const base = procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "proyeccion-pago-credito.jsonl"))).estado;
    const pintarSuperficie = (estado: typeof base) =>
      raiz.render(createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} }));

    await act(async () => pintarSuperficie(base));
    const tarjeta = contenedor.querySelector("[data-tarjeta]");
    expect(contenedor.querySelectorAll(".bg-tinte.rounded-md")).toHaveLength(0);

    // Lo que emite `ajustar_pantalla`: parches al data model, sin `createSurface`.
    const parches: MensajeA2UI[] = [
      { version: "v0.9.1", updateDataModel: { surfaceId: "principal", path: "/credito/mensualidadCentavos", value: 450000 } },
      { version: "v0.9.1", updateDataModel: { surfaceId: "principal", path: "/credito/plazoRestanteMeses", value: 15 } },
      { version: "v0.9.1", updateDataModel: { surfaceId: "principal", path: "/credito/totalInteresesEstimadosCentavos", value: 1103980 } },
    ];
    await act(async () => pintarSuperficie(procesarVarios(base, parches).estado));

    expect(contenedor.querySelector("[data-tarjeta]")).toBe(tarjeta); // la misma, no otra
    const resaltados = Array.from(contenedor.querySelectorAll(".bg-tinte.rounded-md"), (e) => e.textContent);
    expect(resaltados).toEqual(["15 meses restantes", "$4,500.00", "$11,039.80"]);

    await act(async () => vi.advanceTimersByTime(DURACION_RESALTADO_MS));
    expect(contenedor.querySelectorAll(".bg-tinte.rounded-md")).toHaveLength(0);
  });

  it("«Programar este pago» manda creditoId y mensualidadCentavos en el context", async () => {
    const { estado } = procesarVarios(
      estadoVacio(),
      leerJsonl(join(EJEMPLOS, "variantes", "proyeccion-pago-credito-simulado.jsonl")),
    );
    const acciones: Accion[] = [];
    await act(async () =>
      raiz.render(
        createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c_prueba", alAccionar: (a: Accion) => acciones.push(a) }),
      ),
    );
    const boton = Array.from(contenedor.querySelectorAll("button")).find((b) => b.textContent?.includes("Programar este pago"));
    expect(boton, "no hay boton de programar").toBeTruthy();
    await act(async () => boton!.click());

    expect(acciones).toHaveLength(1);
    expect(acciones[0]!.name).toBe("programar_abono_capital");
    expect(acciones[0]!.context).toMatchObject({ creditoId: "cred_nomina_01", mensualidadCentavos: 450000 });
    expect(acciones[0]!.context.idempotencyKey).toMatch(/^c_prueba:/);
  });
});
