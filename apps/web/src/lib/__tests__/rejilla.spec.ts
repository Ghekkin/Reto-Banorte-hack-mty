import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { estadoVacio, procesarVarios, type MensajeA2UI } from "@maya/a2ui";
import { CATALOGO, anchoNatural } from "@maya/catalogo";
import { Lienzo } from "@/components/maya/lienzo";
import { clasesDePieza, tamanoDePieza } from "@/lib/rejilla";

/**
 * El acomodo del lienzo (`docs/algoritmos/acomodo-del-lienzo.md`).
 *
 * El caso que lo motivo es un turno REAL del agente, grabado el 2026-09-12 y guardado en
 * `fixtures/turno-beto-deudas.jsonl`: Beto pregunta "¿Cuánto debo entre mi tarjeta y mi
 * crédito de nómina?" y el agente arma `Column(ResumenTarjeta, ProyeccionPagoCredito)`,
 * las dos con `ancho: "amplio"`. La rejilla vieja veia UN hijo (el Column) y lo metia en una
 * columna: a 1,440 px las dos tarjetas medían 245 px, apiladas, con el resto vacío.
 *
 * El ancho real solo se mide en un navegador; lo que se prueba aqui es la decision: que
 * las tarjetas lleguen sueltas a la rejilla y con el tamano que les toca.
 */
function superficieDe(ruta: string) {
  const mensajes = readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
  const { estado, error } = procesarVarios(estadoVacio(), mensajes);
  expect(error).toBeUndefined();
  return estado.get("principal");
}

const TURNO_REAL = fileURLToPath(new URL("./fixtures/turno-beto-deudas.jsonl", import.meta.url));

describe("el tamano de cada pieza", () => {
  it("sale del ancho natural del componente, no del que copia el agente", () => {
    // El agente mando `ancho: "amplio"` a ResumenTarjeta; su ancho natural es normal.
    expect(tamanoDePieza("ResumenTarjeta", "amplio")).toBe("compacta");
    expect(tamanoDePieza("ProyeccionPagoCredito", "normal")).toBe("amplia");
    expect(tamanoDePieza("SimuladorMeta")).toBe("compacta");
    expect(tamanoDePieza("GastoPorCategoria")).toBe("amplia");
  });

  it("lo que no es tarjeta va en su propia fila; un Column anidado cuenta como amplia", () => {
    expect(tamanoDePieza("Text")).toBe("completa");
    expect(tamanoDePieza("Divider")).toBe("completa");
    expect(tamanoDePieza("Row")).toBe("completa");
    expect(tamanoDePieza("Column")).toBe("amplia");
  });

  it("un componente que el catalogo no conoce usa lo que diga el agente", () => {
    expect(tamanoDePieza("Inventado", "amplio")).toBe("amplia");
    expect(tamanoDePieza("Inventado")).toBe("compacta");
  });

  it("el ancho natural es exactamente el default del schema, en los 18", () => {
    for (const entrada of CATALOGO) {
      const json = z.toJSONSchema(entrada.schema, { io: "input" }) as { properties?: { ancho?: { default?: string } } };
      expect(anchoNatural(entrada.nombre), entrada.nombre).toBe(json.properties?.ancho?.default ?? "normal");
    }
  });
});

describe("las clases de cada pieza", () => {
  it("una sola tarjeta ocupa el lienzo entero", () => {
    expect(clasesDePieza("amplia", 1)).toContain("basis-full");
    expect(clasesDePieza("compacta", 1)).toContain("basis-full");
  });

  it("con dos o tres, cada una parte de su minimo y crece para llenar la fila", () => {
    expect(clasesDePieza("compacta", 2)).toContain("flex-[1_1_18rem]");
    expect(clasesDePieza("amplia", 3)).toContain("flex-[2_1_26rem]");
    // Nunca mas angosta que su minimo... salvo que el lienzo entero lo sea (un celular).
    expect(clasesDePieza("amplia", 2)).toContain("min-w-[min(100%,26rem)]");
  });

  it("con cuatro o mas, de dos en dos", () => {
    expect(clasesDePieza("compacta", 4)).toContain("flex-[1_1_calc(50%-0.5rem)]");
    expect(clasesDePieza("amplia", 5)).toContain("flex-[1_1_calc(50%-0.5rem)]");
  });

  it("lo que va en fila completa no cambia con el numero de tarjetas", () => {
    expect(clasesDePieza("completa", 3)).toBe(clasesDePieza("completa", 1));
  });
});

describe("el lienzo con el turno real que se veia apilado", () => {
  const html = renderToStaticMarkup(
    createElement(Lienzo, { superficie: superficieDe(TURNO_REAL), conversacionId: "c", alAccionar: () => {} }),
  );

  it("mide contra su propio ancho (container query), no contra la pantalla", () => {
    expect(html).toContain("@container/lienzo");
    expect(html).not.toMatch(/(?<![@\w/-])(md|xl):grid-cols/);
  });

  it("las dos tarjetas llegan sueltas a la rejilla, en orden y con su tamano", () => {
    const piezas = [...html.matchAll(/data-pieza="([^"]+)" data-tamano="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    expect(piezas).toEqual([
      ["resumen_tarjeta", "compacta"],
      ["credito_nomina", "amplia"],
    ]);
  });

  it("el Column del agente ya no envuelve a las tarjetas", () => {
    // `Column` pinta `flex flex-col gap-4`; si siguiera ahi, las dos irian apiladas.
    expect(html).not.toContain('class="flex flex-col gap-4"');
  });
});
