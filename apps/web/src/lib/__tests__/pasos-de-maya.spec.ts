import { describe, expect, it } from "vitest";
import type { LineaStream } from "@/lib/agente/tipos";
import { pasosDelTurno, textoDelPaso } from "@/lib/pasos-de-maya";

/**
 * Lo que Maya va haciendo, en vivo y para la persona (`lib/pasos-de-maya.ts`). Lo que importa:
 * que ningun texto sea tecnico, que el dato que pidio la persona se diga, y que un paso se
 * palomee solo cuando de verdad termino.
 */
describe("textoDelPaso", () => {
  it("dice lo que hace cada herramienta sin nombrarla", () => {
    expect(textoDelPaso("consultar_creditos")).toBe("Revisando tus créditos");
    expect(textoDelPaso("analizar_gasto", {})).toBe("Analizando en qué se te va el dinero");
    expect(textoDelPaso("pintar_pantalla")).toBe("Armando tu pantalla");
    expect(textoDelPaso("una_tool_nueva")).toBe("Revisando tus datos");
  });

  it("dice el dato que pidio la persona", () => {
    expect(textoDelPaso("simular_pago_credito", { mensualidadCentavos: 600000 })).toBe("Calculando tu crédito pagando $6,000.00 al mes");
    expect(textoDelPaso("simular_pago_credito", { plazoMeses: 12 })).toBe("Calculando tu crédito para liquidarlo en 12 meses");
    expect(textoDelPaso("simular_reestructura", { plazosMeses: [30] })).toBe("Calculando tu plan a 30 meses");
    expect(textoDelPaso("proyectar_ahorro", { fechaObjetivo: "2026-12-31" })).toBe("Proyectando tu meta para diciembre");
    expect(textoDelPaso("simular_gasto_externo", { gastos: [{ nombre: "Apoyo a mi mamá", montoCentavos: 200000 }] })).toBe(
      "Sumando «Apoyo a mi mamá» ($2,000.00) a tu mes",
    );
    expect(textoDelPaso("analizar_gasto", { periodo: "2026-07" })).toBe("Analizando tu gasto de julio");
  });

  it("ejecutar_decision dice que decision se aplica", () => {
    expect(textoDelPaso("ejecutar_decision", { accion: "programar_abono_capital", context: {} })).toBe("Programando tu pago");
    expect(textoDelPaso("ejecutar_decision", { accion: "otra" })).toBe("Aplicando tu decisión");
  });

  it("ningun texto de las tools conocidas tiene guion bajo ni nombre de tool", () => {
    for (const tool of ["panorama_inicial", "consultar_tarjeta", "detectar_fugas", "simular_rebalanceo", "ver_componentes", "ajustar_pantalla"]) {
      expect(textoDelPaso(tool)).not.toMatch(/_|tool|MCP/i);
    }
  });
});

describe("pasosDelTurno", () => {
  const paso = (id: string, texto: string): LineaStream => ({ tipo: "estado", valor: "consultando", paso: { id, texto } });
  const tool = (id: string, ok = true): LineaStream => ({ tipo: "tool", nombre: "x", ms: 10, ok, id });

  it("arranca entendiendo, aunque todavia no haya llegado nada", () => {
    expect(pasosDelTurno([])).toEqual([{ id: "entender", texto: "Entendiendo lo que necesitas", estado: "en-curso" }]);
  });

  it("entre herramientas, un renglon en curso que desaparece cuando llega la siguiente", () => {
    const entre = pasosDelTurno([paso("a", "Revisando tus créditos"), tool("a")]);
    expect(entre.at(-1)).toEqual({ id: "siguiente", texto: "Pensando cómo mostrártelo", estado: "en-curso" });
    const despues = pasosDelTurno([paso("a", "Revisando tus créditos"), tool("a"), paso("b", "Armando tu pantalla")]);
    expect(despues.some((p) => p.id === "siguiente")).toBe(false);
  });

  it("cada herramienta entra en curso y se palomea con su linea tool", () => {
    const pasos = pasosDelTurno([paso("a", "Revisando tus créditos"), paso("b", "Calculando tu crédito"), tool("a")]);
    expect(pasos.map((p) => [p.texto, p.estado])).toEqual([
      ["Entendiendo lo que necesitas", "listo"],
      ["Revisando tus créditos", "listo"],
      ["Calculando tu crédito", "en-curso"],
    ]);
  });

  it("una herramienta que fallo se marca, sin tumbar lo demas", () => {
    expect(pasosDelTurno([paso("a", "Revisando tu tarjeta"), tool("a", false)])[1]!.estado).toBe("fallo");
  });

  it("el paso de armar la pantalla se palomea cuando llega la interfaz", () => {
    const lineas: LineaStream[] = [paso("c", "Armando tu pantalla")];
    expect(pasosDelTurno(lineas).at(-1)!.estado).toBe("en-curso");
    lineas.push({ tipo: "a2ui", mensaje: { version: "v0.9.1", createSurface: { surfaceId: "principal", catalogId: "x" } } });
    lineas.push({ tipo: "fin", pasos: 2, ms: 3000 });
    expect(pasosDelTurno(lineas).every((p) => p.estado === "listo")).toBe(true);
  });

  it("un reintento con el mismo texto no repite el renglon", () => {
    const pasos = pasosDelTurno([paso("c1", "Armando tu pantalla"), paso("c2", "Armando tu pantalla")]);
    expect(pasos.filter((p) => p.texto === "Armando tu pantalla")).toHaveLength(1);
  });
});
