import { describe, expect, it } from "vitest";
import {
  avanzarProgreso,
  etapaDeLinea,
  paraLaEspera,
  PROGRESO_INICIAL,
  segmentosDe,
  textoDeEtapa,
  type ProgresoDeConsulta,
} from "../etapas";
import type { LineaDeWidget } from "../linea";

/**
 * Las etapas que se ven mientras Maya contesta en Inicio (`PensandoMaya`). Lo que se cuida es
 * que NO mientan: que avancen solo con líneas reales del stream, en su orden, sin retroceder, y
 * que la barra nunca diga "listo" antes del `fin`.
 */
const fin: LineaDeWidget = {
  tipo: "fin",
  cierre: "modificar",
  widgetId: "credito",
  texto: "Listo",
  razon: "r",
  sugerencias: [],
  tools: ["simular_pago_credito"],
  ms: 4200,
  modelo: "m",
  auditoria: null,
  guardada: true,
};

function recorrer(lineas: LineaDeWidget[]): ProgresoDeConsulta[] {
  const pasos: ProgresoDeConsulta[] = [];
  let progreso = PROGRESO_INICIAL;
  for (const linea of lineas) {
    progreso = avanzarProgreso(progreso, linea);
    pasos.push(progreso);
  }
  return pasos;
}

describe("etapas de una pregunta a Inicio", () => {
  it("un turno que modifica una tarjeta pasa por las cinco etapas, en el orden del servidor", () => {
    const pasos = recorrer([
      { tipo: "estado", valor: "pensando" },
      { tipo: "estado", valor: "consultando" },
      { tipo: "tool", nombre: "simular_pago_credito", ms: 80, ok: true },
      { tipo: "estado", valor: "armando" },
      { tipo: "estado", valor: "verificando" },
      { tipo: "a2ui", mensaje: { version: "v0.9.1", updateComponents: { surfaceId: "principal", components: [] } } },
      fin,
    ]);
    expect(pasos.map((p) => p.etapa)).toEqual(["entendiendo", "consultando", "consultando", "armando", "verificando", "actualizando", "listo"]);
    expect(pasos.at(-2)?.tool).toBe("simular_pago_credito");
  });

  it("no avanza sin líneas: lo que se ve al enviar es «Entendiendo tu pregunta»", () => {
    expect(PROGRESO_INICIAL.etapa).toBe("entendiendo");
    expect(textoDeEtapa(PROGRESO_INICIAL.etapa, { conTarjeta: false })).toBe("Entendiendo tu pregunta");
    expect(segmentosDe(PROGRESO_INICIAL.etapa)).toEqual(["actual", "pendiente", "pendiente"]);
  });

  it("nunca retrocede: el reintento del modelo vuelve a mandar «pensando»", () => {
    const pasos = recorrer([
      { tipo: "tool", nombre: "consultar_creditos", ms: 40, ok: true },
      { tipo: "estado", valor: "pensando" },
      { tipo: "tool", nombre: "simular_pago_credito", ms: 40, ok: true },
    ]);
    expect(pasos.map((p) => p.etapa)).toEqual(["consultando", "consultando", "consultando"]);
    // Pero sí se queda con la última tool consultada.
    expect(pasos.at(-1)?.tool).toBe("simular_pago_credito");
  });

  it("una respuesta sin tools salta de entender a armar; la barra marca el punto, el texto lo que pasa", () => {
    const pasos = recorrer([{ tipo: "estado", valor: "pensando" }, { tipo: "estado", valor: "armando" }]);
    expect(pasos.at(-1)?.etapa).toBe("armando");
    expect(segmentosDe("armando")).toEqual(["hecho", "hecho", "actual"]);
    expect(textoDeEtapa("armando", { conTarjeta: false })).toBe("Preparando tu respuesta");
  });

  it("«listo» solo con fin o error", () => {
    for (const linea of [
      { tipo: "estado", valor: "verificando" },
      { tipo: "a2ui", mensaje: { version: "v0.9.1", updateComponents: { surfaceId: "principal", components: [] } } },
    ] as LineaDeWidget[]) {
      expect(etapaDeLinea(linea)).not.toBe("listo");
    }
    expect(etapaDeLinea(fin)).toBe("listo");
    expect(etapaDeLinea({ tipo: "error", mensaje: "x" })).toBe("listo");
    expect(segmentosDe("listo")).toEqual(["hecho", "hecho", "hecho"]);
  });

  it("verificar y actualizar siguen en el tercer segmento, sin darlo por hecho", () => {
    expect(segmentosDe("verificando")).toEqual(["hecho", "hecho", "actual"]);
    expect(segmentosDe("actualizando")).toEqual(["hecho", "hecho", "actual"]);
  });

  it("el texto dice qué cambia: con tarjeta, la tarjeta", () => {
    expect(textoDeEtapa("consultando", { conTarjeta: true })).toBe("Consultando tus datos");
    expect(textoDeEtapa("armando", { conTarjeta: true })).toBe("Preparando el cambio");
    expect(textoDeEtapa("verificando", { conTarjeta: true })).toBe("Verificando las cifras con el banco");
    expect(textoDeEtapa("actualizando", { conTarjeta: true })).toBe("Actualizando la tarjeta");
  });

  it("la espera se dice desde los 3 s, y desde los 12 s que tarda más de lo normal", () => {
    expect(paraLaEspera(0)).toBeUndefined();
    expect(paraLaEspera(2999)).toBeUndefined();
    expect(paraLaEspera(3000)).toBe("3 s");
    expect(paraLaEspera(11_999)).toBe("11 s");
    expect(paraLaEspera(12_400)).toBe("tarda más de lo normal · 12 s");
  });
});
