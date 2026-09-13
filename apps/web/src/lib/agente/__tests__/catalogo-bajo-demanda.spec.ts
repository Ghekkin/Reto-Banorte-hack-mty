import { describe, expect, it } from "vitest";
import { CATALOGO } from "@maya/catalogo";
import { crearCierre } from "../cierre";
import { herramientaVerComponentes } from "../componentes";
import type { ResultadoPintar } from "../pantalla";
import { detalleDeComponentes, systemPrompt } from "../prompt";

/**
 * El agente ligero (`FEATURE_AGENTE_LIGERO`): el system prompt lleva el catalogo como menu y
 * el detalle se pide con `ver_componentes`. Lo que tiene que seguir siendo cierto con menos
 * tokens: el modelo puede ELEGIR entre todos los componentes, y cuando pide uno recibe lo
 * mismo que antes veia para ese componente.
 */
describe("el catalogo como menu", () => {
  const completo = systemPrompt({ catalogo: "completo" });
  const menu = systemPrompt({ catalogo: "menu" });

  it("pesa menos de la mitad que el prompt completo", () => {
    expect(menu.length).toBeLessThan(completo.length / 2);
  });

  it("nombra TODOS los componentes del catalogo, para que elegir no dependa de pedir", () => {
    for (const entrada of CATALOGO) expect(menu).toContain(`**${entrada.nombre}**`);
  });

  it("dice que el detalle se pide con ver_componentes y trae Conclusion completa", () => {
    expect(menu).toContain("ver_componentes");
    expect(menu).toContain("## Conclusion, completa");
    // Solo el ejemplo de Conclusion; los otros 20 se piden.
    expect(menu).not.toContain("### gasto-por-categoria");
    expect(completo).toContain("### gasto-por-categoria");
  });

  it("es un prefijo estable: dos llamadas dan exactamente el mismo texto", () => {
    expect(systemPrompt({ catalogo: "menu" })).toBe(menu);
  });

  it("el default sigue siendo el completo, que es el que usa la portada del Inicio", () => {
    expect(systemPrompt()).toBe(completo);
  });
});

describe("ver_componentes", () => {
  it("devuelve las props con tipo y descripcion, y el ejemplo real del componente", () => {
    const detalle = detalleDeComponentes(["GastoPorCategoria"]);
    expect(detalle).toContain("**GastoPorCategoria**");
    expect(detalle).toMatch(/- categorias: array/);
    expect(detalle).toContain("### gasto-por-categoria");
  });

  it("un nombre que no existe no truena: dice cuales si existen", () => {
    const detalle = detalleDeComponentes(["PlanDePago", "TarjetaInventada"]);
    expect(detalle).toContain("**PlanDePago**");
    expect(detalle).toContain("No existen en el catalogo: TarjetaInventada");
    expect(detalle).toContain("ResumenTarjeta");
  });

  it("como tool, responde lo mismo que la funcion", async () => {
    const herramienta = herramientaVerComponentes();
    const salida = await herramienta.execute!({ nombres: ["Conclusion"] }, { toolCallId: "t1", messages: [] });
    expect(salida).toBe(detalleDeComponentes(["Conclusion"]));
  });
});

describe("la ayuda cuando la pantalla se rechaza", () => {
  const invalida = {
    razon: "Tu tarjeta esta al 97 % de su limite y eso te cuesta intereses",
    texto: "Te conviene un plan de pagos.",
    componentesJson: JSON.stringify([
      {
        id: "root",
        component: "Conclusion",
        titular: "Tu tarjeta ya te esta costando mucho",
        datos: [{ etiqueta: "Saldo", montoCentavos: 550320 }],
        razon: "Tu tarjeta esta al 97 % de su limite y eso te cuesta intereses",
      },
    ]),
    datosJson: "{}",
  };

  it("con ayudaParaErrores, el error trae las props del componente que fallo", async () => {
    const cierre = crearCierre(undefined, { ayudaParaErrores: () => detalleDeComponentes(["Conclusion"]) });
    const salida = (await cierre.herramientas.pintar_pantalla!.execute!(invalida, {
      toolCallId: "t1",
      messages: [],
    })) as ResultadoPintar;
    expect(salida.ok).toBe(false);
    if (salida.ok) return;
    expect(salida.errores.join(" ")).toContain("valor");
    expect(salida.ayuda).toContain("**Conclusion**");
  });

  it("sin la opcion, el error es el de siempre", async () => {
    const salida = (await crearCierre().herramientas.pintar_pantalla!.execute!(invalida, {
      toolCallId: "t1",
      messages: [],
    })) as ResultadoPintar;
    expect(salida.ok).toBe(false);
    expect("ayuda" in salida).toBe(false);
  });
});
