import { beforeEach, describe, expect, it } from "vitest";
import { SalidaPanoramaInicial } from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { consultarCreditos } from "../tools/consultar-creditos.js";
import { diagnosticoSaludFinanciera } from "../tools/diagnostico-salud-financiera.js";
import { panoramaInicial } from "../tools/panorama-inicial.js";

/**
 * `panorama_inicial`. Dos cosas se prueban aqui y las dos son del contrato, no del
 * calculo:
 *
 *  1. Que **no invente**: cada numero que devuelve tiene que ser identico al de la
 *     tool especializada de la que sale. Es una fachada, no una segunda opinion.
 *  2. Que `situacion` separe a los tres perfiles, y que cambie cuando la persona actua.
 */
beforeEach(() => reiniciarEstado());

const panorama = async (usuarioId: string) =>
  SalidaPanoramaInicial.parse(await panoramaInicial.manejar({ usuarioId }));

describe("no inventa: repite lo que dicen las tools especializadas", () => {
  it("la deuda es exactamente la de `consultar_creditos`", async () => {
    for (const usuarioId of ["usr_ana", "usr_beto", "usr_carmen"]) {
      const vista = await panorama(usuarioId);
      const detalle = await consultarCreditos.manejar({ usuarioId });
      const creditos = detalle as { deudaTotalCentavos: number; mensualidadTotalCentavos: number; ratioDeudaIngreso: number };
      expect(vista.deuda.totalCentavos).toBe(creditos.deudaTotalCentavos);
      expect(vista.deuda.mensualidadTotalCentavos).toBe(creditos.mensualidadTotalCentavos);
      expect(vista.deuda.ratioDeudaIngreso).toBe(creditos.ratioDeudaIngreso);
    }
  });

  it("el puntaje es exactamente el de `diagnostico_salud_financiera`", async () => {
    for (const usuarioId of ["usr_ana", "usr_beto", "usr_carmen"]) {
      const vista = await panorama(usuarioId);
      const detalle = (await diagnosticoSaludFinanciera.manejar({ usuarioId })) as {
        periodo: string;
        puntajeSalud: number;
        calificacion: string;
        tendencia: string;
      };
      expect(vista.salud).not.toBeNull();
      expect(vista.salud!.periodo).toBe(detalle.periodo);
      expect(vista.salud!.puntajeSalud).toBe(detalle.puntajeSalud);
      expect(vista.salud!.calificacion).toBe(detalle.calificacion);
      expect(vista.salud!.tendencia).toBe(detalle.tendencia);
    }
  });
});

describe("situacion: los tres perfiles caen en lugares distintos", () => {
  it("Beto: mora en la tarjeta, y la mora manda sobre todo lo demas", async () => {
    const salida = await panorama("usr_beto");
    expect(salida.situacion).toBe("deuda_critica");
    expect(salida.porQue).toMatch(/12 dias de mora/);
    expect(salida.tarjeta!.usoDelLimite).toBeGreaterThan(0.9);
  });

  it("Ana: sin tarjeta de credito y con margen", async () => {
    const salida = await panorama("usr_ana");
    expect(salida.tarjeta).toBeNull();
    expect(salida.situacion).toBe("estable_con_capacidad");
    expect(salida.capacidadPagoMensualCentavos).toBeGreaterThan(0);
  });

  it("Carmen: debe millones, pero ni su tarjeta ni su ratio la ponen en riesgo", async () => {
    const salida = await panorama("usr_carmen");
    expect(salida.deuda.totalCentavos).toBeGreaterThan(100_000_000);
    expect(salida.deuda.ratioDeudaIngreso).toBeLessThan(0.35);
    expect(salida.tarjeta!.usoDelLimite).toBeLessThan(0.5);
    expect(salida.situacion).toBe("estable_con_capacidad");
  });

  it("aplicar el plan mueve a Beto de critica a plan activo", async () => {
    expect((await panorama("usr_beto")).situacion).toBe("deuda_critica");

    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: "test-panorama-plan-1",
    });

    const despues = await panorama("usr_beto");
    expect(despues.situacion).toBe("plan_activo");
    expect(despues.porQue).toMatch(/18 meses/);
    expect(despues.tarjeta!.tienePlanActivo).toBe(true);
    expect(despues.tarjeta!.diasMora).toBe(0);
  });
});

describe("el perfil", () => {
  it("trae lo que el agente necesita para hablarle a la persona", async () => {
    const salida = await panorama("usr_beto");
    expect(salida.perfil.id).toBe("usr_beto");
    expect(salida.perfil.nombre).toContain("Alberto");
    expect(salida.perfil.segmento).toBe("nomina");
    expect(salida.perfil.ingresoMensualCentavos).toBe(3450000);
  });

  it("un usuario que no existe falla claro", async () => {
    await expect(panorama("usr_nadie")).rejects.toThrow(/no existe el usuario/);
  });
});
