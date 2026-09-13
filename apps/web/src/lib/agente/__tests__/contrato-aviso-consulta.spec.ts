import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvisoConsultaNoValida, CATALOGO } from "@maya/catalogo";
import { SalidaOrientarConsultaNoValida, TipoInvalidez } from "@maya/schemas";

/**
 * El contrato entre `orientar_consulta_no_valida` (packages/schemas) y el componente que la muestra
 * (`AvisoConsultaNoValida`, packages/catalogo). Los dos enums de `tipoInvalidez` viven en paquetes que
 * no dependen uno del otro, asi que esta prueba es la que los amarra: la web consume los dos.
 *
 * Por que importa: `pantalla.ts` copia `tipoInvalidez` del resultado de la tool al componente cuando
 * el modelo lo omite. Un valor que la tool puede devolver y el componente no acepta hace que el aviso
 * se rechace en cada intento (issue #41, el mismo sintoma que #40).
 */

const ETIQUETAS_ESPERADAS: Record<string, string> = {
  deuda_prioritaria: "Prioridad Financiera",
  producto_no_aplica: "Situación al Corriente",
  fuera_de_alcance: "Fuera de Catálogo Regulado",
  sin_datos_suficientes: "Información Adicional",
};

/** Una salida completa de la tool, tal como la arma el dominio del MCP. */
function salidaDeLaTool(tipoInvalidez: string) {
  return SalidaOrientarConsultaNoValida.parse({
    esValida: false,
    tipoInvalidez,
    titulo: "Consulta fuera del catálogo regulado Banorte",
    explicacion: "En Banorte operamos bajo regulación de la CNBV y Banco de México.",
    datoClave: "Productos supervisados por CNBV",
    alternativasSugeridas: ["Simular una meta de ahorro formal"],
    accionSugerida: { nombre: "ver_instrumento", etiqueta: "Ver fondos", context: { tipo: "deuda" } },
  });
}

const schemaDelComponente = CATALOGO.find((e) => e.nombre === "AvisoConsultaNoValida")!.schema;

/** Las props que el agente le pasa al componente con lo que devolvio la tool. */
function propsDelAviso(tipoInvalidez: string) {
  const { esValida: _esValida, ...salida } = salidaDeLaTool(tipoInvalidez);
  return { id: "aviso", component: "AvisoConsultaNoValida", razon: "Consulta no procedente", ...salida };
}

describe("contrato orientar_consulta_no_valida -> AvisoConsultaNoValida", () => {
  it("el componente acepta todo tipoInvalidez que puede devolver la tool", () => {
    const rechazados = TipoInvalidez.options.filter((valor) => {
      const { tipoInvalidez: _t, ...resto } = propsDelAviso("fuera_de_alcance");
      return !schemaDelComponente.safeParse({ ...resto, tipoInvalidez: valor }).success;
    });
    expect(rechazados).toEqual([]);
  });

  it("la salida completa de la tool, pasada como props, valida en el componente con cada tipo", () => {
    for (const valor of TipoInvalidez.options) {
      const validado = schemaDelComponente.safeParse(propsDelAviso(valor));
      expect(validado.success, `${valor}: ${validado.success ? "" : validado.error.message}`).toBe(true);
    }
  });

  it("el componente pinta cada tipo con su etiqueta en español", () => {
    for (const valor of TipoInvalidez.options) {
      const props = salidaDeLaTool(valor);
      const html = renderToStaticMarkup(
        createElement(AvisoConsultaNoValida, { ...props, razon: "Consulta no procedente", alAccionar: () => {} }),
      );
      expect(ETIQUETAS_ESPERADAS[valor], `${valor} no tiene etiqueta esperada`).toBeDefined();
      expect(html, valor).toContain(ETIQUETAS_ESPERADAS[valor]);
    }
  });
});
