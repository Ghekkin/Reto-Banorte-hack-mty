import { describe, expect, it } from "vitest";
import { armarMensajes, entradaPintarPantalla, type EntradaPintarPantalla } from "../pantalla";
import salud46 from "./fixtures/pintar-salud-46.json";

/**
 * Issue #46: el paso final de la normalizacion (`quitarPropsNoDeclaradas`) dejaba cualquier prop de
 * sobra que se pareciera a una prop declarada que falta, para que la validacion la nombrara (#42).
 * En el ensayo del guion contra produccion (`108e722`, 2026-09-13 07:28) el modelo escribio
 * `salud: "Hola, Alberto"` en la `Conclusion` por `saludo`: la pantalla se rechazo y «Beto · simulador
 * de ahorro» pago un paso de mas.
 *
 * La regla ahora mira tambien el VALOR: un texto con un solo destino parecido se adopta; un numero,
 * arreglo u objeto del tipo de la prop parecida se deja para que la validacion lo nombre; y un valor
 * de otro tipo no es un error de dedo, se quita como cualquier prop de sobra.
 */

const entrada: EntradaPintarPantalla = {
  razon: "Tu fondo de emergencia te protege de un imprevisto sin volver a endeudarte",
  texto: "Empieza con lo que te cabe cada mes.",
  componentesJson: "[]",
};

type Armado = ReturnType<typeof armarMensajes>;

function componenteArmado(r: Armado, nombre: string): Record<string, unknown> {
  if (!r.ok) throw new Error(`se esperaba ok y vino: ${r.errores.join(" | ")}`);
  const mensaje = r.mensajes.find((m) => "updateComponents" in m) as { updateComponents: { components: Array<Record<string, unknown>> } };
  const comp = mensaje.updateComponents.components.find((c) => c.component === nombre);
  if (!comp) throw new Error(`no hay ${nombre} en la pantalla`);
  return comp;
}

const conclusion = (extra: Record<string, unknown>) => ({
  id: "conclusion",
  component: "Conclusion",
  razon: "Tu fondo de emergencia te protege de un imprevisto sin volver a endeudarte",
  titular: "Armar tu fondo de emergencia es posible con $1,500 al mes",
  detalle: "Si apartas $1,500 al mes llegas a tu fondo inicial sin descuidar tu plan.",
  ...extra,
});

describe("prop de sobra parecida a una declarada que falta (#46)", () => {
  it("la llamada real del ensayo (corrida_tools 3042): `salud` por `saludo` se adopta y la pantalla pasa a la primera", () => {
    const argumentos = entradaPintarPantalla.parse(salud46.argumentos);
    const r = armarMensajes(argumentos as EntradaPintarPantalla, { datosBase: salud46.datos as Record<string, unknown> });
    const comp = componenteArmado(r, "Conclusion");
    expect(comp.saludo).toBe("Hola, Alberto");
    expect(comp).not.toHaveProperty("salud");
  });

  it("un objeto no es error de dedo de una prop de texto: se quita como cualquier prop de sobra", () => {
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify([conclusion({ salud: { puntaje: 74, calificacion: "estable" } })]) });
    const comp = componenteArmado(r, "Conclusion");
    expect(comp).not.toHaveProperty("salud");
    expect(comp).not.toHaveProperty("saludo");
  });

  it("un numero tampoco: `salud: 74` se quita y no llega a `saludo`", () => {
    const comp = componenteArmado(armarMensajes({ ...entrada, componentesJson: JSON.stringify([conclusion({ salud: 74 })]) }), "Conclusion");
    expect(comp).not.toHaveProperty("salud");
    expect(comp).not.toHaveProperty("saludo");
  });

  it("si la prop real ya esta, el parecido sobra: se quita sin pisarla", () => {
    const comp = componenteArmado(
      armarMensajes({ ...entrada, componentesJson: JSON.stringify([conclusion({ saludo: "Hola, Ana", salud: "Hola, Alberto" })]) }),
      "Conclusion",
    );
    expect(comp.saludo).toBe("Hola, Ana");
    expect(comp).not.toHaveProperty("salud");
  });

  it("un enlace en el nombre parecido no se adopta ni se tira: la validacion lo nombra", () => {
    const r = armarMensajes({ ...entrada, componentesJson: JSON.stringify([conclusion({ salud: { path: "/perfil/saludo" } })]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain('la propiedad "salud" no existe');
  });
});
