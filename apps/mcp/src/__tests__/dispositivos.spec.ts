import { beforeEach, describe, expect, it } from "vitest";
import { SalidaAplicarPlanPago, SalidaConsultarPlan, SalidaConsultarTarjeta } from "@maya/schemas";
import { DISPOSITIVO_COMUN, conDispositivo, dispositivoActual, dispositivoValido, reiniciarEstado } from "../datos/index.js";
import { aplicarPlanPago } from "../tools/aplicar-plan-pago.js";
import { consultarPlan } from "../tools/consultar-plan.js";
import { consultarTarjeta } from "../tools/consultar-tarjeta.js";

/**
 * El estado mutable aislado por dispositivo (ADR 0012): lo que un visitante aplica no le
 * aparece a otro que abrio a la misma persona, y la misma llave de idempotencia en dos
 * dispositivos son dos acciones distintas.
 */
beforeEach(() => reiniciarEstado());

const JUEZ = "dis_juez000000001";
const OTRO = "dis_otro000000002";
const LLAVE = "inicio:2026-09-13T09:00:00.000Z";

const aplicar = () =>
  aplicarPlanPago.manejar({ usuarioId: "usr_beto", tarjetaId: "tar_beto_clasica", plazoMeses: 18, idempotencyKey: LLAVE });
const saldo = async () => SalidaConsultarTarjeta.parse(await consultarTarjeta.manejar({ usuarioId: "usr_beto" })).tarjeta!.saldoCentavos;
const hayPlan = async () => SalidaConsultarPlan.parse(await consultarPlan.manejar({ usuarioId: "usr_beto" })).hayPlan;

describe("dispositivoValido", () => {
  it("acepta lo que genera la web y manda todo lo demas a `comun`", () => {
    expect(dispositivoValido(JUEZ)).toBe(JUEZ);
    expect(dispositivoValido([JUEZ, OTRO])).toBe(JUEZ);
    expect(dispositivoValido(undefined)).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoValido("comun")).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoValido("dis_CORTO")).toBe(DISPOSITIVO_COMUN);
    expect(dispositivoValido("dis_000000000000'; drop table x")).toBe(DISPOSITIVO_COMUN);
  });

  it("fuera de una llamada, el dispositivo es `comun`", () => {
    expect(dispositivoActual()).toBe(DISPOSITIVO_COMUN);
  });
});

describe("una accion en un dispositivo", () => {
  it("cambia la lectura de ESE dispositivo y de ningun otro", async () => {
    const accion = SalidaAplicarPlanPago.parse(await conDispositivo(JUEZ, aplicar));
    expect(accion.aplicado).toBe(true);

    expect(await conDispositivo(JUEZ, saldo)).toBe(0);
    expect(await conDispositivo(JUEZ, hayPlan)).toBe(true);

    // Otro visitante que abre a Beto lo ve como estaba: tarjeta al limite, sin plan.
    expect(await conDispositivo(OTRO, saldo)).toBe(4738600);
    expect(await conDispositivo(OTRO, hayPlan)).toBe(false);
    // Y el estado comun (humo, scripts) tampoco se entero.
    expect(await saldo()).toBe(4738600);
  });

  it("la misma llave en dos dispositivos son dos acciones, y el reintento en uno no aplica dos veces", async () => {
    const primero = SalidaAplicarPlanPago.parse(await conDispositivo(JUEZ, aplicar));
    const reintento = SalidaAplicarPlanPago.parse(await conDispositivo(JUEZ, aplicar));
    const otro = SalidaAplicarPlanPago.parse(await conDispositivo(OTRO, aplicar));

    expect(primero.aplicado).toBe(true);
    expect(reintento.yaEstaba).toBe(true);
    expect(otro.aplicado).toBe(true);
    expect(otro.yaEstaba).toBe(false);
  });

  it("el dispositivo sobrevive a los `await` de la tool", async () => {
    const visto = await conDispositivo(JUEZ, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return dispositivoActual();
    });
    expect(visto).toBe(JUEZ);
  });
});
