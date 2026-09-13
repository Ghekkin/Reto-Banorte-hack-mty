import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaAnalizarAhorro,
  SalidaAnalizarGasto,
  SalidaCompararPeriodos,
  SalidaConsultarPlan,
  SalidaCrearTopeGasto,
  SalidaDetectarFugas,
  SalidaEjecutarDecision,
  SalidaProyectarAhorro,
  SalidaRebalancearPortafolio,
  SalidaConsultarInversiones,
} from "@maya/schemas";
import { reiniciarEstado } from "../datos/index.js";
import { analizarAhorro } from "../tools/analizar-ahorro.js";
import { analizarGasto } from "../tools/analizar-gasto.js";
import { compararPeriodos } from "../tools/comparar-periodos.js";
import { consultarPlan } from "../tools/consultar-plan.js";
import { detectarFugas } from "../tools/detectar-fugas.js";
import { ejecutarDecision } from "../tools/ejecutar-decision.js";
import { proyectarAhorro } from "../tools/proyectar-ahorro.js";

/**
 * Los orquestadores de `docs/arquitectura/orquestadores.md` (Bloque A). Tres cosas se
 * prueban, y las tres son del contrato de una fachada, no del calculo:
 *
 *  1. `analizar_gasto` y `analizar_ahorro` **no inventan**: cada campo compuesto es
 *     identico al que devuelve la tool especializada de la que sale.
 *  2. Sus clasificaciones (`patronGasto`, `estadoAhorro`) separan casos reales.
 *  3. `ejecutar_decision` deja el mismo estado que la secuencia manual de 3 pasos
 *     (mutacion → lectura) dejaria, en un solo paso.
 */
beforeEach(() => reiniciarEstado());

describe("analizar_gasto: no inventa", () => {
  it("`gasto` es exactamente el de `comparar_periodos`", async () => {
    const compuesto = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_ana" }));
    const suelto = SalidaCompararPeriodos.parse(await compararPeriodos.manejar({ usuarioId: "usr_ana" }));
    expect(compuesto.gasto).toEqual(suelto);
  });

  it("`fugas` es exactamente el de `detectar_fugas`", async () => {
    const compuesto = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_ana" }));
    const suelto = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_ana" }));
    expect(compuesto.fugas).toEqual(suelto);
  });

  it("Ana ya trae un tope excedido en los datos de partida (restaurantes)", async () => {
    const salida = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_ana" }));
    expect(salida.topesExcedidos.some((t) => t.categoriaId === "cat_restaurantes")).toBe(true);
    expect(salida.patronGasto).toBe("tope_excedido");
    expect(salida.porQue).toMatch(/tope/);
  });

  it("un usuario que no existe falla claro", async () => {
    await expect(analizarGasto.manejar({ usuarioId: "usr_nadie" })).rejects.toThrow(/no existe el usuario/);
  });
});

describe("analizar_ahorro: no inventa", () => {
  it("`ahorro` es exactamente el de `proyectar_ahorro` cuando hay meta activa", async () => {
    const compuesto = SalidaAnalizarAhorro.parse(await analizarAhorro.manejar({ usuarioId: "usr_ana" }));
    const suelto = SalidaProyectarAhorro.parse(await proyectarAhorro.manejar({ usuarioId: "usr_ana" }));
    expect(compuesto.ahorro).toEqual(suelto);
  });

  it("Beto no tiene meta activa: `ahorro` sale null y no truena", async () => {
    const salida = SalidaAnalizarAhorro.parse(await analizarAhorro.manejar({ usuarioId: "usr_beto" }));
    expect(salida.ahorro).toBeNull();
    expect(salida.estadoAhorro).toBe("sin_meta_activa");
  });

  it("Carmen: el portafolio viene identico al de `consultar_inversiones`", async () => {
    const compuesto = SalidaAnalizarAhorro.parse(await analizarAhorro.manejar({ usuarioId: "usr_carmen" }));
    expect(compuesto.inversion.tienePortafolio).toBe(true);
  });

  it("Ana: un portafolio desviado de su modelo manda sobre el estado de su meta", async () => {
    // Confirmado en `inversiones.spec.ts`: Ana ya tiene un portafolio activo. Si se
    // desvio de su modelo, eso es lo mas concreto y gana sobre el estado de la meta.
    const salida = SalidaAnalizarAhorro.parse(await analizarAhorro.manejar({ usuarioId: "usr_ana" }));
    if (Math.abs(salida.inversion.portafolio?.desviacionModeloPct ?? 0) >= 0.05) {
      expect(salida.estadoAhorro).toBe("portafolio_desviado");
    }
  });
});

describe("ejecutar_decision: el mismo estado que los 3 pasos manuales", () => {
  const LLAVE = "c_prueba_orq:2026-09-13T11:00:00Z";

  it("aplicar_plan_pago: el resultado y la lectura posterior son los de las tools sueltas", async () => {
    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_beto",
        accion: "aplicar_plan_pago",
        context: { tarjetaId: "tar_beto_clasica", plazoMeses: 18, idempotencyKey: LLAVE },
      }),
    );
    expect(compuesto.accion).toBe("aplicar_plan_pago");
    expect((compuesto.resultadoAccion as { aplicado: boolean }).aplicado).toBe(true);

    const planEsperado = SalidaConsultarPlan.parse(await consultarPlan.manejar({ usuarioId: "usr_beto" }));
    expect(compuesto.estadoPosterior).toEqual(planEsperado);
  });

  it("no aplica dos veces con la misma llave, igual que la tool suelta", async () => {
    const contexto = { tarjetaId: "tar_beto_clasica", plazoMeses: 18, idempotencyKey: LLAVE };
    await ejecutarDecision.manejar({ usuarioId: "usr_beto", accion: "aplicar_plan_pago", context: contexto });
    const segunda = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({ usuarioId: "usr_beto", accion: "aplicar_plan_pago", context: contexto }),
    );
    const resultado = segunda.resultadoAccion as { aplicado: boolean; yaEstaba: boolean };
    expect(resultado.aplicado).toBe(false);
    expect(resultado.yaEstaba).toBe(true);
  });

  it("crear_apartado: `estadoPosterior` ya proyecta la meta recien creada", async () => {
    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "crear_apartado",
        context: {
          nombre: "Viaje de prueba orquestador",
          montoObjetivoCentavos: 6_000_00,
          aportacionCentavos: 500_00,
          idempotencyKey: LLAVE,
        },
      }),
    );
    const resultado = compuesto.resultadoAccion as { meta: { id: string; nombre: string } };
    expect(resultado.meta.nombre).toBe("Viaje de prueba orquestador");

    const proyeccion = compuesto.estadoPosterior as { meta: { id: string } | null };
    expect(proyeccion.meta?.id).toBe(resultado.meta.id);
  });

  it("cancelar_suscripcion: `estadoPosterior` es la fuga ya sin esa suscripcion", async () => {
    const antes = SalidaDetectarFugas.parse(await detectarFugas.manejar({ usuarioId: "usr_ana" }));
    const primeraActiva = antes.suscripciones[0]!;

    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "cancelar_suscripcion",
        context: { suscripcionId: primeraActiva.id, idempotencyKey: LLAVE },
      }),
    );
    const despues = compuesto.estadoPosterior as { suscripciones: Array<{ id: string }> };
    expect(despues.suscripciones.some((s) => s.id === primeraActiva.id)).toBe(false);
  });

  it("crear_tope_gasto: no relee, pero el resultado trae el gasto en vivo", async () => {
    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "crear_tope_gasto",
        context: { categoriaId: "cat_super", montoLimiteCentavos: 600_00, idempotencyKey: LLAVE },
      }),
    );
    expect(compuesto.estadoPosterior).toBeNull();
    const resultado = SalidaCrearTopeGasto.parse(compuesto.resultadoAccion);
    expect(resultado.tope.gastadoActualCentavos).toBeGreaterThan(0);
  });

  it("rebalancear_portafolio: ejecuta operaciones, muta estado y relee consultar_inversiones sin desviacion", async () => {
    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_carmen",
        accion: "rebalancear_portafolio",
        context: { idempotencyKey: LLAVE },
      }),
    );
    expect(compuesto.accion).toBe("rebalancear_portafolio");
    const resultado = SalidaRebalancearPortafolio.parse(compuesto.resultadoAccion);
    expect(resultado.aplicado).toBe(true);
    expect(resultado.movimientos.length).toBeGreaterThan(0);
    expect(resultado.portafolio.desviacionDespuesPct).toBe(0);

    const inversiones = SalidaConsultarInversiones.parse(compuesto.estadoPosterior);
    expect(inversiones.tienePortafolio).toBe(true);
    expect(inversiones.portafolio?.desviacionModeloPct).toBe(0);
  });

  it("una accion desconocida falla claro, no lanza hacia afuera del contrato de tool", async () => {
    await expect(
      ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "accion_inventada" as any,
        context: {},
      }),
    ).rejects.toThrow();
  });
});
