import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, VERSION_A2UI, type EstadoSuperficie, type MensajeA2UI } from "@maya/a2ui";
import {
  aplicarAPantallaAnterior,
  calcularSuperficieViva,
  colocarPantalla,
  numerarPantallas,
  pantallasAnteriores,
  SUPERFICIE,
  type EntradaDelHilo,
} from "@/lib/agente/usar-agente";

/**
 * El hilo guarda las pantallas de los turnos anteriores, y la del turno en curso se pinta
 * aparte hasta que se congela. Equivocarse aqui no rompe nada visiblemente: solo hace que
 * la misma pantalla aparezca dos veces, o que el turno en curso no se vea mientras se
 * arma. Por eso la decision es una funcion pura y tiene pruebas.
 */
function pantalla(titulo: string): EstadoSuperficie {
  const mensajes: MensajeA2UI[] = [
    { version: VERSION_A2UI, createSurface: { surfaceId: SUPERFICIE, catalogId: "x" } },
    {
      version: VERSION_A2UI,
      updateComponents: {
        surfaceId: SUPERFICIE,
        components: [{ id: "root", component: "Confirmacion", titulo, detalle: "d", razon: "una razon larga" }],
      },
    },
  ];
  const { estado } = procesarVarios(estadoVacio(), mensajes);
  return estado.get(SUPERFICIE)!;
}

const mensaje = (texto: string): EntradaDelHilo => ({ tipo: "mensaje", rol: "usuario", texto });
const congelada = (superficie: EstadoSuperficie): Extract<EntradaDelHilo, { tipo: "pantalla" }> => ({
  tipo: "pantalla",
  superficie,
  transparencia: [],
});

describe("calcularSuperficieViva", () => {
  it("sin nada congelado, la pantalla actual es la del turno en curso", () => {
    const uno = pantalla("primera");
    expect(calcularSuperficieViva([mensaje("hola")], uno)).toBe(uno);
  });

  it("la que ya se congelo NO se vuelve a pintar", () => {
    const uno = pantalla("primera");
    expect(calcularSuperficieViva([mensaje("hola"), congelada(uno)], uno)).toBeUndefined();
  });

  it("la del turno nuevo si se pinta, con la anterior ya en el hilo", () => {
    const uno = pantalla("primera");
    const dos = pantalla("segunda");
    const hilo = [mensaje("hola"), congelada(uno), mensaje("y ahora?")];
    expect(calcularSuperficieViva(hilo, dos)).toBe(dos);
  });

  it("mira la ULTIMA congelada, no la primera", () => {
    const uno = pantalla("primera");
    const dos = pantalla("segunda");
    const hilo = [congelada(uno), mensaje("otra cosa"), congelada(dos)];
    expect(calcularSuperficieViva(hilo, dos)).toBeUndefined();
    expect(calcularSuperficieViva(hilo, pantalla("tercera"))).toBeDefined();
  });

  it("un turno sin pantalla (prosa, error) no deja hueco ni tapa la anterior", () => {
    const uno = pantalla("primera");
    const hilo = [congelada(uno), mensaje("pregunta que no pinto nada")];
    // El estado del renderer sigue teniendo la de antes: no se pinta de nuevo.
    expect(calcularSuperficieViva(hilo, uno)).toBeUndefined();
  });

  it("el hilo vacio no pinta nada", () => {
    expect(calcularSuperficieViva([], undefined)).toBeUndefined();
  });
});

/**
 * Lo que hace que un ajuste se vea LIVE: la pantalla no se apila, se actualiza donde ya
 * estaba. Si se apilara, la version vieja quedaria congelada justo encima de la nueva.
 */
describe("colocarPantalla", () => {
  const uno = pantalla("primera");
  const dos = pantalla("segunda");

  it("un repintado apila la pantalla nueva al final", () => {
    const hilo = [mensaje("hola"), congelada(uno), mensaje("y ahora?")];
    const salida = colocarPantalla(hilo, congelada(dos), false);
    expect(salida).toHaveLength(4);
    expect(salida.at(-1)).toMatchObject({ tipo: "pantalla", superficie: dos });
  });

  it("un ajuste reemplaza la ultima pantalla y deja la conversacion intacta", () => {
    const hilo = [mensaje("¿en que gaste?"), congelada(uno), mensaje("muestrame julio")];
    const salida = colocarPantalla(hilo, congelada(dos), true);
    expect(salida).toHaveLength(3);
    // La pantalla sigue en su lugar, con los datos nuevos.
    expect(salida[1]).toMatchObject({ tipo: "pantalla", superficie: dos });
    expect(salida[0]).toEqual(hilo[0]);
    expect(salida[2]).toEqual(hilo[2]);
  });

  it("un ajuste mira la ULTIMA pantalla, no la primera", () => {
    const hilo = [congelada(uno), mensaje("otra cosa"), congelada(pantalla("segunda"))];
    const salida = colocarPantalla(hilo, congelada(dos), true);
    expect(salida[0]).toMatchObject({ superficie: uno });
    expect(salida[2]).toMatchObject({ superficie: dos });
  });

  it("un ajuste sin pantalla previa no se pierde: se agrega", () => {
    const salida = colocarPantalla([mensaje("hola")], congelada(dos), true);
    expect(salida).toHaveLength(2);
    expect(salida.at(-1)).toMatchObject({ tipo: "pantalla" });
  });

  it("no muta el hilo que recibe", () => {
    const hilo = [congelada(uno)];
    colocarPantalla(hilo, congelada(dos), true);
    expect(hilo[0]).toMatchObject({ superficie: uno });
  });
});

/**
 * "La actualiza donde esta": un ajuste puede ir a una pantalla de ARRIBA. El id es posicional
 * (`p1`, `p2`…) y tiene que ser estable, porque el agente lo recibe en un turno y lo usa en el
 * siguiente; y el parche tiene que caer en ESA pantalla, no en la actual.
 */
describe("pantallas anteriores", () => {
  const uno = pantalla("primera");
  const dos = pantalla("segunda");
  const tres = pantalla("tercera");

  it("numera solo las pantallas, desde la primera", () => {
    const hilo = [mensaje("hola"), congelada(uno), mensaje("otra"), congelada(dos)];
    expect(numerarPantallas(hilo)).toEqual([undefined, "p1", undefined, "p2"]);
  });

  it("manda las de arriba sin la actual, las mas recientes primero", () => {
    const hilo = [congelada(uno), mensaje("a"), congelada(dos), mensaje("b"), congelada(tres)];
    expect(pantallasAnteriores(hilo, "p3").map((p) => p.pantalla)).toEqual(["p2", "p1"]);
    // Con el arbol alcanzable desde la raiz, como la actual.
    expect(pantallasAnteriores(hilo, "p3")[0]!.arbol[0]).toMatchObject({ id: "root", component: "Confirmacion" });
  });

  it("como mucho tres", () => {
    const hilo = [1, 2, 3, 4, 5].map((n) => congelada(pantalla(`p${n}`)));
    expect(pantallasAnteriores(hilo, "p5").map((p) => p.pantalla)).toEqual(["p4", "p3", "p2"]);
  });

  it("un parche con pantalla cae en ESA y deja la ultima intacta", () => {
    const hilo = [congelada(uno), mensaje("y ahora?"), congelada(dos)];
    const salida = aplicarAPantallaAnterior(hilo, "p1", {
      version: VERSION_A2UI,
      updateDataModel: { surfaceId: SUPERFICIE, path: "/gasto", value: { periodo: "2026-07" } },
    });
    expect(salida).not.toBe(hilo);
    const cambiada = salida[0] as Extract<EntradaDelHilo, { tipo: "pantalla" }>;
    expect(cambiada.superficie.dataModel).toEqual({ gasto: { periodo: "2026-07" } });
    expect(salida[2]).toBe(hilo[2]);
    // La original no se muta: React necesita la referencia nueva para volver a pintar.
    expect(uno.dataModel).toEqual({});
  });

  it("un id que no existe deja el hilo igual", () => {
    const hilo = [congelada(uno)];
    const salida = aplicarAPantallaAnterior(hilo, "p9", {
      version: VERSION_A2UI,
      updateDataModel: { surfaceId: SUPERFICIE, path: "/x", value: 1 },
    });
    expect(salida).toBe(hilo);
  });
});
