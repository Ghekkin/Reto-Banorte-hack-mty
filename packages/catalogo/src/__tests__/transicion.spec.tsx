// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estadoVacio, procesarVarios, Superficie, type EstadoSuperficie, type MensajeA2UI } from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { registrarCatalogo } from "../index";
import { SimuladorMeta } from "../simulador-meta/componente";
import { DURACION_TRANSICION_MS, NumeroAnimado, interpolar, suavizar, usarValorAnimado, usarYaCambio, usarYaMontado } from "../transicion";

/**
 * La transición de valores (`transicion.ts`): al AJUSTARSE una tarjeta, sus números cuentan del
 * valor viejo al nuevo. Con DOM (happy-dom) y relojes falsos, porque todo pasa en
 * `requestAnimationFrame` después del render.
 *
 * Lo que se cuida: que no anime al montar (la entrada es de la tarjeta), que pase por valores
 * intermedios y termine EXACTO, que parta de donde va si llega otro valor, que "reducir
 * movimiento" salte, y que lo que mueve la persona con el slider no vaya detrás del dedo.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

registrarLayout();
registrarCatalogo();

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"] });
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contenedor.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Avanza el reloj cuadro a cuadro (16 ms), como el navegador. */
async function avanzar(ms: number) {
  for (let t = 0; t < ms; t += 16) await act(async () => vi.advanceTimersByTime(16));
}

function Sonda({ valor }: { valor: number | undefined }) {
  const visto = usarValorAnimado(valor);
  return createElement("output", null, visto === undefined ? "-" : String(visto));
}
const leer = () => contenedor.querySelector("output")?.textContent;
const pintarSonda = (valor: number | undefined) => act(async () => raiz.render(createElement(Sonda, { valor })));

describe("usarValorAnimado", () => {
  it("al montar devuelve el valor tal cual, sin animar", async () => {
    await pintarSonda(353397);
    expect(leer()).toBe("353397");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("al cambiar pasa por valores intermedios y termina exacto", async () => {
    await pintarSonda(100000);
    await pintarSonda(200000);
    expect(leer()).toBe("100000"); // el primer cuadro todavía es el viejo

    const vistos: number[] = [];
    for (let t = 0; t < DURACION_TRANSICION_MS + 64; t += 16) {
      await act(async () => vi.advanceTimersByTime(16));
      vistos.push(Number(leer()));
    }
    const intermedios = vistos.filter((v) => v > 100000 && v < 200000);
    expect(intermedios.length).toBeGreaterThan(5);
    // Siempre hacia adelante, en enteros (centavos), y termina en el destino exacto.
    expect(vistos).toEqual([...vistos].sort((a, b) => a - b));
    expect(vistos.every(Number.isInteger)).toBe(true);
    expect(vistos.at(-1)).toBe(200000);
    expect(vi.getTimerCount()).toBe(0); // no quedó un rAF colgado
  });

  it("si llega otro valor a media animación, parte de donde va", async () => {
    await pintarSonda(0 + 1000);
    await pintarSonda(101000);
    await avanzar(160);
    const aMedias = Number(leer());
    expect(aMedias).toBeGreaterThan(1000);
    expect(aMedias).toBeLessThan(101000);

    await pintarSonda(51000);
    await act(async () => vi.advanceTimersByTime(16));
    const siguiente = Number(leer());
    // No brincó a 1,000 ni a 101,000: sigue cerca de donde iba, ya rumbo a 51,000.
    expect(Math.abs(siguiente - aMedias)).toBeLessThan(Math.abs(101000 - aMedias));
    await avanzar(DURACION_TRANSICION_MS + 32);
    expect(leer()).toBe("51000");
  });

  it("con reducir movimiento salta directo, en el mismo render", async () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: consulta.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    await pintarSonda(100000);
    await pintarSonda(200000);
    expect(leer()).toBe("200000");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("que llegue el dato (esqueleto que se llena) no cuenta desde cero", async () => {
    await pintarSonda(undefined);
    expect(leer()).toBe("-");
    await pintarSonda(353397);
    expect(leer()).toBe("353397");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("limpia su rAF al desmontar a media animación", async () => {
    await pintarSonda(1);
    await pintarSonda(1000);
    await avanzar(48);
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => raiz.render(createElement("div")));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("interpolar y suavizar: extremos exactos, enteros si se pide", () => {
    expect(suavizar(0)).toBe(0);
    expect(suavizar(1)).toBe(1);
    expect(interpolar(100, 200, 0.5, true)).toBe(150);
    expect(interpolar(100, 201, 0.5, true)).toBe(151);
    expect(interpolar(100, 201, 0.5, false)).toBe(150.5);
    expect(interpolar(undefined, 200, 0.5, true)).toBe(200);
    expect(interpolar(100, 200, 1, true)).toBe(200);
  });

  it("usarYaCambio: apagado al montar y al llegar el dato; prendido desde el render del primer cambio", async () => {
    const vistos: Array<[string | undefined, boolean]> = [];
    function Curva({ firma }: { firma: string | undefined }) {
      vistos.push([firma, usarYaCambio(firma)]);
      return null;
    }
    const pintar = (firma: string | undefined) => act(async () => raiz.render(createElement(Curva, { firma })));
    await pintar(undefined);
    await pintar("20 meses");
    expect(vistos.at(-1)).toEqual(["20 meses", false]);
    await pintar("15 meses");
    // El render que ya trae los datos nuevos es el que prende la animación de Recharts.
    expect(vistos.filter(([f]) => f === "15 meses").at(-1)).toEqual(["15 meses", true]);
    await pintar("20 meses");
    expect(vistos.at(-1)).toEqual(["20 meses", true]);
  });

  it("NumeroAnimado cuenta en su propio texto y con formato", async () => {
    const pintar = (valor: number) =>
      act(async () => raiz.render(createElement("p", null, createElement(NumeroAnimado, { valor, formato: (m: number) => `${m} meses` }))));
    await pintar(20);
    expect(contenedor.textContent).toBe("20 meses");
    await pintar(15);
    await avanzar(96);
    const aMedias = Number(contenedor.textContent?.split(" ")[0]);
    expect(aMedias).toBeLessThan(20);
    expect(aMedias).toBeGreaterThan(15);
    await avanzar(DURACION_TRANSICION_MS);
    expect(contenedor.textContent).toBe("15 meses");
  });

  it("usarYaMontado: false en el primer render, true después", async () => {
    const vistos: boolean[] = [];
    function Monta() {
      const montado = usarYaMontado();
      vistos.push(montado);
      return null;
    }
    await act(async () => raiz.render(createElement(Monta)));
    expect(vistos[0]).toBe(false);
    expect(vistos.at(-1)).toBe(true);
  });
});

/* --- En las tarjetas ------------------------------------------------------------ */

const EJEMPLOS = join(import.meta.dirname, "../../ejemplos");
const leerJsonl = (ruta: string): MensajeA2UI[] =>
  readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);

async function pintarSuperficie(estado: Map<string, EstadoSuperficie>) {
  await act(async () =>
    raiz.render(createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} })),
  );
}

describe("ProyeccionPagoCredito se ajusta contando", () => {
  it("al ajustarse a la variante simulada, la mensualidad cuenta y la curva no se desmonta", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const base = procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "proyeccion-pago-credito.jsonl"))).estado;
    await pintarSuperficie(base);
    const texto = () => contenedor.textContent ?? "";
    expect(texto()).toContain("pagas $3,533.97 al mes");
    const tarjeta = contenedor.querySelector("[data-tarjeta]");

    const simulado = leerJsonl(join(EJEMPLOS, "variantes", "proyeccion-pago-credito-simulado.jsonl"));
    const datos = (simulado.find((m) => "updateDataModel" in m) as Extract<MensajeA2UI, { updateDataModel: unknown }>).updateDataModel.value as {
      credito: Record<string, unknown>;
    };
    const parches: MensajeA2UI[] = ["mensualidadCentavos", "plazoRestanteMeses", "totalInteresesEstimadosCentavos", "amortizacionResumen"].map(
      (k) => ({ version: "v0.9.1", updateDataModel: { surfaceId: "principal", path: `/credito/${k}`, value: datos.credito[k] } }),
    );
    await pintarSuperficie(procesarVarios(base, parches).estado);
    expect(texto()).toContain("pagas $3,533.97 al mes"); // primer cuadro: el viejo

    await avanzar(200);
    const aMedias = /pagas \$([\d,]+\.\d{2}) al mes/.exec(texto())?.[1];
    const valor = Number(aMedias?.replace(/,/g, ""));
    expect(valor).toBeGreaterThan(3533.97);
    expect(valor).toBeLessThan(4500);

    await avanzar(DURACION_TRANSICION_MS);
    expect(texto()).toContain("pagas $4,500.00 al mes");
    expect(texto()).toContain("15 meses restantes");
    expect(contenedor.querySelector("[data-tarjeta]")).toBe(tarjeta);
  });
});

describe("GastoPorCategoria se ajusta contando", () => {
  it("el total cuenta hasta el nuevo y la barra lleva la transición larga", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const base = procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "gasto-por-categoria.jsonl"))).estado;
    await pintarSuperficie(base);
    const total = () => contenedor.querySelector(".cifra")?.textContent;
    expect(total()).toBe("$33,349.50");
    expect(contenedor.querySelector('[data-slot="progress"]')?.className).toContain("[&_[data-slot=progress-indicator]]:duration-600");

    await pintarSuperficie(
      procesarVarios(base, [{ version: "v0.9.1", updateDataModel: { surfaceId: "principal", path: "/gasto/totalCentavos", value: 3534950 } }]).estado,
    );
    await avanzar(160);
    const aMedias = Number(total()?.replace(/[$,]/g, ""));
    expect(aMedias).toBeGreaterThan(33349.5);
    expect(aMedias).toBeLessThan(35349.5);
    await avanzar(DURACION_TRANSICION_MS);
    expect(total()).toBe("$35,349.50");
  });
});

describe("SimuladorMeta: la persona no interpola, el agente sí", () => {
  const props = {
    nombre: "Fondo de emergencia",
    metaCentavos: 9600000,
    saldoInicialCentavos: 4815000,
    aportacionMinimaCentavos: 50000,
    aportacionMaximaCentavos: 800000,
    fechaInicio: "2026-09-01",
    razon: "Una razon suficientemente larga",
  };
  const aportacionVista = () =>
    Array.from(contenedor.querySelectorAll("span")).find((s) => s.previousElementSibling?.textContent?.startsWith("Aportación"))?.textContent;
  const pintarSimulador = (aportacionCentavos: number) =>
    act(async () => raiz.render(createElement(SimuladorMeta, { ...props, aportacionCentavos })));

  it("mover el slider cambia la aportación en el mismo cuadro, sin contar", async () => {
    await pintarSimulador(265000);
    expect(aportacionVista()).toBe("$2,650.00");
    const perilla = contenedor.querySelector('input[type="range"]') as HTMLInputElement | null;
    expect(perilla, "no hay input del slider").toBeTruthy();
    await act(async () => {
      perilla!.focus();
      perilla!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    // Un paso del slider (se ajusta a la rejilla de $100 desde el mínimo): ya está en el
    // número nuevo en este mismo cuadro, sin un rAF de por medio.
    expect(aportacionVista()).toBe("$2,800.00");
    expect(vi.getTimerCount()).toBe(0);
    await avanzar(160);
    expect(aportacionVista()).toBe("$2,800.00");
  });

  it("cuando el agente cambia la aportación, cuenta y se ilumina", async () => {
    await pintarSimulador(265000);
    await pintarSimulador(400000);
    await avanzar(160);
    const aMedias = Number(aportacionVista()?.replace(/[$,]/g, ""));
    expect(aMedias).toBeGreaterThan(2650);
    expect(aMedias).toBeLessThan(4000);
    await avanzar(DURACION_TRANSICION_MS);
    expect(aportacionVista()).toBe("$4,000.00");
  });
});
