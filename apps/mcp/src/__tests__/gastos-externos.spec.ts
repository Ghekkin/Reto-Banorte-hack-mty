import { beforeEach, describe, expect, it } from "vitest";
import {
  SalidaAnalizarGasto,
  SalidaCompararPeriodos,
  SalidaEjecutarDecision,
  SalidaPanoramaInicial,
  SalidaProyectarAhorro,
  SalidaRegistrarGastoExterno,
  SalidaSimularGastoExterno,
  type GastoExterno,
} from "@maya/schemas";
import { accionesDe, reiniciarEstado } from "../datos/index.js";
import { categoriaIdDe, normalizarNombre } from "../dominio/gastos-externos.js";
import { analizarGasto } from "../tools/analizar-gasto.js";
import { compararPeriodos } from "../tools/comparar-periodos.js";
import { ejecutarDecision } from "../tools/ejecutar-decision.js";
import { panoramaInicial } from "../tools/panorama-inicial.js";
import { proyectarAhorro } from "../tools/proyectar-ahorro.js";
import { registrarGastoExterno } from "../tools/registrar-gasto-externo.js";
import { simularGastoExterno } from "../tools/simular-gasto-externo.js";

/**
 * Gastos fuera del banco: `simular_gasto_externo` y `registrar_gasto_externo`
 * (`docs/algoritmos/gastos-fuera-del-banco.md`).
 *
 * Cifras del volcado: el ultimo mes cerrado es 2026-08. Beto gasto $33,349.50 con $6,613.71 de
 * capacidad de pago libre y $1,525.50 de capacidad de ahorro; Ana $31,410.50, $6,629.05 y
 * $4,986.17.
 */
beforeEach(() => reiniciarEstado());

const RENTA: GastoExterno = { nombre: "Renta", montoCentavos: 350000, frecuencia: "mensual" };
const MAMA: GastoExterno = { nombre: "Apoyo a mi mamá", montoCentavos: 200000, frecuencia: "mensual" };

const simular = async (usuarioId: string, gastos: GastoExterno[], periodo?: string) =>
  SalidaSimularGastoExterno.parse(await simularGastoExterno.manejar({ usuarioId, gastos, periodo }));

const registrar = async (usuarioId: string, gastos: GastoExterno[], idempotencyKey: string, periodo?: string) =>
  SalidaRegistrarGastoExterno.parse(await registrarGastoExterno.manejar({ usuarioId, gastos, idempotencyKey, periodo }));

const comparar = async (usuarioId: string, periodo?: string) =>
  SalidaCompararPeriodos.parse(await compararPeriodos.manejar({ usuarioId, periodo }));

const capacidadPago = async (usuarioId: string) =>
  SalidaPanoramaInicial.parse(await panoramaInicial.manejar({ usuarioId })).capacidadPagoMensualCentavos;

const capacidadAhorro = async (usuarioId: string) =>
  SalidaProyectarAhorro.parse(
    await proyectarAhorro.manejar({ usuarioId, montoObjetivoCentavos: 5_000_000, aportacionCentavos: 100_000 }),
  ).capacidadMensualCentavos;

const suma = (categorias: Array<{ montoCentavos: number }>) => categorias.reduce((s, c) => s + c.montoCentavos, 0);

describe("normalizacion de nombres", () => {
  it("minusculas, sin acentos, sin espacios de sobra", () => {
    expect(normalizarNombre("  Apoyo a mi  MAMÁ ")).toBe("apoyo a mi mama");
    expect(categoriaIdDe("Apoyo a mi mamá")).toBe("ext_apoyo_a_mi_mama");
    expect(categoriaIdDe("Renta")).toBe("ext_renta");
  });
});

describe("simular_gasto_externo: calcula, no guarda", () => {
  it("Ana, «$3,500 de renta»: el total sube exacto y la tarjeta cuadra al centavo", async () => {
    const salida = await simular("usr_ana", [RENTA]);

    expect(salida.periodo).toBe("2026-08");
    expect(salida.antes.totalCentavos).toBe(3141050);
    expect(salida.antes.totalCentavos).toBe((await comparar("usr_ana")).gastoCentavos);
    expect(salida.despues.totalCentavos).toBe(3491050);
    expect(suma(salida.antes.categorias)).toBe(salida.antes.totalCentavos);
    expect(suma(salida.despues.categorias)).toBe(salida.despues.totalCentavos);

    const renta = salida.despues.categorias.find((c) => c.fueraDelBanco)!;
    expect(renta).toEqual({
      categoriaId: "ext_renta",
      nombre: "Renta",
      montoCentavos: 350000,
      variacionPct: 0,
      fueraDelBanco: true,
      guardado: false,
      frecuencia: "mensual",
    });
    // De mayor a menor, con la de fuera del banco en su lugar.
    const montos = salida.despues.categorias.map((c) => c.montoCentavos);
    expect([...montos].sort((a, b) => b - a)).toEqual(montos);
  });

  it("Ana: la capacidad de pago y la de ahorro bajan exactamente $3,500; sin aviso", async () => {
    const salida = await simular("usr_ana", [RENTA]);
    expect(salida.capacidadPago).toEqual({ antesCentavos: 662905, despuesCentavos: 312905 });
    expect(salida.capacidadAhorro).toEqual({ antesCentavos: 498617, despuesCentavos: 148617 });
    expect(salida.aviso).toBeNull();
  });

  it("Beto, «$2,000 al mes a mi mamá»: se queda sin nada para ahorrar, y se avisa", async () => {
    const salida = await simular("usr_beto", [MAMA]);
    expect(salida.antes.totalCentavos).toBe(3334950);
    expect(salida.despues.totalCentavos).toBe(3534950);
    expect(salida.capacidadPago).toEqual({ antesCentavos: 661371, despuesCentavos: 461371 });
    expect(salida.capacidadAhorro).toEqual({ antesCentavos: 152550, despuesCentavos: 0 });
    expect(salida.aviso).toContain("$2,000.00");
    expect(salida.aviso).toContain("$1,525.50");
  });

  it("si ya no le queda capacidad de pago, el aviso lo dice en pesos (y va antes que el de ahorro)", async () => {
    const salida = await simular("usr_carmen", [{ nombre: "Colegiatura", montoCentavos: 1500000, frecuencia: "mensual" }]);
    expect(salida.capacidadPago).toEqual({ antesCentavos: 882029, despuesCentavos: -617971 });
    expect(salida.aviso).toMatch(/capacidad libre para pagar deudas/);
    expect(salida.aviso).toContain("-$6,179.71");
  });

  it("no guarda nada: el gasto del mes y el estado siguen iguales", async () => {
    const antes = await comparar("usr_ana");
    await simular("usr_ana", [RENTA]);
    expect(accionesDe("usr_ana", "registrar_gasto_externo")).toHaveLength(0);
    expect(await comparar("usr_ana")).toEqual(antes);
    expect(await capacidadPago("usr_ana")).toBe(662905);
  });

  it("un gasto unico cuenta en el gasto del mes pero no en la capacidad, y no avisa", async () => {
    const salida = await simular("usr_beto", [{ nombre: "Boda de mi prima", montoCentavos: 500000, frecuencia: "unico" }]);
    expect(salida.despues.totalCentavos).toBe(3334950 + 500000);
    expect(salida.capacidadPago.despuesCentavos).toBe(salida.capacidadPago.antesCentavos);
    expect(salida.capacidadAhorro.despuesCentavos).toBe(salida.capacidadAhorro.antesCentavos);
    expect(salida.aviso).toBeNull();
  });

  it("con uno ya guardado del mismo nombre, lo reemplaza en `despues` (no lo duplica)", async () => {
    await registrar("usr_ana", [RENTA], "gext:ana:reemplazo-sim");
    const salida = await simular("usr_ana", [{ nombre: "renta", montoCentavos: 400000, frecuencia: "mensual" }]);

    expect(salida.antes.categorias.find((c) => c.categoriaId === "ext_renta")).toMatchObject({
      montoCentavos: 350000,
      guardado: true,
    });
    const rentas = salida.despues.categorias.filter((c) => c.categoriaId === "ext_renta");
    expect(rentas).toHaveLength(1);
    expect(rentas[0]).toMatchObject({ montoCentavos: 400000, guardado: false });
    expect(salida.despues.totalCentavos).toBe(salida.antes.totalCentavos + 50000);
    expect(salida.capacidadPago.antesCentavos - salida.capacidadPago.despuesCentavos).toBe(50000);
  });

  it("un usuario que no existe falla claro", async () => {
    await expect(simular("usr_nadie", [RENTA])).rejects.toThrow(/no existe el usuario/);
  });
});

describe("registrar_gasto_externo: el ciclo completo", () => {
  it("Beto guarda lo de su mamá y `analizar_gasto`/`comparar_periodos` lo listan", async () => {
    const accion = await registrar("usr_beto", [MAMA], "gext:beto:1");
    expect(accion.aplicado).toBe(true);
    expect(accion.yaEstaba).toBe(false);
    expect(accion.periodo).toBe("2026-08");
    expect(accion.antes.totalCentavos).toBe(3334950);
    expect(accion.despues.totalCentavos).toBe(3534950);
    expect(accion.despues.categorias.find((c) => c.fueraDelBanco)).toMatchObject({
      categoriaId: "ext_apoyo_a_mi_mama",
      guardado: true,
    });
    expect(accion.mensaje).toContain("$2,000.00");

    const gasto = await comparar("usr_beto");
    expect(gasto.gastoCentavos).toBe(3534950);
    const mama = gasto.categorias.find((c) => c.categoriaId === "ext_apoyo_a_mi_mama")!;
    expect(mama).toMatchObject({
      nombre: "Apoyo a mi mamá",
      grupo: "fuera_del_banco",
      esEsencial: false,
      montoCentavos: 200000,
      montoAnteriorCentavos: 0,
      esAtipica: false,
      fueraDelBanco: true,
      frecuencia: "mensual",
    });
    expect(mama.participacionPct).toBe(Number((200000 / 3534950).toFixed(4)));
    // La atipica sigue siendo la del banco: lo de fuera no compite.
    expect(gasto.categoriaAtipicaId).toBe("cat_retiros");
    // El `despues` de la accion es exactamente lo que ahora lista la lectura.
    expect(accion.despues.categorias.map((c) => [c.categoriaId, c.montoCentavos])).toEqual(
      gasto.categorias.map((c) => [c.categoriaId, c.montoCentavos]),
    );

    const compuesto = SalidaAnalizarGasto.parse(await analizarGasto.manejar({ usuarioId: "usr_beto" }));
    expect(compuesto.gasto).toEqual(gasto);
  });

  it("Beto: la capacidad de pago de `panorama_inicial` baja exactamente $2,000", async () => {
    expect(await capacidadPago("usr_beto")).toBe(661371);
    const accion = await registrar("usr_beto", [MAMA], "gext:beto:2");
    expect(await capacidadPago("usr_beto")).toBe(461371);
    expect(accion.capacidadPago).toEqual({ antesCentavos: 661371, despuesCentavos: 461371 });
  });

  it("Ana: `proyectar_ahorro` baja exactamente $3,500 de capacidad", async () => {
    expect(await capacidadAhorro("usr_ana")).toBe(498617);
    const accion = await registrar("usr_ana", [RENTA], "gext:ana:1");
    expect(await capacidadAhorro("usr_ana")).toBe(148617);
    expect(accion.capacidadAhorro).toEqual({ antesCentavos: 498617, despuesCentavos: 148617 });
  });

  it("un mensual cuenta desde su periodo en adelante, con monto anterior en los siguientes", async () => {
    await registrar("usr_ana", [RENTA], "gext:ana:2");
    expect((await comparar("usr_ana", "2026-07")).categorias.some((c) => c.fueraDelBanco)).toBe(false);

    const septiembre = await comparar("usr_ana", "2026-09");
    expect(septiembre.categorias.find((c) => c.categoriaId === "ext_renta")).toMatchObject({
      montoCentavos: 350000,
      montoAnteriorCentavos: 350000,
      variacionPct: 0,
    });
    // El agosto contra el que se compara septiembre tambien la trae.
    expect(septiembre.gastoAnteriorCentavos).toBe(3491050);
  });

  it("un unico solo cuenta en su periodo y no toca la capacidad", async () => {
    const boda: GastoExterno = { nombre: "Boda de mi prima", montoCentavos: 500000, frecuencia: "unico" };
    await registrar("usr_beto", [boda], "gext:beto:3");

    expect((await comparar("usr_beto")).gastoCentavos).toBe(3334950 + 500000);
    expect(await capacidadPago("usr_beto")).toBe(661371);
    // En septiembre ya no cuenta: aparece en 0 contra su agosto, como una categoria que dejo de tener cargos.
    const septiembre = await comparar("usr_beto", "2026-09");
    expect(septiembre.categorias.find((c) => c.categoriaId === "ext_boda_de_mi_prima")).toMatchObject({
      montoCentavos: 0,
      montoAnteriorCentavos: 500000,
    });
    expect((await comparar("usr_beto", "2026-10")).categorias.some((c) => c.fueraDelBanco)).toBe(false);
  });

  it("guardar otra vez el mismo nombre reemplaza, y con monto 0 lo quita", async () => {
    const inicial = await comparar("usr_beto");

    await registrar("usr_beto", [MAMA], "gext:beto:4");
    await registrar("usr_beto", [{ nombre: "apoyo a mi MAMA", montoCentavos: 250000, frecuencia: "mensual" }], "gext:beto:5");
    const reemplazado = await comparar("usr_beto");
    expect(reemplazado.categorias.filter((c) => c.fueraDelBanco)).toHaveLength(1);
    expect(reemplazado.gastoCentavos).toBe(3334950 + 250000);
    expect(await capacidadPago("usr_beto")).toBe(661371 - 250000);

    const quitar = await registrar("usr_beto", [{ nombre: "Apoyo a mi mamá", montoCentavos: 0, frecuencia: "mensual" }], "gext:beto:6");
    expect(quitar.mensaje).toMatch(/quité/);
    expect(await comparar("usr_beto")).toEqual(inicial);
    expect(await capacidadPago("usr_beto")).toBe(661371);
  });

  it("es idempotente: la misma llave no guarda dos veces y responde lo mismo", async () => {
    const primera = await registrar("usr_ana", [RENTA], "gext:ana:3");
    const segunda = await registrar("usr_ana", [RENTA], "gext:ana:3");
    expect(segunda.aplicado).toBe(false);
    expect(segunda.yaEstaba).toBe(true);
    expect(segunda.despues).toEqual(primera.despues);
    expect(segunda.capacidadPago).toEqual(primera.capacidadPago);
    expect(accionesDe("usr_ana", "registrar_gasto_externo")).toHaveLength(1);
    expect((await comparar("usr_ana")).gastoCentavos).toBe(3491050);
  });

  it("`reiniciarEstado` lo borra: vuelve el gasto y la capacidad de siempre", async () => {
    const inicial = await comparar("usr_ana");
    await registrar("usr_ana", [RENTA], "gext:ana:4");
    await reiniciarEstado();
    expect(await comparar("usr_ana")).toEqual(inicial);
    expect(await capacidadPago("usr_ana")).toBe(662905);
    expect(await capacidadAhorro("usr_ana")).toBe(498617);
  });
});

describe("registrar_gasto_externo via ejecutar_decision", () => {
  it("despacha; `estadoPosterior` es null porque `resultadoAccion.despues` ya es el gasto", async () => {
    const compuesto = SalidaEjecutarDecision.parse(
      await ejecutarDecision.manejar({
        usuarioId: "usr_ana",
        accion: "registrar_gasto_externo",
        context: { gastos: [RENTA], idempotencyKey: "gext:orq:1" },
      }),
    );
    expect(compuesto.accion).toBe("registrar_gasto_externo");
    expect(compuesto.estadoPosterior).toBeNull();
    const resultado = SalidaRegistrarGastoExterno.parse(compuesto.resultadoAccion);
    expect(resultado.aplicado).toBe(true);
    expect(resultado.despues.totalCentavos).toBe(3491050);
    expect((await comparar("usr_ana")).gastoCentavos).toBe(3491050);
  });
});
