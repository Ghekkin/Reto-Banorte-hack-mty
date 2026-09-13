import { describe, expect, it } from "vitest";
import { armarMensajes } from "../pantalla";

describe("normalización de AlertaFugas y componentes del catálogo", { timeout: 20000 }, () => {
  const base = {
    razon: "Detectamos gastos recurrentes para que puedas optimizar tu dinero.",
    texto: "Aquí tienes el desglose de tus suscripciones activas.",
  };

  it("repara AlertaFugas cuando las fugas traen 'monto' en vez de 'montoCentavos' (reporte de usuario)", () => {
    const componentes = [
      { id: "root", component: "Column", children: ["fugas_detalle", "concl"] },
      {
        id: "fugas_detalle",
        component: "AlertaFugas",
        fugas: [
          { id: "sus_netflix", concepto: "Netflix", comercio: "Netflix", monto: 21900, periodicidad: "mensual", sinUsoReciente: false },
          { id: "sus_gym", concepto: "Smart Fit", comercio: "Smart Fit", monto: 49900, periodicidad: "mensual", sinUsoReciente: true },
        ],
      },
      {
        id: "concl",
        component: "Conclusion",
        veredicto: "Puedes ahorrar cancelando el gimnasio que no has usado.",
      },
    ];

    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify(componentes),
    });

    if (!r.ok) console.log("Test 1 errores:", r.errores);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      const fugasComp = updateMsg.updateComponents.components.find((c) => c.component === "AlertaFugas");
      expect(fugasComp).toBeDefined();
      const fugas = fugasComp!.fugas as Array<Record<string, unknown>>;
      expect(fugas).toHaveLength(2);
      expect(fugas[0]!.montoCentavos).toBe(21900);
      expect(fugas[1]!.montoCentavos).toBe(49900);
      expect(fugasComp!.totalMensualCentavos).toBe(71800);
      expect(fugasComp!.totalAnualCentavos).toBe(71800 * 12);
    }
  });

  it("convierte montos en pesos (< 1000) a centavos y completa props faltantes", () => {
    const componentes = [
      {
        id: "fugas_detalle",
        component: "AlertaFugas",
        fugas: [
          { concepto: "Spotify", comercio: "Spotify", monto: 149 },
        ],
      },
    ];

    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify(componentes),
    });

    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      const fugasComp = updateMsg.updateComponents.components.find((c) => c.component === "AlertaFugas");
      expect(fugasComp).toBeDefined();
      const fugas = fugasComp!.fugas as Array<Record<string, unknown>>;
      expect(fugas[0]!.montoCentavos).toBe(14900);
      expect(fugas[0]!.id).toBeDefined();
      expect(fugas[0]!.periodicidad).toBe("mensual");
      expect(fugas[0]!.sinUsoReciente).toBe(false);
    }
  });

  it("recupera las suscripciones desde datosBase cuando fugas viene incompleto o vacío", () => {
    const datosBase = {
      detectar_fugas: {
        totalMensualCentavos: 186900,
        totalAnualCentavos: 2242800,
        pctDelIngreso: 0.05,
        suscripciones: [
          { id: "sus_ana_netflix", concepto: "Netflix", comercio: "Netflix", montoCentavos: 21900, sinUsoReciente: false, periodicidad: "mensual" },
          { id: "sus_ana_smartfit", concepto: "Smart Fit", comercio: "Smart Fit", montoCentavos: 49900, sinUsoReciente: true, periodicidad: "mensual" },
        ],
      },
    };

    const componentes = [
      {
        id: "fugas_detalle",
        component: "AlertaFugas",
      },
    ];

    const r = armarMensajes(
      {
        ...base,
        componentesJson: JSON.stringify(componentes),
      },
      { datosBase }
    );

    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      const fugasComp = updateMsg.updateComponents.components.find((c) => c.component === "AlertaFugas");
      expect(fugasComp).toBeDefined();
      const fugas = fugasComp!.fugas as Array<Record<string, unknown>>;
      expect(fugas.length).toBeGreaterThanOrEqual(2);
      expect(fugasComp!.totalMensualCentavos).toBe(186900);
    }
  });

  it("mantiene tanto AlertaFugas como Conclusion en la raíz cuando vienen juntas", () => {
    const componentes = [
      {
        id: "root",
        component: "Conclusion",
        veredicto: "Encontramos 7 suscripciones con posibles fugas.",
      },
      {
        id: "fugas_detalle",
        component: "AlertaFugas",
        fugas: [
          { id: "sus_1", concepto: "Gym", comercio: "Gym", montoCentavos: 50000, periodicidad: "mensual", sinUsoReciente: true },
        ],
      },
    ];

    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify(componentes),
    });

    if (!r.ok) console.log("Test 4 errores:", r.errores);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const updateMsg = r.mensajes.find((m) => "updateComponents" in m) as {
        updateComponents: { components: Array<Record<string, unknown>> };
      };
      // La raíz debe ser Column
      const raiz = updateMsg.updateComponents.components.find((c) => c.id === "root");
      expect(raiz).toBeDefined();
      expect(raiz!.component).toBe("Column");
      const children = raiz!.children as string[];
      // Ambos componentes deben ser hijos de la raíz
      expect(children).toContain("conclusion");
      expect(children).toContain("fugas_detalle");
    }
  });
});
