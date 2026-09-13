import { describe, expect, it } from "vitest";
import { cifraRespaldada, extraerCifras, quitarOracionesSinRespaldo, verificarCifras } from "../cifras";
import { salida } from "./mcp-falso";

/**
 * El verificador de cifras del texto. Los casos "malos" no son inventados: salen de las
 * portadas que estaban guardadas en la base el 2026-09-13, armadas con el modo anterior.
 */

describe("extraerCifras", () => {
  it("reconoce montos, porcentajes, puntajes y numeros sueltos", () => {
    const cifras = extraerCifras("Debes $47,386.00 (96.7 % de tu línea), tu puntaje es 39/100 y llevas 12 días de mora.");
    expect(cifras.map((c) => [c.tipo, c.valor, c.decimales])).toEqual([
      ["monto", 47386, 2],
      ["porcentaje", 96.7, 1],
      ["puntaje", 39, 0],
      ["numero", 12, 0],
    ]);
  });

  it("montos con 'mil' y 'millones', y 'pesos' despues", () => {
    expect(extraerCifras("unos 3.5 mil pesos")[0]).toMatchObject({ tipo: "monto", valor: 3500, decimales: -2 });
    expect(extraerCifras("$2.8 millones")[0]).toMatchObject({ tipo: "monto", valor: 2_800_000 });
    expect(extraerCifras("3,546 pesos")[0]).toMatchObject({ tipo: "monto", valor: 3546 });
  });

  it("no toma el dia de una fecha como cifra", () => {
    expect(extraerCifras("tu pago vence el 12 de octubre")).toEqual([]);
  });
});

describe("cifraRespaldada", () => {
  const hojas = [354600, 0.0672, 85, 2954065, 18];

  it("un monto en pesos contra centavos, con el redondeo que muestra el texto", () => {
    expect(cifraRespaldada(extraerCifras("$3,546")[0]!, hojas)).toBe(true);
    expect(cifraRespaldada(extraerCifras("$3,546.00")[0]!, hojas)).toBe(true);
    expect(cifraRespaldada(extraerCifras("$3,547")[0]!, hojas)).toBe(false);
  });

  it("un porcentaje contra una fraccion", () => {
    expect(cifraRespaldada(extraerCifras("6.7 %")[0]!, hojas)).toBe(true);
    expect(cifraRespaldada(extraerCifras("7%")[0]!, hojas)).toBe(true);
    expect(cifraRespaldada(extraerCifras("6.9 %")[0]!, hojas)).toBe(false);
  });

  it("el error de centavos del modo anterior: $2,954,065 cuando la tool dice 2954065 centavos", () => {
    // Es la conclusion guardada de Beto: el modelo leyo centavos como pesos. $29,540.65 si pasa.
    expect(cifraRespaldada(extraerCifras("$2,954,065")[0]!, hojas)).toBe(false);
    expect(cifraRespaldada(extraerCifras("$29,540.65")[0]!, hojas)).toBe(true);
  });

  it("conteos chicos y años pasan sin buscarse; un numero grande suelto se busca", () => {
    expect(cifraRespaldada(extraerCifras("3 meses")[0]!, [])).toBe(true);
    expect(cifraRespaldada(extraerCifras("en 2027")[0]!, [])).toBe(true);
    expect(cifraRespaldada(extraerCifras("a 18 meses")[0]!, hojas)).toBe(true);
    expect(cifraRespaldada(extraerCifras("a 48 meses")[0]!, hojas)).toBe(false);
  });
});

describe("verificarCifras con salidas reales", () => {
  const datosCarmen = [salida("usr_carmen", "detectar_fugas"), salida("usr_carmen", "diagnostico_salud_financiera"), salida("usr_carmen", "consultar_inversiones")];

  it("la conclusion correcta de Carmen pasa completa", () => {
    const v = verificarCifras(
      ["Tu salud financiera es excelente (85/100), tus suscripciones suman $3,546 al mes y tu portafolio vale $2,810,737.46."],
      datosCarmen,
    );
    expect(v).toEqual({ ok: true });
  });

  it("una cifra inventada se reporta con su texto", () => {
    const v = verificarCifras(["Podrías ahorrar $1,250 al mes si cancelas Adobe."], datosCarmen);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.noRespaldadas.map((c) => c.crudo)).toEqual(["$1,250"]);
  });

  it("lo que dijo la persona cuenta como fuente", () => {
    expect(verificarCifras(["Con $5,000 al mes llegarías antes."], [], ["¿y si ahorro 5,000 al mes?"]).ok).toBe(true);
  });
});

describe("quitarOracionesSinRespaldo", () => {
  it("quita solo la oracion con la cifra, sin partir en el punto decimal", () => {
    const [mala] = extraerCifras("$1,250");
    const texto = "Tu mensualidad es de $3,193.35 al mes. Podrías ahorrar $1,250 extra. Revisa tus suscripciones.";
    expect(quitarOracionesSinRespaldo(texto, [mala!])).toBe("Tu mensualidad es de $3,193.35 al mes. Revisa tus suscripciones.");
  });

  it("si no queda nada, undefined", () => {
    const [mala] = extraerCifras("$1,250");
    expect(quitarOracionesSinRespaldo("Ahorras $1,250.", [mala!])).toBeUndefined();
  });
});

describe("paraLaPersona", () => {
  it("nunca deja salir un detalle tecnico a la barra de Inicio", async () => {
    const { paraLaPersona } = await import("../linea");
    expect(paraLaPersona("la respuesta paso de 25 s y se corto")).toMatch(/tardó más de lo normal/);
    expect(paraLaPersona("no pude cambiar la tarjeta: widget \"plan\".parametros (plan_de_pago): no acepta saldoCentavos")).not.toMatch(/saldoCentavos/);
    expect(paraLaPersona("fetch failed ECONNREFUSED 127.0.0.1:3100")).toBe("Algo falló al consultar tus datos. Inténtalo de nuevo.");
  });
});
