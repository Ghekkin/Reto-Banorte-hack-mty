import { describe, expect, it } from "vitest";
import {
  SalidaAnalizarGasto,
  SalidaConsultarInversiones,
  SalidaConsultarSugerenciasInversion,
  SalidaProyectarAhorro,
} from "@maya/schemas";
import { analizarGasto } from "../tools/analizar-gasto.js";
import { consultarInversiones } from "../tools/consultar-inversiones.js";
import { consultarSugerenciasInversion } from "../tools/consultar-sugerencias-inversion.js";
import { proyectarAhorro } from "../tools/proyectar-ahorro.js";

/**
 * Los cuatro parametros que ya existian en el dominio y no estaban conectados.
 *
 * Todos son el mismo bug con distinta cara: el usuario podia pedir un cambio de parametro
 * ("comparalo con julio", "¿y si fuera agresivo?", "¿cuanto junto en 18 meses?") y no habia
 * por donde pedirlo, asi que el modelo contestaba de memoria. La matematica estaba; faltaba
 * el parametro.
 */
describe("analizar_gasto pasa sus parametros a las atomicas", () => {
  it("periodoAnterior compara contra el mes que se le pida, no siempre el anterior", async () => {
    const contraJulio = SalidaAnalizarGasto.parse(
      await analizarGasto.manejar({ usuarioId: "usr_ana", periodo: "2026-08", periodoAnterior: "2026-07" }),
    );
    const contraJunio = SalidaAnalizarGasto.parse(
      await analizarGasto.manejar({ usuarioId: "usr_ana", periodo: "2026-08", periodoAnterior: "2026-06" }),
    );

    expect(contraJulio.gasto.periodo).toBe("2026-08");
    expect(contraJulio.gasto.periodoAnterior).toBe("2026-07");
    expect(contraJunio.gasto.periodoAnterior).toBe("2026-06");
    // Mismo mes analizado, distinta base: lo gastado no cambia pero la comparacion si.
    expect(contraJunio.gasto.gastoCentavos).toBe(contraJulio.gasto.gastoCentavos);
    expect(contraJunio.gasto.gastoAnteriorCentavos).not.toBe(contraJulio.gasto.gastoAnteriorCentavos);
  });

  it("sin periodoAnterior sigue comparando contra el mes previo", async () => {
    const res = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_ana", periodo: "2026-08" }));
    expect(res.gasto.periodoAnterior).toBe("2026-07");
  });

  it("mesesSinUso llega hasta detectar_fugas", async () => {
    const corto = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_ana", mesesSinUso: 1 }));
    const largo = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_ana", mesesSinUso: 12 }));

    const sinUsoCorto = corto.fugas.suscripciones.filter((s) => s.sinUsoReciente).length;
    const sinUsoLargo = largo.fugas.suscripciones.filter((s) => s.sinUsoReciente).length;
    // Con un criterio mas exigente no puede haber MAS suscripciones marcadas sin uso.
    expect(sinUsoLargo).toBeLessThanOrEqual(sinUsoCorto);
  });
});

describe("consultar_inversiones con otro perfil", () => {
  it("devuelve el modelo del perfil pedido sin cambiar el perfil de la persona", async () => {
    const real = SalidaConsultarInversiones.parse(await consultarInversiones.manejar({ usuarioId: "usr_carmen" }));
    const hipotetico = SalidaConsultarInversiones.parse(
      await consultarInversiones.manejar({ usuarioId: "usr_carmen", perfil: "conservador" }),
    );

    expect(real.perfil!.tipo).toBe("agresivo");
    expect(real.perfilDelModelo).toBe("agresivo");
    expect(real.perfilEsHipotetico).toBe(false);

    // El perfil de Carmen NO cambia: lo que cambia es de quien es el modelo.
    expect(hipotetico.perfil!.tipo).toBe("agresivo");
    expect(hipotetico.perfilDelModelo).toBe("conservador");
    expect(hipotetico.perfilEsHipotetico).toBe(true);

    // Y el modelo conservador es otro reparto.
    expect(hipotetico.modeloRecomendado.length).toBeGreaterThan(0);
    expect(hipotetico.modeloRecomendado.map((m) => m.clave)).not.toEqual(real.modeloRecomendado.map((m) => m.clave));
  });

  it("pedir el perfil que ya tiene no lo marca como hipotetico", async () => {
    const res = SalidaConsultarInversiones.parse(
      await consultarInversiones.manejar({ usuarioId: "usr_carmen", perfil: "agresivo" }),
    );
    expect(res.perfilEsHipotetico).toBe(false);
  });
});

describe("proyectar_ahorro con horizonte", () => {
  it("contesta cuanto junta en N meses, que es la pregunta inversa", async () => {
    const res = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_ana", aportacionCentavos: 200000, horizonteMeses: 18 }),
    );

    expect(res.horizonteMeses).toBe(18);
    // $2,000 al mes por 18 meses, mas lo que ya lleva ahorrado en su meta.
    expect(res.montoAlcanzableCentavos).toBe(res.saldoInicialCentavos + 200000 * 18);
    expect(res.alcanzaEnElHorizonte).not.toBeNull();
  });

  it("quincenal cuenta el doble por mes, igual que en el resto de la tool", async () => {
    const mensual = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_ana", aportacionCentavos: 100000, horizonteMeses: 12 }),
    );
    const quincenal = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({
        usuarioId: "usr_ana",
        aportacionCentavos: 100000,
        horizonteMeses: 12,
        frecuencia: "quincenal",
      }),
    );

    const juntaMensual = mensual.montoAlcanzableCentavos! - mensual.saldoInicialCentavos;
    const juntaQuincenal = quincenal.montoAlcanzableCentavos! - quincenal.saldoInicialCentavos;
    expect(juntaQuincenal).toBe(juntaMensual * 2);
  });

  it("con horizonte y sin objetivo, el objetivo pasa a ser lo alcanzable", async () => {
    const res = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_beto", aportacionCentavos: 150000, horizonteMeses: 10 }),
    );

    expect(res.montoAlcanzableCentavos).toBe(1500000);
    expect(res.montoObjetivoCentavos).toBe(1500000);
    expect(res.alcanzaEnElHorizonte).toBe(true);
    expect(res.mesesEstimados).toBe(10);
  });

  it("dice que NO alcanza cuando el objetivo queda fuera del horizonte", async () => {
    const res = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({
        usuarioId: "usr_ana",
        montoObjetivoCentavos: 10000000,
        aportacionCentavos: 100000,
        horizonteMeses: 6,
      }),
    );

    expect(res.alcanzaEnElHorizonte).toBe(false);
    expect(res.mesesEstimados).toBeGreaterThan(6);
  });

  it("sin horizonte los campos nuevos van en null y nada mas cambia", async () => {
    const res = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_ana", montoObjetivoCentavos: 5000000 }),
    );

    expect(res.horizonteMeses).toBeNull();
    expect(res.montoAlcanzableCentavos).toBeNull();
    expect(res.alcanzaEnElHorizonte).toBeNull();
    expect(res.montoObjetivoCentavos).toBe(5000000);
  });
});

describe("consultar_sugerencias_inversion usa el horizonte", () => {
  it("descarta el instrumento que pide mas plazo del horizonte", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({ usuarioId: "usr_carmen", horizonteMeses: 2 }),
    );

    // El fondo de renta variable pide 360 dias y el horizonte son 60: no cabe.
    const rv = res.sugerencias.find((s) => s.id === "sug_fondo_rv_global");
    expect(rv).toBeDefined();
    expect(rv!.recomendado).toBe(false);
    expect(rv!.descripcion).toMatch(/No cabe en tu horizonte/);
  });

  it("con horizonte largo no descarta nada", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({ usuarioId: "usr_carmen", horizonteMeses: 120 }),
    );

    expect(res.sugerencias.every((s) => !s.descripcion.includes("No cabe en tu horizonte"))).toBe(true);
  });

  it("siempre queda una sugerencia recomendada, aunque el horizonte tumbe la principal", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({ usuarioId: "usr_ana", horizonteMeses: 1 }),
    );

    expect(res.sugerencias.some((s) => s.recomendado)).toBe(true);
  });

  it("sin horizonte las sugerencias quedan intactas", async () => {
    const res = SalidaConsultarSugerenciasInversion.parse(
      await consultarSugerenciasInversion.manejar({ usuarioId: "usr_ana" }),
    );

    expect(res.sugerencias.every((s) => !s.descripcion.includes("No cabe en tu horizonte"))).toBe(true);
    expect(res.sugerencias.find((s) => s.id === "sug_pagare_28d")!.recomendado).toBe(true);
  });
});
