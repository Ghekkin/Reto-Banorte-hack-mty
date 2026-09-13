// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  estadoVacio,
  obtener,
  procesarVarios,
  registrar,
  Superficie,
  type Accion,
  type EstadoSuperficie,
  type MensajeA2UI,
  type PropsComponente,
} from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { registrarCatalogo } from "../index";
import { DURACION_RESALTADO_MS } from "../resaltado";

/**
 * «Guardar gasto» con el motor A2UI de verdad: la tarjeta tiene UNA `action` (`ver_categoria`,
 * tocar una fila) y el boton dispara OTRA, `registrar_gasto_externo`. Eso solo pasa si
 * `registrarCatalogo()` declaro las acciones del componente (`definirAcciones`); un nombre que
 * el catalogo no declara se ignora. Con DOM (happy-dom) porque hay clics y temporizadores.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

registrarLayout();
registrarCatalogo();

const EJEMPLOS = join(import.meta.dirname, "../../ejemplos");
const leerJsonl = (ruta: string): MensajeA2UI[] =>
  readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);

let contenedor: HTMLDivElement;
let raiz: Root;
let acciones: Accion[];

beforeEach(() => {
  contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  acciones = [];
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contenedor.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function pintar(estado: Map<string, EstadoSuperficie>) {
  await act(async () =>
    raiz.render(
      createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c_prueba", alAccionar: (a: Accion) => acciones.push(a) }),
    ),
  );
}

const botonCon = (texto: string) => Array.from(contenedor.querySelectorAll("button")).find((b) => b.textContent?.includes(texto));

describe("GastoPorCategoria en la superficie: dos acciones", () => {
  it("«Guardar gasto» manda registrar_gasto_externo con los gastos sin guardar y el periodo", async () => {
    await pintar(procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "variantes", "gasto-por-categoria-simulado.jsonl"))).estado);
    const boton = botonCon("Guardar gasto");
    expect(boton, "no hay boton «Guardar gasto»").toBeTruthy();
    await act(async () => boton!.click());

    expect(acciones).toHaveLength(1);
    expect(acciones[0]!.name).toBe("registrar_gasto_externo");
    expect(acciones[0]!.context).toEqual({
      gastos: [{ nombre: "Apoyo a mi mamá", montoCentavos: 200000, frecuencia: "mensual" }],
      periodo: "2026-08",
      idempotencyKey: expect.stringMatching(/^c_prueba:/),
    });
  });

  it("tocar una fila del banco sigue mandando ver_categoria con su context declarado", async () => {
    await pintar(procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "variantes", "gasto-por-categoria-simulado.jsonl"))).estado);
    await act(async () => botonCon("Supermercado")!.click());
    expect(acciones[0]!.name).toBe("ver_categoria");
    expect(acciones[0]!.context).toMatchObject({ categoriaId: "cat_super", categoria: "Supermercado", periodo: "2026-08" });
  });

  it("la fila de fuera del banco no es boton", async () => {
    await pintar(procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "variantes", "gasto-por-categoria-simulado.jsonl"))).estado);
    const fila = contenedor.querySelector("[data-fuera-del-banco]");
    expect(fila?.tagName).toBe("DIV");
    expect(botonCon("Apoyo a mi mamá")).toBeUndefined();
  });

  it("un nombre de accion que el catalogo no declara se ignora", async () => {
    // Se envuelve el componente real para quedarse con el `alAccionar` que le da la superficie.
    const real = obtener("GastoPorCategoria")!;
    let alAccionar: PropsComponente["alAccionar"];
    const espia: ComponentType<PropsComponente> = (props) => {
      alAccionar = props.alAccionar;
      return createElement(real, props);
    };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    registrar("GastoPorCategoria", espia);
    try {
      await pintar(procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "gasto-por-categoria.jsonl"))).estado);
      await act(async () => alAccionar!({ todo: true }, "borrar_movimientos"));
      expect(acciones).toEqual([]);
      await act(async () => alAccionar!({ gastos: [] }, "registrar_gasto_externo"));
      expect(acciones.map((a) => a.name)).toEqual(["registrar_gasto_externo"]);
    } finally {
      registrar("GastoPorCategoria", real);
    }
  });
});

describe("GastoPorCategoria en la superficie: el parche se ve", () => {
  it("sumar un gasto de fuera resalta el total y la fila nueva, sin remontar la tarjeta", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const base = procesarVarios(estadoVacio(), leerJsonl(join(EJEMPLOS, "gasto-por-categoria.jsonl"))).estado;
    await pintar(base);
    const tarjeta = contenedor.querySelector("[data-tarjeta]");
    expect(contenedor.querySelectorAll(".bg-tinte")).toHaveLength(0);

    const gasto = (base.get("principal")!.dataModel as { gasto: { totalCentavos: number; categorias: object[] } }).gasto;
    const parches: MensajeA2UI[] = [
      {
        version: "v0.9.1",
        updateDataModel: {
          surfaceId: "principal",
          path: "/gasto/categorias",
          value: [...gasto.categorias, { nombre: "Apoyo a mi mamá", montoCentavos: 200000, fueraDelBanco: true, guardado: false, frecuencia: "mensual" }],
        },
      },
      { version: "v0.9.1", updateDataModel: { surfaceId: "principal", path: "/gasto/totalCentavos", value: gasto.totalCentavos + 200000 } },
    ];
    await pintar(procesarVarios(base, parches).estado);

    expect(contenedor.querySelector("[data-tarjeta]")).toBe(tarjeta);
    const resaltados = Array.from(contenedor.querySelectorAll(".bg-tinte"), (e) => e.textContent ?? "");
    expect(resaltados).toHaveLength(2);
    expect(resaltados[0]).toBe("$35,349.50");
    expect(resaltados[1]).toContain("Apoyo a mi mamá");

    await act(async () => vi.advanceTimersByTime(DURACION_RESALTADO_MS));
    expect(contenedor.querySelectorAll(".bg-tinte")).toHaveLength(0);
  });
});
