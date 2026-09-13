import { describe, expect, it } from "vitest";
import { seguir } from "../estado";

/**
 * Los cinco componentes con control (slider o selector) guardan lo que la persona toca en
 * estado local, y eso esta bien: ir al agente por cada tick seria un turno por pixel. Pero
 * ese estado tiene que CEDER cuando el agente parchea la prop con `ajustar_pantalla`, o el
 * ajuste no se ve y la persona cree que no paso nada.
 *
 * Equivocarse aqui no truena nada: o el ajuste del agente se ignora, o el control se pega y
 * no se puede arrastrar. Por eso la decision es una funcion pura y tiene pruebas.
 */
describe("seguir", () => {
  it("mientras el agente no cambie, gana lo que toco la persona", () => {
    // El agente mando 18; la persona arrastro a 24.
    expect(seguir(18, 18, 24)).toEqual({ valor: 24, anterior: 18 });
  });

  it("cuando el agente cambia el valor, ese pisa al local", () => {
    // La persona estaba en 24 y el agente parchea a 36: gana 36.
    expect(seguir(36, 18, 24)).toEqual({ valor: 36, anterior: 36 });
  });

  it("recuerda el valor del agente para no volver a pisar en el render siguiente", () => {
    const primero = seguir(36, 18, 24);
    // Segundo render con la misma prop: la persona ya puede volver a mover el control.
    expect(seguir(36, primero.anterior, 30)).toEqual({ valor: 30, anterior: 36 });
  });

  it("el agente puede volver al valor que la persona ya habia tocado", () => {
    // Prop 18 -> 24 (la persona lo tenia en 24 por su cuenta): igual gana el del agente.
    expect(seguir(24, 18, 24)).toEqual({ valor: 24, anterior: 24 });
  });

  it("sirve para ids y para enums, no solo para numeros", () => {
    expect(seguir("optimista", "esperado", "pesimista")).toEqual({ valor: "optimista", anterior: "optimista" });
    expect(seguir("esperado", "esperado", "pesimista")).toEqual({ valor: "pesimista", anterior: "esperado" });
  });

  it("undefined es un valor como cualquier otro (una prop opcional que aparece)", () => {
    expect(seguir(12, undefined, undefined)).toEqual({ valor: 12, anterior: 12 });
    expect(seguir(undefined, undefined, 24)).toEqual({ valor: 24, anterior: undefined });
  });
});
