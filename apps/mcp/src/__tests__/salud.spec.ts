import { beforeEach, describe, expect, it } from "vitest";
import { SalidaDiagnosticoSaludFinanciera } from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { diagnosticoSaludFinanciera } from "../tools/diagnostico-salud-financiera.js";

/**
 * `diagnostico_salud_financiera`. Lo que se prueba no es que devuelva un numero: es
 * que los tres perfiles salgan en tres lugares distintos —critica, estable, sana— y
 * con tres tendencias distintas, porque de ahi sale que el agente construya tres
 * pantallas distintas.
 */
beforeEach(() => reiniciarEstado());

const diagnostico = async (usuarioId: string, extra: Record<string, unknown> = {}) =>
  SalidaDiagnosticoSaludFinanciera.parse(await diagnosticoSaludFinanciera.manejar({ usuarioId, ...extra }));

describe("diagnostico_salud_financiera", () => {
  it("Beto: critica y estancada, tres meses seguidos en 39", async () => {
    const salida = await diagnostico("usr_beto");
    expect(salida.periodo).toBe("2026-08");
    expect(salida.puntajeSalud).toBe(39);
    expect(salida.calificacion).toBe("critica");
    expect(salida.tendencia).toBe("estable");
    expect(salida.cambioVsMesAnterior).toBe(0);
    expect(salida.mesesFondoEmergencia).toBeLessThan(0.1);
  });

  it("Ana: estable pero cayendo nueve puntos en un mes", async () => {
    const salida = await diagnostico("usr_ana");
    expect(salida.puntajeSalud).toBe(74);
    expect(salida.calificacion).toBe("estable");
    expect(salida.tendencia).toBe("empeora");
    expect(salida.cambioVsMesAnterior).toBe(-9);
  });

  it("Carmen: sana y mejorando diez puntos", async () => {
    const salida = await diagnostico("usr_carmen");
    expect(salida.puntajeSalud).toBe(85);
    expect(salida.calificacion).toBe("sana");
    expect(salida.tendencia).toBe("mejora");
    expect(salida.cambioVsMesAnterior).toBe(10);
  });

  it("la serie trae seis meses por defecto y termina en el mes diagnosticado", async () => {
    const salida = await diagnostico("usr_ana");
    expect(salida.serie).toHaveLength(6);
    expect(salida.serie.at(-1)!.periodo).toBe("2026-08");
    expect(salida.serie.at(-1)!.puntajeSalud).toBe(74);
    // Ordenada del mas antiguo al mas reciente: es como se grafica.
    expect(salida.serie[0]!.periodo < salida.serie.at(-1)!.periodo).toBe(true);
  });

  it("un periodo pasado devuelve SU contexto, no el de hoy", async () => {
    const salida = await diagnostico("usr_ana", { periodo: "2026-04", mesesHistoria: 3 });
    expect(salida.periodo).toBe("2026-04");
    expect(salida.puntajeSalud).toBe(59);
    expect(salida.calificacion).toBe("fragil");
    // Venia de 84 en marzo: el mes del gasto fuerte se nota.
    expect(salida.cambioVsMesAnterior).toBe(-25);
    expect(salida.tendencia).toBe("empeora");
    expect(salida.serie).toHaveLength(3);
    expect(salida.serie.at(-1)!.periodo).toBe("2026-04");
  });

  it("el mes mas antiguo no inventa tendencia", async () => {
    const salida = await diagnostico("usr_beto", { periodo: "2025-10" });
    expect(salida.cambioVsMesAnterior).toBe(0);
    expect(salida.tendencia).toBe("estable");
    expect(salida.serie).toHaveLength(1);
  });

  it("un periodo que no existe falla diciendo cuales hay", async () => {
    await expect(diagnostico("usr_ana", { periodo: "2019-01" })).rejects.toThrow(/2025-10 a 2026-08/);
  });

  it("el ahorro negativo del mes malo viaja tal cual", async () => {
    const salida = await diagnostico("usr_beto", { periodo: "2026-06" });
    expect(salida.ahorroCentavos).toBeLessThan(0);
    expect(salida.tasaAhorroPct).toBeLessThan(0);
  });
});

describe("vigencia del habito detectado", () => {
  it("sin plan, el habito de Beto habla de su tarjeta y es cierto", async () => {
    const salida = await diagnostico("usr_beto");
    expect(salida.habito.texto).toMatch(/tarjeta/i);
    expect(salida.habito.vigente).toBe(true);
    expect(salida.habito.razonSiNoVigente).toBeNull();
  });

  /**
   * El caso que justifica el campo: el diagnostico es una foto mensual congelada. Tras
   * reestructurar, "traes tu tarjeta al 97 % de su limite" contradice la confirmacion
   * que el agente acaba de pintar.
   */
  it("despues de aplicar un plan, ese habito deja de ser vigente", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "test-salud-plan-1",
    });
    const salida = await diagnostico("usr_beto");
    expect(salida.habito.vigente).toBe(false);
    expect(salida.habito.razonSiNoVigente).toMatch(/plan de pago/i);
    // El puntaje NO se reescribe: es un dato de origen, no nos toca inventarlo.
    expect(salida.puntajeSalud).toBe(39);
  });

  it("el habito de Ana no depende de la tarjeta, asi que el plan de otro no lo toca", async () => {
    const salida = await diagnostico("usr_ana");
    expect(salida.habito.texto).toMatch(/fondo de emergencia/i);
    expect(salida.habito.vigente).toBe(true);
  });
});
