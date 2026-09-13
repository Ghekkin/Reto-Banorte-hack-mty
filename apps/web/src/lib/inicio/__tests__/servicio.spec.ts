import { describe, expect, it, vi } from "vitest";
import { VERSION_A2UI, type MensajeA2UI } from "@maya/a2ui";
import type { Almacen, PantallaDeInicio, PantallaNueva } from "../almacen";
import type { PortadaGenerada } from "../generar";
import { DISPOSITIVO_SIN_ACCIONES } from "@/lib/dispositivo";
import { componentesDe, ESPERA_ENTRE_INTENTOS_MS, estadoDelInicio, regenerarSiCambio, regenerarTodos, type Dependencias } from "../servicio";

/**
 * La regla del servicio, sin base, sin MCP y sin modelo: **el modelo corre solo cuando
 * algo cambio**. Y las que la acompanan: una generacion en vuelo por persona, y si el
 * modelo falla la portada anterior se queda.
 */

const MENSAJES: MensajeA2UI[] = [
  { version: VERSION_A2UI, createSurface: { surfaceId: "principal", catalogId: "http://localhost:3000/catalogo/v1.json" } },
  {
    version: VERSION_A2UI,
    updateComponents: {
      surfaceId: "principal",
      components: [
        { id: "root", component: "Column", children: ["c"] },
        { id: "c", component: "ResumenTarjeta", razon: "Tienes la tarjeta al 96.7 %" },
      ],
    },
  },
  { version: VERSION_A2UI, updateDataModel: { surfaceId: "principal", path: "/", value: {} } },
];

function portadaOk(): PortadaGenerada {
  return {
    ok: true,
    mensajes: MENSAJES,
    texto: "Hoy lo urgente es la tarjeta.",
    razon: "Tienes la tarjeta al 96.7 % de su limite",
    sugerencias: ["¿Cuanto me ahorro con el plan?"],
    tools: ["panorama_inicial", "analizar_gasto"],
    entradaTokens: 15000,
    salidaTokens: 900,
    cacheTokens: 12000,
    pasos: 1,
    ms: 4200,
    modelo: "modelo-de-prueba",
  };
}

/**
 * Un almacen en memoria con la misma forma que el de Postgres. Las filas comunes van por
 * `usuarioId` (como `pantallas_inicio`) y las de un dispositivo por `dispositivo|usuario`.
 */
const clave = (usuarioId: string, dispositivoId = "comun") => (dispositivoId === "comun" ? usuarioId : `${dispositivoId}|${usuarioId}`);

function almacenEnMemoria(...iniciales: PantallaDeInicio[]): Almacen & { filas: Map<string, PantallaDeInicio> } {
  const filas = new Map<string, PantallaDeInicio>();
  for (const inicial of iniciales) filas.set(clave(inicial.usuarioId, inicial.dispositivoId), inicial);
  return {
    filas,
    leer: async (usuarioId, dispositivoId) => filas.get(clave(usuarioId, dispositivoId)),
    guardar: async (p: PantallaNueva) => {
      const dispositivoId = p.dispositivoId ?? "comun";
      const guardada = { ...p, dispositivoId, generadaEn: new Date().toISOString(), procedencias: p.procedencias ?? {}, referencias: p.referencias ?? [], ajustadaEn: null };
      filas.set(clave(p.usuarioId, dispositivoId), guardada);
      return guardada;
    },
  };
}

function guardada(usuarioId: string, huella: string, dispositivoId = "comun"): PantallaDeInicio {
  return {
    usuarioId,
    dispositivoId,
    huella,
    procedencias: {},
    referencias: [],
    ajustadaEn: null,
    mensajes: MENSAJES,
    texto: "vieja",
    razon: "vieja",
    sugerencias: [],
    modelo: "modelo-de-prueba",
    tools: [],
    entradaTokens: null,
    salidaTokens: null,
    cacheTokens: null,
    ms: 1,
    generadaEn: "2026-09-12T18:00:00.000Z",
  };
}

function deps(parcial: Partial<Dependencias> & { almacen: Almacen }): Dependencias {
  return {
    huella: async () => "v1|c18|a:0:0|m:812:2026-09-10",
    generar: vi.fn(async () => portadaOk()),
    activo: () => true,
    ...parcial,
  };
}

describe("regenerarSiCambio", () => {
  it("sin portada guardada, genera y la guarda con la huella de los datos", async () => {
    const almacen = almacenEnMemoria();
    const d = deps({ almacen });

    const resultado = await regenerarSiCambio("usr_beto", "prueba", { deps: d });

    expect(resultado.hecho).toBe("generada");
    expect(d.generar).toHaveBeenCalledTimes(1);
    expect(almacen.filas.get("usr_beto")?.huella).toBe("v1|c18|a:0:0|m:812:2026-09-10");
    expect(almacen.filas.get("usr_beto")?.texto).toBe("Hoy lo urgente es la tarjeta.");
  });

  it("con la misma huella no llama al modelo: la cuenta no se movio", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const d = deps({ almacen });

    const resultado = await regenerarSiCambio("usr_beto", "reloj", { deps: d });

    expect(resultado.hecho).toBe("sin-cambios");
    expect(d.generar).not.toHaveBeenCalled();
    expect(almacen.filas.get("usr_beto")?.texto).toBe("vieja");
  });

  it("con otra huella (una accion aplicada) rearma", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const d = deps({ almacen, huella: async () => "v1|c18|a:1:7|m:812:2026-09-10" });

    const resultado = await regenerarSiCambio("usr_beto", "accion", { deps: d });

    expect(resultado.hecho).toBe("generada");
    expect(almacen.filas.get("usr_beto")?.huella).toBe("v1|c18|a:1:7|m:812:2026-09-10");
  });

  it("`forzar` rearma aunque nada haya cambiado", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const d = deps({ almacen });

    const resultado = await regenerarSiCambio("usr_beto", "manual", { forzar: true, deps: d });

    expect(resultado.hecho).toBe("generada");
    expect(d.generar).toHaveBeenCalledTimes(1);
  });

  it("dos peticiones a la vez comparten UNA generacion", async () => {
    const almacen = almacenEnMemoria();
    let liberar: (() => void) | undefined;
    const generar = vi.fn(
      () =>
        new Promise<PortadaGenerada>((resolve) => {
          liberar = () => resolve(portadaOk());
        }),
    );
    const d = deps({ almacen, generar });

    const a = regenerarSiCambio("usr_ana", "visita", { deps: d });
    const b = regenerarSiCambio("usr_ana", "reloj", { deps: d });
    await new Promise((r) => setTimeout(r, 0));
    liberar?.();
    const [ra, rb] = await Promise.all([a, b]);

    expect(generar).toHaveBeenCalledTimes(1);
    expect(ra.hecho).toBe("generada");
    expect(rb.hecho).toBe("generada");
  });

  it("si el modelo falla, la portada anterior se queda y se reporta el motivo", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const d = deps({
      almacen,
      huella: async () => "v1|c18|a:1:7|m:812:2026-09-10",
      generar: async () => ({ ok: false, motivo: "el modelo no entrego una pantalla en 3 paso(s)", tools: [], pasos: 3, ms: 9000, modelo: "m" }),
    });

    const resultado = await regenerarSiCambio("usr_beto", "reloj", { deps: d });

    expect(resultado.hecho).toBe("fallo");
    expect(resultado.motivo).toContain("no entrego");
    expect(almacen.filas.get("usr_beto")?.texto).toBe("vieja");
  });

  it("inactivo (flag, llave o base): no toca nada", async () => {
    const almacen = almacenEnMemoria();
    const d = deps({ almacen, activo: () => false });

    const resultado = await regenerarSiCambio("usr_beto", "reloj", { deps: d });

    expect(resultado.hecho).toBe("inactivo");
    expect(d.generar).not.toHaveBeenCalled();
  });

  it("sin base, reporta fallo en vez de reventar", async () => {
    const almacen = almacenEnMemoria();
    const d = deps({
      almacen,
      huella: async () => {
        throw new Error("sin DATABASE_URL");
      },
    });

    const resultado = await regenerarSiCambio("usr_beto", "reloj", { deps: d });

    expect(resultado.hecho).toBe("fallo");
    expect(resultado.motivo).toContain("DATABASE_URL");
  });
});

describe("regenerarTodos", () => {
  it("pasa por los tres usuarios, uno tras otro", async () => {
    const almacen = almacenEnMemoria();
    const d = deps({ almacen });

    const resultados = await regenerarTodos("reloj", d);

    expect(Object.keys(resultados).sort()).toEqual(["usr_ana", "usr_beto", "usr_carmen"]);
    expect(d.generar).toHaveBeenCalledTimes(3);
  });
});

describe("estadoDelInicio", () => {
  it("marca desactualizada cuando la huella guardada ya no es la de hoy", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const d = deps({ almacen, huella: async () => "v1|c18|a:1:7|m:812:2026-09-10" });

    const estado = await estadoDelInicio("usr_beto", { deps: d });

    expect(estado.activo).toBe(true);
    expect(estado.desactualizada).toBe(true);
    expect(estado.pantalla?.texto).toBe("vieja");
  });

  it("al dia cuando coincide", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const estado = await estadoDelInicio("usr_beto", { deps: deps({ almacen }) });
    expect(estado.desactualizada).toBe(false);
  });

  it("sin portada, desactualizada; inactivo, ni eso", async () => {
    expect((await estadoDelInicio("usr_beto", { deps: deps({ almacen: almacenEnMemoria() }) })).desactualizada).toBe(true);
    const inactivo = await estadoDelInicio("usr_beto", { deps: deps({ almacen: almacenEnMemoria(), activo: () => false }) });
    expect(inactivo).toEqual({ activo: false, desactualizada: false });
  });
});

describe("widgets vivos encendidos", () => {
  const procedencia = {
    widgetId: "c",
    fuente: "tarjeta",
    componente: "ResumenTarjeta",
    tool: "consultar_tarjeta",
    parametros: {},
    variantes: {},
    argumentos: { usuarioId: "usr_beto" },
    huella: "h",
    en: "2026-09-13T07:00:00.000Z",
  };

  it("una portada sin procedencias se rearma UNA vez, aunque la huella sea la misma", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const d = deps({ almacen, widgets: () => true });
    expect((await estadoDelInicio("usr_beto", { deps: d })).desactualizada).toBe(true);
    almacen.filas.set("usr_beto", { ...guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"), procedencias: { c: procedencia } });
    expect((await estadoDelInicio("usr_beto", { deps: d })).desactualizada).toBe(false);
  });

  it("con procedencias de OTRA portada (otro proceso la rearmo sin esa columna), tambien", async () => {
    const almacen = almacenEnMemoria({
      ...guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"),
      procedencias: { c: { ...procedencia, componente: "PlanDePago" } },
    });
    expect((await estadoDelInicio("usr_beto", { deps: deps({ almacen, widgets: () => true }) })).desactualizada).toBe(true);
  });

  it("con el flag apagado, una portada sin procedencias esta al dia: los dos modos no se pelean la base", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    expect((await estadoDelInicio("usr_beto", { deps: deps({ almacen, widgets: () => false }) })).desactualizada).toBe(false);
  });
});

/**
 * El estado por dispositivo (ADR 0012): lo que un visitante hace en su Inicio no le cambia el
 * Inicio a otro, y un visitante que no ha hecho nada no cuesta una portada.
 */
describe("por dispositivo", () => {
  const JUEZ = "dis_juez000000001";
  const OTRO = "dis_otro000000002";
  const SIN_ACCIONES = "v1|c18|a:0:0|m:812:2026-09-10";
  const CON_PLAN = "v1|c18|a:1:7|m:812:2026-09-10";
  /** El juez aplico un plan; nadie mas hizo nada. */
  const huellaConPlanDelJuez = async (_u: string, dispositivoId: string) => (dispositivoId === JUEZ ? CON_PLAN : SIN_ACCIONES);

  it("un dispositivo que no ha hecho nada ve la portada comun y no gasta modelo", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", SIN_ACCIONES));
    const d = deps({ almacen });

    const estado = await estadoDelInicio("usr_beto", { dispositivoId: JUEZ, deps: d });
    const resultado = await regenerarSiCambio("usr_beto", "visita", { dispositivoId: JUEZ, deps: d });

    expect(estado.desactualizada).toBe(false);
    expect(estado.pantalla?.dispositivoId).toBe("comun");
    expect(resultado.hecho).toBe("sin-cambios");
    expect(d.generar).not.toHaveBeenCalled();
  });

  it("cuando aplica algo, su portada se arma aparte, con SU estado, y la comun queda intacta para los demas", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", SIN_ACCIONES));
    const d = deps({ almacen, huella: huellaConPlanDelJuez });

    expect((await estadoDelInicio("usr_beto", { dispositivoId: JUEZ, deps: d })).desactualizada).toBe(true);
    const resultado = await regenerarSiCambio("usr_beto", "accion", { dispositivoId: JUEZ, deps: d });

    expect(resultado.hecho).toBe("generada");
    expect(d.generar).toHaveBeenCalledWith("usr_beto", expect.objectContaining({ dispositivoId: JUEZ }));
    expect(almacen.filas.get(clave("usr_beto", JUEZ))?.huella).toBe(CON_PLAN);
    expect(almacen.filas.get("usr_beto")?.texto).toBe("vieja");

    const delJuez = await estadoDelInicio("usr_beto", { dispositivoId: JUEZ, deps: d });
    const delOtro = await estadoDelInicio("usr_beto", { dispositivoId: OTRO, deps: d });
    expect(delJuez.pantalla?.texto).toBe("Hoy lo urgente es la tarjeta.");
    expect(delJuez.desactualizada).toBe(false);
    expect(delOtro.pantalla?.texto).toBe("vieja");
    expect(delOtro.desactualizada).toBe(false);
  });

  it("con la comun vencida y sin cambios propios, se rearma LA COMUN, una vez para dos visitantes a la vez", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v0|vieja"));
    const d = deps({ almacen });

    const [a, b] = await Promise.all([
      regenerarSiCambio("usr_beto", "visita", { dispositivoId: JUEZ, deps: d }),
      regenerarSiCambio("usr_beto", "visita", { dispositivoId: OTRO, deps: d }),
    ]);

    expect(a.hecho).toBe("generada");
    expect(b.hecho).toBe("generada");
    expect(d.generar).toHaveBeenCalledTimes(1);
    expect(d.generar).toHaveBeenCalledWith("usr_beto", expect.objectContaining({ dispositivoId: "comun" }));
    expect(almacen.filas.get("usr_beto")?.huella).toBe(SIN_ACCIONES);
    expect(almacen.filas.has(clave("usr_beto", JUEZ))).toBe(false);
  });

  it("una portada propia al dia (una pregunta) gana sobre la comun, solo en ese dispositivo", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", SIN_ACCIONES), {
      ...guardada("usr_beto", SIN_ACCIONES, JUEZ),
      texto: "lo que pregunto el juez",
    });
    const d = deps({ almacen });

    expect((await estadoDelInicio("usr_beto", { dispositivoId: JUEZ, deps: d })).pantalla?.texto).toBe("lo que pregunto el juez");
    expect((await estadoDelInicio("usr_beto", { dispositivoId: OTRO, deps: d })).pantalla?.texto).toBe("vieja");
    expect((await estadoDelInicio("usr_beto", { deps: d })).pantalla?.texto).toBe("vieja");
  });

  it("tras reiniciar la demo, una portada propia vieja queda tapada por la comun y no se paga otra", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", SIN_ACCIONES), guardada("usr_beto", CON_PLAN, JUEZ));
    const d = deps({ almacen });

    const estado = await estadoDelInicio("usr_beto", { dispositivoId: JUEZ, deps: d });
    const resultado = await regenerarSiCambio("usr_beto", "visita", { dispositivoId: JUEZ, deps: d });

    expect(estado.pantalla?.dispositivoId).toBe("comun");
    expect(estado.desactualizada).toBe(false);
    expect(resultado.hecho).toBe("sin-cambios");
    expect(d.generar).not.toHaveBeenCalled();
  });
});

/**
 * Issue #37: con acciones en el comun (un script sin cookie aplico algo), un visitante nuevo no
 * puede ver la comun —le mostraria lo que hizo otro— ni costar una portada propia (issue #33).
 */
describe("visitantes sin acciones cuando el comun tiene acciones (#37)", () => {
  const SIN_ACCIONES = "v1|c21|a:0:0|m:812:2026-09-10";
  const COMUN_CON_ACCION = "v1|c21|a:1:7|m:812:2026-09-10";
  const CON_PLAN = "v1|c21|a:1:9|m:812:2026-09-10";
  const JUEZ = "dis_juez000000001";
  const visitante = (i: number) => `dis_${String(i).padStart(24, "0")}`;
  /** El comun tiene una accion; el juez aplico un plan; nadie mas hizo nada. */
  const huella = async (_u: string, dispositivoId: string) =>
    dispositivoId === "comun" ? COMUN_CON_ACCION : dispositivoId === JUEZ ? CON_PLAN : SIN_ACCIONES;

  /** Lo que hace la pagina de Inicio en cada visita. */
  async function visitar(usuarioId: string, dispositivoId: string, d: Dependencias) {
    const estado = await estadoDelInicio(usuarioId, { dispositivoId, deps: d });
    if (estado.desactualizada) await regenerarSiCambio(usuarioId, "visita", { dispositivoId, deps: d });
    return estado;
  }

  it("cien visitantes nuevos, uno tras otro: UNA portada, sin acciones, y ninguno ve la comun", async () => {
    const almacen = almacenEnMemoria(guardada("usr_ana", COMUN_CON_ACCION));
    const d = deps({ almacen, huella });

    const vistas = [];
    for (let i = 0; i < 100; i++) vistas.push(await visitar("usr_ana", visitante(i), d));
    const despues = await Promise.all(Array.from({ length: 100 }, (_, i) => estadoDelInicio("usr_ana", { dispositivoId: visitante(i), deps: d })));

    expect(d.generar).toHaveBeenCalledTimes(1);
    expect(d.generar).toHaveBeenCalledWith("usr_ana", expect.objectContaining({ dispositivoId: DISPOSITIVO_SIN_ACCIONES }));
    expect(vistas.some((v) => v.pantalla?.dispositivoId === "comun")).toBe(false);
    for (const estado of despues) {
      expect(estado.pantalla?.huella).toBe(SIN_ACCIONES);
      expect(estado.pantalla?.dispositivoId).toBe(DISPOSITIVO_SIN_ACCIONES);
      expect(estado.desactualizada).toBe(false);
    }
    expect(almacen.filas.get("usr_ana")?.huella).toBe(COMUN_CON_ACCION);
    expect([...almacen.filas.keys()].filter((k) => k.startsWith("dis_0"))).toEqual([]);
  });

  it("cien visitantes nuevos A LA VEZ: tambien una sola generacion", async () => {
    const almacen = almacenEnMemoria(guardada("usr_ana", COMUN_CON_ACCION));
    const d = deps({ almacen, huella });

    await Promise.all(Array.from({ length: 100 }, (_, i) => regenerarSiCambio("usr_ana", "visita", { dispositivoId: visitante(i), deps: d })));

    expect(d.generar).toHaveBeenCalledTimes(1);
  });

  it("con el comun SIN acciones, cien visitantes ven la comun y no gastan modelo", async () => {
    const almacen = almacenEnMemoria(guardada("usr_ana", SIN_ACCIONES));
    const d = deps({ almacen, huella: async () => SIN_ACCIONES });

    for (let i = 0; i < 100; i++) {
      const estado = await visitar("usr_ana", visitante(i), d);
      expect(estado.pantalla?.dispositivoId).toBe("comun");
    }

    expect(d.generar).not.toHaveBeenCalled();
  });

  it("un dispositivo con acciones propias ve SU portada, no la compartida ni la comun", async () => {
    const almacen = almacenEnMemoria(
      guardada("usr_ana", COMUN_CON_ACCION),
      guardada("usr_ana", SIN_ACCIONES, DISPOSITIVO_SIN_ACCIONES),
      { ...guardada("usr_ana", CON_PLAN, JUEZ), texto: "la del juez" },
    );
    const d = deps({ almacen, huella });

    const estado = await visitar("usr_ana", JUEZ, d);

    expect(estado.pantalla?.texto).toBe("la del juez");
    expect(estado.desactualizada).toBe(false);
    expect(d.generar).not.toHaveBeenCalled();
  });

  it("una portada propia vencida se pinta mientras tanto y se rearma al visitar, en su ambito", async () => {
    const almacen = almacenEnMemoria(guardada("usr_ana", COMUN_CON_ACCION), guardada("usr_ana", "v1|c21|a:1:5|m:812:2026-09-10", JUEZ));
    const d = deps({ almacen, huella });

    const estado = await visitar("usr_ana", JUEZ, d);

    expect(estado.desactualizada).toBe(true);
    expect(estado.pantalla?.texto).toBe("vieja");
    expect(d.generar).toHaveBeenCalledTimes(1);
    expect(d.generar).toHaveBeenCalledWith("usr_ana", expect.objectContaining({ dispositivoId: JUEZ }));
    expect(almacen.filas.get(clave("usr_ana", JUEZ))?.huella).toBe(CON_PLAN);
  });

  it("si la generacion falla, las visitas no pagan un intento cada una: esperan; una accion no", async () => {
    let reloj = 1_000_000;
    const almacen = almacenEnMemoria(guardada("usr_ana", "v0|vieja"));
    const d = deps({
      almacen,
      huella: async () => SIN_ACCIONES,
      ahora: () => reloj,
      generar: vi.fn(async () => ({ ok: false as const, motivo: "el modelo no respondio", tools: [], pasos: 0, ms: 10, modelo: "m" })),
    });

    for (let i = 0; i < 20; i++) await visitar("usr_ana", visitante(i), d);
    expect(d.generar).toHaveBeenCalledTimes(1);

    reloj += ESPERA_ENTRE_INTENTOS_MS;
    await visitar("usr_ana", visitante(99), d);
    expect(d.generar).toHaveBeenCalledTimes(2);

    await regenerarSiCambio("usr_ana", "accion", { dispositivoId: visitante(99), deps: d });
    expect(d.generar).toHaveBeenCalledTimes(3);
  });
});

describe("componentesDe", () => {
  it("lista los componentes que trae la pantalla", () => {
    expect(componentesDe(guardada("usr_beto", "x"))).toEqual(["Column", "ResumenTarjeta"]);
  });
});
