import { beforeEach, describe, expect, it } from "vitest";
import { SalidaCancelarSuscripcion, SalidaDetectarFugas } from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { cancelarSuscripcion } from "../tools/cancelar-suscripcion.js";
import { detectarFugas } from "../tools/detectar-fugas.js";

beforeEach(() => reiniciarEstado());

const LLAVE_1 = "c_prueba_sub:2026-09-13T01:00:00Z";
const LLAVE_2 = "c_prueba_sub:2026-09-13T02:00:00Z";

describe("detectar_fugas", () => {
  it("Ana: detecta sus 7 suscripciones activas por $1,869.00 al mes", async () => {
    const res = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_ana" }));

    expect(res.suscripciones).toHaveLength(7);
    expect(res.totalMensualCentavos).toBe(186900);
    expect(res.totalAnualCentavos).toBe(186900 * 12);
    expect(res.pctDelIngreso).toBeCloseTo(186900 / 3200000, 4);

    // Spotify desde 2022 lleva más de 50 meses activa
    const spotify = res.suscripciones.find((s) => s.id === "sus_ana_spotify");
    expect(spotify).toBeDefined();
    expect(spotify!.comercio).toBe("Spotify");
    expect(spotify!.mesesActiva).toBeGreaterThanOrEqual(50);
  });

  it("detecta servicios recurrentes no suscritos en la tabla de suscripciones", async () => {
    const res = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_ana" }));

    expect(res.recurrentesNoSuscritos.length).toBeGreaterThan(0);
    const comercios = res.recurrentesNoSuscritos.map((r) => r.comercio);
    expect(comercios).toContain("CFE");
    expect(comercios).toContain("Telmex");
    expect(comercios).toContain("Telcel");
  });

  it("Beto: SmartFit ya cancelada en CSV no aparece en suscripciones activas", async () => {
    const res = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_beto" }));

    expect(res.suscripciones).toHaveLength(2);
    const ids = res.suscripciones.map((s) => s.id);
    expect(ids).not.toContain("sus_beto_smartfit");
    expect(res.totalMensualCentavos).toBe(31800);
  });
});

describe("cancelar_suscripcion y el ciclo real", () => {
  it("el ciclo completo: 7 suscripciones -> cancelar HBO -> 6 suscripciones y menor gasto", async () => {
    // 1. Estado inicial de Ana
    const antes = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_ana" }));
    expect(antes.suscripciones).toHaveLength(7);
    expect(antes.totalMensualCentavos).toBe(186900);

    // 2. Cancelar HBO Max ($149.00 / 14900 centavos)
    const accion = SalidaCancelarSuscripcion.parse(
      await cancelarSuscripcion.manejar({
        usuarioId: "usr_ana",
        suscripcionId: "sus_ana_hbo",
        idempotencyKey: LLAVE_1,
      }),
    );

    expect(accion.aplicado).toBe(true);
    expect(accion.yaEstaba).toBe(false);
    expect(accion.suscripcion.concepto).toBe("HBO Max");
    expect(accion.efecto.ahorroMensualCentavos).toBe(14900);
    expect(accion.efecto.ahorroAnualCentavos).toBe(178800);
    expect(accion.efecto.suscripcionesRestantes).toBe(6);
    expect(accion.efecto.nuevoTotalMensualCentavos).toBe(172000);
    expect(accion.mensaje).toContain("$149.00 al mes");

    // 3. La lectura posterior refleja el cambio real
    const despues = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_ana" }));
    expect(despues.suscripciones).toHaveLength(6);
    expect(despues.totalMensualCentavos).toBe(172000);
    expect(despues.totalAnualCentavos).toBe(172000 * 12);
    expect(despues.suscripciones.some((s) => s.id === "sus_ana_hbo")).toBe(false);
  });

  it("idempotencia: la misma llave dos veces produce un solo cambio", async () => {
    const primera = SalidaCancelarSuscripcion.parse(
      await cancelarSuscripcion.manejar({
        usuarioId: "usr_ana",
        suscripcionId: "sus_ana_disney",
        idempotencyKey: LLAVE_1,
      }),
    );
    expect(primera.aplicado).toBe(true);
    expect(primera.yaEstaba).toBe(false);

    const segunda = SalidaCancelarSuscripcion.parse(
      await cancelarSuscripcion.manejar({
        usuarioId: "usr_ana",
        suscripcionId: "sus_ana_disney",
        idempotencyKey: LLAVE_1,
      }),
    );
    expect(segunda.aplicado).toBe(false);
    expect(segunda.yaEstaba).toBe(true);
  });

  it("si ya estaba cancelada (en CSV o estado), devuelve yaEstaba: true sin error", async () => {
    const res = SalidaCancelarSuscripcion.parse(
      await cancelarSuscripcion.manejar({
        usuarioId: "usr_beto",
        suscripcionId: "sus_beto_smartfit",
        idempotencyKey: LLAVE_2,
      }),
    );
    expect(res.aplicado).toBe(false);
    expect(res.yaEstaba).toBe(true);
    expect(res.mensaje).toMatch(/ya estaba cancelada/i);
  });

  it("trampa 2: rechaza cancelar una suscripción que pertenece a otro usuario", async () => {
    await expect(async () =>
      cancelarSuscripcion.manejar({
        usuarioId: "usr_ana",
        suscripcionId: "sus_carmen_sportsworld",
        idempotencyKey: LLAVE_1,
      }),
    ).rejects.toThrow(/no pertenece a usr_ana/);
  });

  it("falla si la suscripción no existe", async () => {
    await expect(async () =>
      cancelarSuscripcion.manejar({
        usuarioId: "usr_ana",
        suscripcionId: "sus_inexistente_123",
        idempotencyKey: LLAVE_1,
      }),
    ).rejects.toThrow(/no existe la suscripcion/);
  });
});
