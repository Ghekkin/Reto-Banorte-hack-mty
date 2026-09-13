import { describe, expect, it } from "vitest";
import { agruparPorPeriodo, hoyEnZona, periodoDe, totalizar } from "@/lib/periodos";

/**
 * El agrupador por periodo de la seccion Movimientos.
 *
 * Lo que se prueba no es "que se vea bien": es que los rangos NO se traslapen (un
 * movimiento cae en exactamente un periodo) y que el orden de las comparaciones haga lo
 * que dice el doc, incluidos los dos casos que muerden: cuando el lunes de esta semana
 * cae en el mes anterior y cuando "Este mes" queda vacio.
 *
 * El algoritmo esta explicado en `docs/algoritmos/agrupacion-por-periodo.md`.
 */

/** Sabado. Su lunes es el 7 y la semana pasada arranca el 31 de agosto. */
const SABADO = "2026-09-12";
/** Domingo. Su lunes es el 14, asi que "Este mes" si tiene dias (del 1 al 6). */
const DOMINGO = "2026-09-20";

function movimiento(fecha: string, tipo: "cargo" | "abono" = "cargo", montoCentavos = 10000) {
  return { id: fecha + tipo + montoCentavos, fecha, tipo, montoCentavos };
}

describe("hoyEnZona", () => {
  it("devuelve AAAA-MM-DD en la zona pedida", () => {
    // 2026-09-13 03:00 UTC = 2026-09-12 21:00 en Monterrey: el dia NO es el de UTC.
    const instante = new Date("2026-09-13T03:00:00Z");
    expect(hoyEnZona(instante, "America/Monterrey")).toBe("2026-09-12");
    expect(hoyEnZona(instante, "UTC")).toBe("2026-09-13");
  });
});

describe("periodoDe", () => {
  it("hoy y ayer ganan sobre cualquier otro periodo", () => {
    expect(periodoDe(SABADO, SABADO)).toEqual({ clave: "hoy", etiqueta: "Hoy" });
    expect(periodoDe("2026-09-11", SABADO)).toEqual({ clave: "ayer", etiqueta: "Ayer" });
  });

  it("ayer sigue siendo ayer aunque pertenezca a la semana pasada", () => {
    // Lunes: su "ayer" es domingo, que cae en la semana anterior. Manda "Ayer".
    expect(periodoDe("2026-09-13", "2026-09-14")).toEqual({ clave: "ayer", etiqueta: "Ayer" });
  });

  it("esta semana arranca en lunes", () => {
    expect(periodoDe("2026-09-07", SABADO).clave).toBe("esta-semana");
    expect(periodoDe("2026-09-06", SABADO).clave).toBe("semana-pasada");
  });

  it("la semana pasada son los siete dias anteriores a ese lunes", () => {
    expect(periodoDe("2026-08-31", SABADO).clave).toBe("semana-pasada");
    expect(periodoDe("2026-08-30", SABADO).clave).toBe("mes-pasado");
  });

  it("la semana pasada puede caer en el mes anterior y gana sobre 'mes pasado'", () => {
    // 31 de agosto es del mes pasado Y de la semana pasada: se etiqueta por la semana,
    // que es la unidad mas cercana a lo que la persona recuerda.
    expect(periodoDe("2026-08-31", SABADO).etiqueta).toBe("Semana pasada");
  });

  it("este mes son los dias del mes que ya no caben en las dos semanas", () => {
    expect(periodoDe("2026-09-06", DOMINGO).clave).toBe("este-mes");
    expect(periodoDe("2026-09-07", DOMINGO).clave).toBe("semana-pasada");
  });

  it("este mes queda vacio cuando las dos semanas cubren el mes completo", () => {
    // Con hoy = sabado 12, la semana pasada empieza el 31 de agosto: no queda ningun
    // dia de septiembre suelto. El grupo simplemente no aparece.
    for (const dia of ["2026-09-01", "2026-09-03", "2026-09-06"]) {
      expect(periodoDe(dia, SABADO).clave).not.toBe("este-mes");
    }
  });

  it("mes pasado es el mes calendario anterior", () => {
    expect(periodoDe("2026-08-15", SABADO)).toEqual({ clave: "mes-pasado", etiqueta: "Mes pasado" });
  });

  it("los meses viejos se nombran, y llevan el anio solo si no es el de hoy", () => {
    expect(periodoDe("2026-07-04", SABADO)).toEqual({ clave: "mes-2026-07", etiqueta: "Julio" });
    expect(periodoDe("2025-11-04", SABADO)).toEqual({
      clave: "mes-2025-11",
      etiqueta: "Noviembre 2025",
    });
  });

  it("una fecha futura no se disfraza de hoy", () => {
    expect(periodoDe("2026-09-30", SABADO).clave).toBe("proximos");
  });

  it("cada fecha cae en exactamente un periodo", () => {
    // Un año hacia atras, dia por dia: ninguna fecha se queda sin clave y ninguna
    // clave aparece dos veces en el recorrido descendente.
    const claves: string[] = [];
    for (let i = 0; i < 365; i++) {
      const fecha = new Date(Date.UTC(2026, 8, 12) - i * 86_400_000).toISOString().slice(0, 10);
      const { clave, etiqueta } = periodoDe(fecha, SABADO);
      expect(etiqueta.length).toBeGreaterThan(0);
      if (claves.at(-1) !== clave) claves.push(clave);
    }
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("agruparPorPeriodo", () => {
  it("agrupa en orden, del periodo mas reciente al mas antiguo", () => {
    const grupos = agruparPorPeriodo(
      [movimiento("2026-07-04"), movimiento(SABADO), movimiento("2026-08-15"), movimiento("2026-09-11")],
      SABADO,
    );
    expect(grupos.map((g) => g.etiqueta)).toEqual(["Hoy", "Ayer", "Mes pasado", "Julio"]);
  });

  it("ordena la entrada: no confia en que llegue descendente", () => {
    const grupos = agruparPorPeriodo([movimiento("2026-07-04"), movimiento(SABADO)], SABADO);
    expect(grupos[0]!.etiqueta).toBe("Hoy");
  });

  it("el neto del grupo es abonos menos cargos", () => {
    const grupos = agruparPorPeriodo(
      [movimiento(SABADO, "cargo", 50000), movimiento(SABADO, "abono", 20000)],
      SABADO,
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.movimientos).toHaveLength(2);
    expect(grupos[0]!.netoCentavos).toBe(-30000);
  });

  it("sin movimientos no hay grupos", () => {
    expect(agruparPorPeriodo([], SABADO)).toEqual([]);
  });

  it("no pierde ni duplica movimientos", () => {
    const entrada = [
      movimiento(SABADO),
      movimiento("2026-09-11"),
      movimiento("2026-09-08"),
      movimiento("2026-09-02"),
      movimiento("2026-08-10"),
      movimiento("2026-06-01"),
    ];
    const grupos = agruparPorPeriodo(entrada, SABADO);
    expect(grupos.flatMap((g) => g.movimientos)).toHaveLength(entrada.length);
  });
});

describe("totalizar", () => {
  it("separa cargos de abonos", () => {
    expect(
      totalizar([
        movimiento(SABADO, "cargo", 74000),
        movimiento(SABADO, "cargo", 129000),
        movimiento(SABADO, "abono", 1850000),
      ]),
    ).toEqual({ gastadoCentavos: 203000, recibidoCentavos: 1850000 });
  });

  it("una lista vacia son dos ceros, no NaN", () => {
    expect(totalizar([])).toEqual({ gastadoCentavos: 0, recibidoCentavos: 0 });
  });
});
