import { describe, expect, it } from "vitest";
import { armarMensajes, revisarProps } from "@/lib/agente/pantalla";

/**
 * La validacion de props RESUELTAS.
 *
 * Hasta el 2026-09-12 `revisarProps` se saltaba toda prop enlazada (`{path}`) con el
 * argumento de que no se puede validar por valor. Como el modelo enlaza casi todo, en la
 * practica la mayoria de las props del catalogo no se validaban NUNCA, y ese fue el agujero
 * por el que pasaron los tres bugs de cifras de ese dia sin que nada dijera nada:
 *
 *  - una aportacion de $477 en un slider con piso de $500,
 *  - un `$457,09.50` donde iban $4,570.95,
 *  - y siete cifras de inversion que ninguna tool habia calculado.
 *
 * En `pintar_pantalla` el data model viene en la MISMA llamada, asi que no hay razon para no
 * resolver y validar completo. Lo que sigue fuera es una prop cuyo path resuelve a
 * `undefined`: path relativo de plantilla, o un dato que llegara despues.
 */

const RAZON = "Tu credito se puede liquidar en un año pagando $5,503.20 al mes";

/** Una pantalla minima con `Conclusion` como unica tarjeta. */
function pantalla(datos: Record<string, unknown>, props: Record<string, unknown>) {
  return armarMensajes({
    razon: RAZON,
    texto: "Te muestro la conclusion.",
    componentesJson: JSON.stringify([
      { id: "root", component: "Column", children: ["conclusion"] },
      { id: "conclusion", component: "Conclusion", razon: RAZON, ...props },
    ]),
    datosJson: JSON.stringify(datos),
  });
}

describe("revisarProps sobre valores resueltos", () => {
  it("caza un error dentro de un arreglo ENLAZADO, que antes era invisible", () => {
    const resultado = pantalla(
      // `datos` viene del data model, no literal: es el caso que no se validaba.
      { lectura: { titular: "Un titular suficientemente largo", datos: [{ etiqueta: "Sin cifra" }] } },
      { titular: { path: "/lectura/titular" }, datos: { path: "/lectura/datos" } },
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores.join(" ")).toContain("montoCentavos");
    }
  });

  it("acepta el mismo arreglo enlazado cuando el dato SI trae su cifra", () => {
    const resultado = pantalla(
      {
        lectura: {
          titular: "Un titular suficientemente largo",
          datos: [{ etiqueta: "Mensualidad", montoCentavos: 550320, tono: "neutro" }],
        },
      },
      { titular: { path: "/lectura/titular" }, datos: { path: "/lectura/datos" } },
    );

    expect(resultado.ok).toBe(true);
  });

  it("rechaza el monto escrito a mano en `valor`, y dice donde va", () => {
    const resultado = pantalla(
      {
        lectura: {
          titular: "Un titular suficientemente largo",
          // El destrozo real: 457095 centavos convertidos a pesos a mano.
          datos: [{ etiqueta: "Mensualidad actual", valor: "$457,09.50" }],
        },
      },
      { titular: { path: "/lectura/titular" }, datos: { path: "/lectura/datos" } },
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      const mensaje = resultado.errores.join(" ");
      expect(mensaje).toContain("escrito a mano");
      expect(mensaje).toContain("montoCentavos");
      expect(mensaje).toContain("Mensualidad actual");
    }
  });

  it("un `valor` que no es dinero pasa sin problema", () => {
    const resultado = pantalla(
      {
        lectura: {
          titular: "Un titular suficientemente largo",
          datos: [
            { etiqueta: "Retiros", valor: "+74%" },
            { etiqueta: "Salud", valor: "39/100" },
          ],
        },
      },
      { titular: { path: "/lectura/titular" }, datos: { path: "/lectura/datos" } },
    );

    expect(resultado.ok).toBe(true);
  });

  it("una prop enlazada a un path que NO existe se sigue omitiendo, no se inventa un error", () => {
    // `/lectura/datos` no esta en el data model: resuelve a `undefined`. Es el caso de un
    // path relativo de plantilla o de un dato que llega despues, y no debe tumbar la pantalla.
    const resultado = pantalla(
      { lectura: { titular: "Un titular suficientemente largo" } },
      { titular: { path: "/lectura/titular" }, datos: { path: "/lectura/datos" } },
    );

    expect(resultado.ok).toBe(true);
  });

  it("sin data model se comporta como antes: las props enlazadas se omiten", () => {
    const errores = revisarProps(
      {
        id: "conclusion",
        component: "Conclusion",
        razon: RAZON,
        titular: { path: "/lectura/titular" },
        datos: { path: "/lectura/datos" },
      },
      RAZON,
    );

    expect(errores).toEqual([]);
  });
});

describe("pintar_pantalla acepta el arreglo nativo y el texto JSON", () => {
  const COMPONENTES = [
    { id: "root", component: "Column", children: ["conclusion"] },
    { id: "conclusion", component: "Conclusion", razon: RAZON, titular: "Un titular suficientemente largo" },
  ];

  it("con `componentesJson` como ARREGLO nativo, que es lo que mando Gemini", () => {
    // El 2026-09-12, en el ensayo del guion, Gemini mando esto en el paso del simulador de
    // ahorro: el AI SDK rechazo la llamada y el turno gasto un paso reintentando una pantalla
    // que era perfectamente valida.
    const resultado = armarMensajes({
      razon: RAZON,
      texto: "Te muestro la conclusion.",
      componentesJson: COMPONENTES as never,
      datosJson: {} as never,
    });

    expect(resultado.ok).toBe(true);
  });

  it("y con los dos campos como texto, que es lo normal", () => {
    const resultado = armarMensajes({
      razon: RAZON,
      texto: "Te muestro la conclusion.",
      componentesJson: JSON.stringify(COMPONENTES),
      datosJson: "{}",
    });

    expect(resultado.ok).toBe(true);
  });

  it("mezclados: arreglo nativo y data model como texto", () => {
    const resultado = armarMensajes({
      razon: RAZON,
      texto: "Te muestro la conclusion.",
      componentesJson: [
        { id: "root", component: "Column", children: ["conclusion"] },
        { id: "conclusion", component: "Conclusion", razon: RAZON, titular: { path: "/lectura/titular" } },
      ] as never,
      datosJson: JSON.stringify({ lectura: { titular: "Un titular suficientemente largo" } }),
    });

    expect(resultado.ok).toBe(true);
  });

  it("con `componentesJson` como arreglo de strings JSON (doble serializacion)", () => {
    const resultado = armarMensajes({
      razon: RAZON,
      texto: "Te muestro la conclusion.",
      componentesJson: [
        JSON.stringify({ id: "root", component: "Column", children: ["conclusion"] }),
        JSON.stringify({ id: "conclusion", component: "Conclusion", razon: RAZON, titular: "Titular de prueba", detalle: "Detalle de prueba" }),
      ] as never,
      datosJson: "{}",
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const update = resultado.mensajes.find((m) => "updateComponents" in m);
      expect(update?.updateComponents?.components).toHaveLength(2);
      expect(typeof update?.updateComponents?.components[0]).toBe("object");
      expect(typeof update?.updateComponents?.components[1]).toBe("object");
    }
  });

  it("con `componentesJson` como arreglo de nombres de componentes ('Conclusion', 'ProyeccionPagoCredito')", () => {
    const resultado = armarMensajes({
      razon: RAZON,
      texto: "Si pagas $5,500 terminas en 12 meses.",
      componentesJson: ["Conclusion", "ProyeccionPagoCredito"] as never,
      datosJson: JSON.stringify({
        consultar_creditos: {
          creditos: [{ id: "cred_1", saldoActualCentavos: 4738600, tasaInteresAnual: 0.279, pagoMensualCentavos: 550000 }],
        },
      }),
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const update = resultado.mensajes.find((m) => "updateComponents" in m);
      expect(update?.updateComponents?.components.length).toBeGreaterThanOrEqual(2);
      for (const comp of update?.updateComponents?.components ?? []) {
        expect(typeof comp).toBe("object");
        expect(comp).not.toBeNull();
      }
    }
  });
});

describe("SimuladorMeta: el rango se valida aunque las props vengan enlazadas", () => {  function simulador(datos: Record<string, unknown>, props: Record<string, unknown>) {
    return armarMensajes({
      razon: "Tu capacidad mensual es de $6,629.05",
      texto: "Mueve la aportacion y ve cuando llegas.",
      componentesJson: JSON.stringify([
        { id: "root", component: "Column", children: ["meta"] },
        { id: "meta", component: "SimuladorMeta", razon: "Tu capacidad mensual es de $6,629.05", ...props },
      ]),
      datosJson: JSON.stringify(datos),
    });
  }

  const ENLACES = {
    metaCentavos: { path: "/meta/objetivo" },
    aportacionCentavos: { path: "/meta/aportacion" },
    aportacionMinimaCentavos: { path: "/meta/minima" },
    aportacionMaximaCentavos: { path: "/meta/maxima" },
  };

  it("caza la aportacion por debajo de su propio piso: el caso de la captura", () => {
    const resultado = simulador(
      { meta: { objetivo: 5578308, aportacion: 47700, minima: 50000, maxima: 662905 } },
      ENLACES,
    );

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.errores.join(" ")).toContain("fuera del rango del slider");
    }
  });

  it("acepta la misma pantalla con la aportacion dentro del rango", () => {
    const resultado = simulador(
      { meta: { objetivo: 5578308, aportacion: 200000, minima: 50000, maxima: 662905 } },
      ENLACES,
    );

    expect(resultado.ok).toBe(true);
  });
});

describe("ComparadorAntesDespues: normalización de props mínimas o emitidas por el modelo chico", () => {
  it("acepta ComparadorAntesDespues con id propio pero sin props obligatorias (caso exacto del error)", () => {
    const resultado = armarMensajes({
      razon: "Si pagas $5,500 terminas en 12 meses y ahorras intereses",
      texto: "Te conviene aumentar tu pago mensual.",
      componentesJson: JSON.stringify([
        { id: "root", component: "Column", children: ["conclusion", "comparacion_plazo"] },
        { id: "conclusion", component: "Conclusion" },
        { id: "comparacion_plazo", component: "ComparadorAntesDespues" },
      ]),
      datosJson: "{}",
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const update = resultado.mensajes.find((m) => "updateComponents" in m);
      const comps = update?.updateComponents?.components ?? [];
      const comparador = comps.find((c) => c.id === "comparacion_plazo");
      expect(comparador).toBeDefined();
      expect(comparador?.component).toBe("ComparadorAntesDespues");
      expect(typeof (comparador as Record<string, unknown>).titulo).toBe("string");
      expect(typeof (comparador as Record<string, unknown>).ahorroNetoCentavos).toBe("number");
      expect(typeof (comparador as Record<string, unknown>).escenarioActual).toBe("object");
      expect(typeof (comparador as Record<string, unknown>).escenarioEstrategia).toBe("object");
    }
  });

  it("utiliza las cifras de simular_credito cuando están en datosJson o datosBase", () => {
    const resultado = armarMensajes({
      razon: "Si pagas $5,500 terminas en 12 meses y ahorras intereses",
      texto: "Te conviene aumentar tu pago mensual.",
      componentesJson: JSON.stringify([
        { id: "conclusion", component: "Conclusion" },
        { id: "comparacion_plazo", component: "ComparadorAntesDespues" },
      ]),
      datosJson: JSON.stringify({
        simular_credito: {
          saldoInsolutoCentavos: 4738600,
          mensualidadActualCentavos: 480000,
          plazoRestanteActualMeses: 14,
          interesesActualesCentavos: 761832,
          mensualidadNuevaCentavos: 550000,
          plazoNuevoMeses: 12,
          interesesNuevosCentavos: 510000,
          ahorroInteresesCentavos: 251832,
          mesesQueAdelanta: 2,
        },
      }),
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      const update = resultado.mensajes.find((m) => "updateComponents" in m);
      const comps = update?.updateComponents?.components ?? [];
      const comparador = comps.find((c) => c.id === "comparacion_plazo") as Record<string, unknown>;
      expect(comparador.ahorroNetoCentavos).toBe(251832);
      expect(comparador.ahorroTiempoMeses).toBe(2);
      const act = comparador.escenarioActual as Record<string, unknown>;
      const est = comparador.escenarioEstrategia as Record<string, unknown>;
      expect(act.mensualidadCentavos).toBe(480000);
      expect(act.tiempoMeses).toBe(14);
      expect(est.mensualidadCentavos).toBe(550000);
      expect(est.tiempoMeses).toBe(12);
    }
  });
});

