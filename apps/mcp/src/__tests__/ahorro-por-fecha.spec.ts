import { beforeEach, describe, expect, it } from "vitest";
import { SalidaProyectarAhorro } from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { mesesHasta, proyectarAhorro } from "../tools/proyectar-ahorro.js";

/**
 * `proyectar_ahorro` con `fechaObjetivo`: «lo quiero para diciembre» con el `SimuladorMeta`
 * en pantalla (`docs/algoritmos/proyeccion-de-ahorro.md`).
 *
 * Cifras del volcado: hoy es 2026-09-12. La meta activa de Ana es su fondo de emergencia de
 * $96,000 con $48,150 ahorrados (faltan $47,850) y le quedan $4,986.17 libres al mes.
 */
beforeEach(() => reiniciarEstado());

const proyectar = (extra: Record<string, unknown>) =>
  SalidaProyectarAhorro.parse(proyectarAhorro.manejar({ usuarioId: "usr_ana", ...extra }));

describe("cuantos meses caben hasta la fecha", () => {
  it("el mayor M con hoy + M meses <= fecha", () => {
    expect(mesesHasta("2026-12-31")).toBe(3); // 2026-12-12 cabe; 2027-01-12 no
    expect(mesesHasta("2026-12-12")).toBe(3);
    expect(mesesHasta("2026-12-11")).toBe(2);
    expect(mesesHasta("2027-12-31")).toBe(15);
    expect(mesesHasta("2026-09-30")).toBe(0);
    expect(mesesHasta("2026-08-31")).toBe(0);
  });
});

describe("«lo quiero para diciembre»", () => {
  it("Ana: $15,950 al mes para llegar, 3 meses, y no le alcanza lo libre", () => {
    const salida = proyectar({ fechaObjetivo: "2026-12-31" });
    expect(salida.meta?.id).toBe("meta_base_ana_emergencia");
    expect(salida.faltanteCentavos).toBe(4785000);
    expect(salida.aportacionNecesariaCentavos).toBe(1595000);
    expect(salida.aportacionCentavos).toBe(1595000);
    expect(salida.mesesEstimados).toBe(3);
    expect(salida.fechaEstimada).toBe("2026-12-12");
    expect(salida.fechaEstimada <= "2026-12-31").toBe(true);
    expect(salida.aviso).toBe(
      "Para llegar al 31 de diciembre necesitas apartar $15,950.00 al mes, más de los $4,986.17 que te quedan libres al mes.",
    );
    // Los escenarios del slider salen de la aportacion que hace falta.
    expect(salida.escenarios.map((e) => e.aportacionCentavos)).toEqual([797500, 1595000, 2392500]);
    expect(salida.escenarios[1]!.cabeEnCapacidad).toBe(false);
  });

  it("con la meta nueva de $96,000 desde cero: $32,000 al mes", () => {
    const salida = proyectar({ montoObjetivoCentavos: 9600000, fechaObjetivo: "2026-12-31" });
    expect(salida.meta).toBeNull();
    expect(salida.aportacionNecesariaCentavos).toBe(3200000);
    expect(salida.mesesEstimados).toBe(3);
    expect(salida.aviso).toContain("$32,000.00");
  });

  it("una fecha lejana cabe en lo libre: sin aviso y la fecha estimada no se pasa", () => {
    const salida = proyectar({ fechaObjetivo: "2027-12-31" });
    expect(salida.aportacionNecesariaCentavos).toBe(319000);
    expect(salida.mesesEstimados).toBe(15);
    expect(salida.fechaEstimada).toBe("2027-12-12");
    expect(salida.aviso).toBeNull();
    expect(salida.escenarios[1]!.cabeEnCapacidad).toBe(true);
  });

  it("para cualquier fecha, la aportacion llega a tiempo y no sobra un mes", () => {
    for (const fecha of ["2026-10-31", "2026-11-15", "2027-01-31", "2027-06-30", "2028-02-29", "2030-12-31"]) {
      const salida = proyectar({ fechaObjetivo: fecha });
      expect(salida.fechaEstimada <= fecha, fecha).toBe(true);
      expect(salida.mesesEstimados, fecha).toBe(mesesHasta(fecha));
      // Un centavo menos al mes ya no llegaria.
      expect((salida.aportacionNecesariaCentavos! - 1) * salida.mesesEstimados, fecha).toBeLessThan(
        salida.faltanteCentavos,
      );
    }
  });

  it("quincenal: la mitad por quincena, y el aviso lo dice en los dos", () => {
    const salida = proyectar({ fechaObjetivo: "2026-12-31", frecuencia: "quincenal" });
    expect(salida.frecuencia).toBe("quincenal");
    expect(salida.aportacionNecesariaCentavos).toBe(797500);
    expect(salida.mesesEstimados).toBe(3);
    expect(salida.fechaEstimada <= "2026-12-31").toBe(true);
    expect(salida.aviso).toContain("$7,975.00 cada quincena ($15,950.00 al mes)");
  });

  it("si vienen fecha y aportacion, gana la fecha", () => {
    const conAmbas = proyectar({ fechaObjetivo: "2026-12-31", aportacionCentavos: 100000 });
    const soloFecha = proyectar({ fechaObjetivo: "2026-12-31" });
    expect(conAmbas).toEqual(soloFecha);
  });
});

describe("una fecha que no se puede", () => {
  it("una fecha que ya paso: no inventa aportacion, avisa y proyecta con lo libre", () => {
    const salida = proyectar({ fechaObjetivo: "2026-08-31" });
    expect(salida.aportacionNecesariaCentavos).toBeNull();
    expect(salida.aportacionCentavos).toBe(salida.capacidadMensualCentavos);
    expect(salida.capacidadMensualCentavos).toBe(498617);
    expect(salida.mesesEstimados).toBe(10);
    expect(salida.aviso).toBe(
      "El 31 de agosto ya pasó. La fecha más cercana posible es el 12 de octubre; con los $4,986.17 que te " +
        "quedan libres al mes llegarías el 12 de julio de 2027.",
    );
  });

  it("una fecha que no deja ni un mes", () => {
    const salida = proyectar({ fechaObjetivo: "2026-09-30" });
    expect(salida.aportacionNecesariaCentavos).toBeNull();
    expect(salida.aviso).toMatch(/^El 30 de septiembre no deja ni un mes para ahorrar/);
  });
});

describe("sin fecha, nada cambia", () => {
  it("la proyeccion de siempre, con los campos nuevos en null", () => {
    const salida = proyectar({});
    expect(salida.aportacionNecesariaCentavos).toBeNull();
    expect(salida.aviso).toBeNull();
    // La aportacion sugerida de su meta, como antes.
    expect(salida.aportacionCentavos).toBe(265000);
    expect(salida.mesesEstimados).toBe(19);
    expect(salida.fechaEstimada).toBe("2028-04-12");
  });

  it("«que sean $80,000» sigue siendo `montoObjetivoCentavos`, sin aviso", () => {
    const salida = proyectar({ montoObjetivoCentavos: 8000000, aportacionCentavos: 400000 });
    expect(salida.mesesEstimados).toBe(20);
    expect(salida.aportacionNecesariaCentavos).toBeNull();
    expect(salida.aviso).toBeNull();
  });
});
