import { describe, expect, it, vi } from "vitest";
import { VERSION_A2UI, type MensajeA2UI } from "@maya/a2ui";
import type { Almacen, PantallaDeInicio, PantallaNueva } from "../almacen";
import type { PortadaGenerada } from "../generar";
import { componentesDe, estadoDelInicio, regenerarSiCambio, regenerarTodos, type Dependencias } from "../servicio";

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

/** Un almacen en memoria con la misma forma que el de Postgres. */
function almacenEnMemoria(inicial?: PantallaDeInicio): Almacen & { filas: Map<string, PantallaDeInicio> } {
  const filas = new Map<string, PantallaDeInicio>();
  if (inicial) filas.set(inicial.usuarioId, inicial);
  return {
    filas,
    leer: async (usuarioId) => filas.get(usuarioId),
    guardar: async (p: PantallaNueva) => {
      const guardada = { ...p, generadaEn: new Date().toISOString() };
      filas.set(p.usuarioId, guardada);
      return guardada;
    },
  };
}

function guardada(usuarioId: string, huella: string): PantallaDeInicio {
  return {
    usuarioId,
    huella,
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

    const estado = await estadoDelInicio("usr_beto", d);

    expect(estado.activo).toBe(true);
    expect(estado.desactualizada).toBe(true);
    expect(estado.pantalla?.texto).toBe("vieja");
  });

  it("al dia cuando coincide", async () => {
    const almacen = almacenEnMemoria(guardada("usr_beto", "v1|c18|a:0:0|m:812:2026-09-10"));
    const estado = await estadoDelInicio("usr_beto", deps({ almacen }));
    expect(estado.desactualizada).toBe(false);
  });

  it("sin portada, desactualizada; inactivo, ni eso", async () => {
    expect((await estadoDelInicio("usr_beto", deps({ almacen: almacenEnMemoria() }))).desactualizada).toBe(true);
    const inactivo = await estadoDelInicio("usr_beto", deps({ almacen: almacenEnMemoria(), activo: () => false }));
    expect(inactivo).toEqual({ activo: false, desactualizada: false });
  });
});

describe("componentesDe", () => {
  it("lista los componentes que trae la pantalla", () => {
    expect(componentesDe(guardada("usr_beto", "x"))).toEqual(["Column", "ResumenTarjeta"]);
  });
});
