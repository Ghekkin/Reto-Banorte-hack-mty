import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaAplicarPlanPago,
  SalidaCompararPeriodos,
  SalidaConsultarPlan,
  SalidaConsultarTarjeta,
  SalidaCrearApartado,
  SalidaProyectarAhorro,
} from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { compararPeriodos } from "../tools/comparar-periodos.js";
import { consultarPlan } from "../tools/consultar-plan.js";
import { consultarTarjeta } from "../tools/consultar-tarjeta.js";
import { crearApartado } from "../tools/crear-apartado.js";
import { proyectarAhorro } from "../tools/proyectar-ahorro.js";

/**
 * El tercer paso del reto: la accion ocurre y **la lectura posterior devuelve otra
 * cosa**. Es la prueba de que el ciclo se cierra; sin esto, la feature es media feature.
 */
beforeEach(() => reiniciarEstado());

const LLAVE = "c_prueba:2026-09-13T01:00:00Z";

describe("aplicar_plan_pago: el ciclo completo", () => {
  it("antes de la accion no hay plan", async () => {
    const antes = SalidaConsultarPlan.parse(await consultarPlan.manejar({ usuarioId: "usr_beto" }));
    expect(antes.hayPlan).toBe(false);
    expect(antes.plan).toBeNull();
  });

  it("aplica, y la tarjeta queda en cero con el limite libre", async () => {
    const antes = SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_beto" }));
    expect(antes.tarjeta!.saldoCentavos).toBe(4738600);

    const accion = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({
        usuarioId: "usr_beto",
        tarjetaId: "tar_beto_clasica",
        plazoMeses: 18,
        idempotencyKey: LLAVE,
      }),
    );
    expect(accion.aplicado).toBe(true);
    expect(accion.yaEstaba).toBe(false);
    expect(accion.plan.mensualidadCentavos).toBe(319335);
    expect(accion.efecto.saldoRevolventeAntesCentavos).toBe(4738600);
    expect(accion.efecto.saldoRevolventeDespuesCentavos).toBe(0);
    expect(accion.efecto.interesesMensualesEvitadosCentavos).toBeGreaterThan(200000);

    const despues = SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_beto" }));
    expect(despues.tarjeta!.saldoCentavos).toBe(0);
    expect(despues.tarjeta!.usoDelLimite).toBe(0);
    expect(despues.tarjeta!.pagoMinimoCentavos).toBe(0);
    expect(despues.tarjeta!.diasMora).toBe(0);
    expect(despues.alerta).toBe("plan_activo");
    expect(despues.planActivo?.plazoMeses).toBe(18);
  });

  it("el calendario tiene un pago por mes y cierra en cero", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: LLAVE,
    });
    const plan = SalidaConsultarPlan.parse(await consultarPlan.manejar({ usuarioId: "usr_beto" }));
    expect(plan.hayPlan).toBe(true);
    expect(plan.calendario).toHaveLength(18);
    expect(plan.calendario.at(-1)!.saldoFinalCentavos).toBe(0);
    expect(plan.calendario[0]!.fecha).toBe(plan.plan!.primerPagoFecha);
    expect(plan.plan!.ultimoPagoFecha).toBe(plan.calendario.at(-1)!.fecha);
    // Un pago por mes, en orden.
    const fechas = plan.calendario.map((p) => p.fecha);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it("la misma llave dos veces aplica UN solo plan", async () => {
    const primera = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({
        usuarioId: "usr_beto",
        tarjetaId: "tar_beto_clasica",
        plazoMeses: 18,
        idempotencyKey: LLAVE,
      }),
    );
    const segunda = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({
        usuarioId: "usr_beto",
        tarjetaId: "tar_beto_clasica",
        plazoMeses: 18,
        idempotencyKey: LLAVE,
      }),
    );
    expect(primera.aplicado).toBe(true);
    expect(segunda.aplicado).toBe(false);
    expect(segunda.yaEstaba).toBe(true);
    expect(segunda.plan.plazoMeses).toBe(18);
  });

  it("no aplica un segundo plan con otra llave: avisa del que ya hay", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: LLAVE,
    });
    const otra = SalidaAplicarPlanPago.parse(
      await aplicarPlanPago.manejar({
        usuarioId: "usr_beto",
        tarjetaId: "tar_beto_clasica",
        plazoMeses: 36,
        idempotencyKey: "c_prueba:2026-09-13T02:00:00Z",
      }),
    );
    expect(otra.aplicado).toBe(false);
    expect(otra.plan.plazoMeses).toBe(18);
    expect(otra.mensaje).toMatch(/plan activo/);
  });

  it("la fase 2 ve el efecto del plan de la fase 1", async () => {
    await aplicarPlanPago.manejar({
      usuarioId: "usr_beto",
      tarjetaId: "tar_beto_clasica",
      plazoMeses: 18,
      idempotencyKey: LLAVE,
    });
    const gasto = SalidaCompararPeriodos.parse(
      await compararPeriodos.manejar({ usuarioId: "usr_beto", periodo: "2026-08" }),
    );
    expect(gasto.efectoDelPlan).not.toBeNull();
    expect(gasto.efectoDelPlan!.mensualidadDelPlanCentavos).toBe(319335);
    expect(gasto.efectoDelPlan!.interesesDelPeriodoCentavos).toBeGreaterThan(0);
  });
});

describe("crear_apartado y proyectar_ahorro", () => {
  it("Ana: proyecta su meta activa con lo que su flujo permite", async () => {
    const salida = SalidaProyectarAhorro.parse(await proyectarAhorro.manejar({ usuarioId: "usr_ana" }));
    expect(salida.meta).not.toBeNull();
    expect(salida.montoObjetivoCentavos).toBeGreaterThan(0);
    expect(salida.faltanteCentavos).toBe(salida.montoObjetivoCentavos - salida.saldoInicialCentavos);
    expect(salida.mesesEstimados).toBeGreaterThan(0);
    expect(salida.escenarios).toHaveLength(3);
    // Aportar mas tarda menos: el slider tiene que mover el numero en la direccion obvia.
    expect(salida.escenarios[2]!.mesesEstimados).toBeLessThan(salida.escenarios[0]!.mesesEstimados);
  });

  it("una aportacion mas grande adelanta la fecha", async () => {
    const lenta = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_ana", montoObjetivoCentavos: 1200000, aportacionCentavos: 100000 }),
    );
    const rapida = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_ana", montoObjetivoCentavos: 1200000, aportacionCentavos: 400000 }),
    );
    expect(lenta.mesesEstimados).toBe(12);
    expect(rapida.mesesEstimados).toBe(3);
    expect(rapida.fechaEstimada < lenta.fechaEstimada).toBe(true);
  });

  it("crea el apartado y la siguiente proyeccion ya lo toma como su meta", async () => {
    const creado = SalidaCrearApartado.parse(
      await crearApartado.manejar({
        usuarioId: "usr_ana",
        nombre: "Viaje a Japon",
        montoObjetivoCentavos: 6000000,
        aportacionCentavos: 500000,
        idempotencyKey: "c_prueba:2026-09-13T03:00:00Z",
      }),
    );
    expect(creado.aplicado).toBe(true);
    expect(creado.meta.mesesEstimados).toBe(12);
    expect(creado.meta.apartadoAutomatico).toBe(true);
    expect(creado.meta.cuentaOrigenId).toBe("cta_ana_ahorro");

    const proyeccion = SalidaProyectarAhorro.parse(
      await proyectarAhorro.manejar({ usuarioId: "usr_ana", metaId: creado.meta.id }),
    );
    expect(proyeccion.meta?.nombre).toBe("Viaje a Japon");
    expect(proyeccion.montoObjetivoCentavos).toBe(6000000);
  });

  it("no crea dos apartados con el mismo nombre", async () => {
    const entrada = {
      usuarioId: "usr_ana",
      nombre: "Fondo nuevo",
      montoObjetivoCentavos: 3000000,
      aportacionCentavos: 250000,
      idempotencyKey: "c_prueba:2026-09-13T04:00:00Z",
    };
    expect(SalidaCrearApartado.parse(await crearApartado.manejar(entrada)).aplicado).toBe(true);
    const segunda = SalidaCrearApartado.parse(
      await crearApartado.manejar({ ...entrada, idempotencyKey: "c_prueba:2026-09-13T05:00:00Z" }),
    );
    expect(segunda.aplicado).toBe(false);
    expect(segunda.yaEstaba).toBe(true);
  });

  it("rechaza una aportacion imposible", async () => {
    await expect(async () =>
      crearApartado.manejar({
        usuarioId: "usr_ana",
        nombre: "Meta absurda",
        montoObjetivoCentavos: 1000,
        aportacionCentavos: 500000,
        idempotencyKey: "c_prueba:2026-09-13T06:00:00Z",
      }),
    ).rejects.toThrow(/mayor que una sola aportacion/);
  });
});
