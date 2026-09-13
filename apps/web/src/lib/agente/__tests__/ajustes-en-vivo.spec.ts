import { describe, expect, it } from "vitest";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { correrTurno } from "../agente";
import { armarParches, parchesDeterministas } from "../ajustar";
import { ACCIONES_EN_SU_LUGAR } from "../cierre";
import { instruccionDeAccion, mensajesDelTurno } from "../historial";
import { esquemaPeticion, type LineaStream, type PantallaAnterior, type PeticionAgente } from "../tipos";
import { modeloGuionizado, pasoConTool } from "./ayudas";

/**
 * Ajustes en vivo (`docs/como-funciona/ajustes-en-vivo.md`): la tarjeta cambia donde esta,
 * aunque este en una pantalla de ARRIBA del hilo, y una accion que se atiende en su lugar
 * cierra con un ajuste sobre la misma tarjeta en vez de apilar una Confirmacion.
 *
 * Aqui se prueba el cableado sin modelo real; que Gemini elija bien se ensaya con el guion.
 */

const GASTO: PantallaAnterior = {
  pantalla: "p1",
  arbol: [
    { id: "root", component: "Column", children: ["gasto"] },
    {
      id: "gasto",
      component: "GastoPorCategoria",
      periodo: { path: "/gasto/periodo" },
      totalCentavos: { path: "/gasto/totalCentavos" },
      categorias: { path: "/gasto/categorias" },
      razon: "Tu gasto subio 7 % contra julio",
    },
  ],
  dataModel: { gasto: { periodo: "2026-08", totalCentavos: 4520000, categorias: [{ nombre: "Renta", montoCentavos: 4520000 }] } },
};

const ACTUAL: NonNullable<PeticionAgente["superficie"]> = {
  surfaceId: "principal",
  componentes: ["Column", "Confirmacion"],
  pantalla: "p2",
  arbol: [
    { id: "root", component: "Column", children: ["conf"] },
    { id: "conf", component: "Confirmacion", titulo: "Listo", detalle: "Tu apartado quedo creado", razon: "Porque lo pediste hace un momento" },
  ],
  dataModel: {},
  anteriores: [GASTO],
};

const RAZON = "Una razon suficientemente larga para el schema";

function peticion(extra: Partial<PeticionAgente> = {}): PeticionAgente {
  return {
    usuarioId: "usr_ana",
    conversacionId: "c_prueba",
    mensajes: [{ rol: "usuario", texto: "muestrame julio en lo que gaste" }],
    superficie: ACTUAL,
    ...extra,
  };
}

async function recolectar(generador: AsyncGenerator<LineaStream>): Promise<LineaStream[]> {
  const lineas: LineaStream[] = [];
  for await (const linea of generador) lineas.push(linea);
  return lineas;
}

const sinTools = (): ToolSet => ({
  consultar_perfil: tool({ description: "perfil", inputSchema: z.object({}), execute: () => ({}) }),
});

describe("armarParches con pantallas anteriores", () => {
  const actual = { arbol: ACTUAL.arbol!, dataModel: ACTUAL.dataModel, pantalla: "p2" };

  it("parchea la pantalla de arriba que se nombro y devuelve su id", () => {
    const r = armarParches(
      { razon: RAZON, texto: "Julio.", pantalla: "p1", parchesDatos: [{ path: "/gasto/periodo", value: "2026-07" }] },
      actual,
      [GASTO],
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pantalla).toBe("p1");
      expect(r.mensajes[0]).toMatchObject({ updateDataModel: { path: "/gasto/periodo", value: "2026-07" } });
    }
  });

  it("valida contra el arbol y el data model de ESA pantalla, no de la actual", () => {
    // `/gasto` no existe en la actual: sin `pantalla`, el mismo parche se rechaza.
    const r = armarParches({ razon: RAZON, texto: "Julio.", parchesDatos: [{ path: "/gasto/periodo", value: "2026-07" }] }, actual, [GASTO]);
    expect(r.ok).toBe(false);
    const ids = armarParches(
      { razon: RAZON, texto: "Otro orden.", pantalla: "p1", parchesDatos: [], parchesComponentes: [{ id: "conf", props: { titulo: "x" } }] },
      actual,
      [GASTO],
    );
    expect(ids.ok).toBe(false);
    if (!ids.ok) expect(ids.errores.join(" ")).toContain("root, gasto");
  });

  it("nombrar la actual por su id es lo mismo que omitirlo", () => {
    const r = armarParches(
      { razon: RAZON, texto: "Otro titulo.", pantalla: "p2", parchesDatos: [], parchesComponentes: [{ id: "conf", props: { titulo: "Hecho" } }] },
      actual,
      [GASTO],
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pantalla).toBeUndefined();
  });

  it("una pantalla que no viajo se rechaza con la lista de las que si", () => {
    const r = armarParches({ razon: RAZON, texto: "x", pantalla: "p7", parchesDatos: [{ path: "/a", value: 1 }] }, actual, [GASTO]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/p2 \(la actual\), p1/);
  });
});

describe("correrTurno con un ajuste a una pantalla de arriba", () => {
  it("cada linea a2ui y el fin llevan el id de la pantalla", async () => {
    const lineas = await recolectar(
      correrTurno(peticion(), {
        modelo: modeloGuionizado([
          pasoConTool("ajustar_pantalla", {
            razon: "Pediste julio y la tarjeta del gasto esta arriba",
            texto: "Listo, arriba ya ves julio.",
            pantalla: "p1",
            parchesDatos: JSON.stringify([{ path: "/gasto/periodo", value: "2026-07" }]),
          }),
        ]),
        herramientas: sinTools(),
      }),
    );
    const a2ui = lineas.filter((l) => l.tipo === "a2ui");
    expect(a2ui).toHaveLength(1);
    expect(a2ui[0]).toMatchObject({ pantalla: "p1" });
    expect(lineas.at(-1)).toMatchObject({ tipo: "fin", cierre: "ajustar", pantalla: "p1" });
  });

  it("un ajuste a la actual NO lleva pantalla: el cliente sigue por el camino de siempre", async () => {
    const lineas = await recolectar(
      correrTurno(peticion(), {
        modelo: modeloGuionizado([
          pasoConTool("ajustar_pantalla", {
            razon: "Pediste cambiar el titulo de la confirmacion",
            texto: "Cambiado.",
            parchesDatos: "[]",
            parchesComponentes: JSON.stringify([{ id: "conf", props: { titulo: "Hecho" } }]),
          }),
        ]),
        herramientas: sinTools(),
      }),
    );
    expect(lineas.find((l) => l.tipo === "a2ui")).not.toHaveProperty("pantalla");
    expect(lineas.at(-1)).not.toHaveProperty("pantalla");
  });
});

describe("el contexto del turno", () => {
  it("lista las pantallas anteriores con su id, sus componentes y sus enlaces", () => {
    const contexto = String(mensajesDelTurno(peticion()).at(-1)!.content);
    expect(contexto).toContain("pantalla actual (p2)");
    expect(contexto).toContain("pantallas anteriores");
    expect(contexto).toContain("p1:");
    expect(contexto).toContain("gasto · GastoPorCategoria");
    expect(contexto).toContain("periodo→/gasto/periodo");
  });

  it("sin anteriores no dice nada de ellas", () => {
    const contexto = String(mensajesDelTurno(peticion({ superficie: { ...ACTUAL, anteriores: undefined } })).at(-1)!.content);
    expect(contexto).not.toContain("pantallas anteriores");
  });

  it("una accion tocada arriba dice en que pantalla fue", () => {
    const contexto = String(
      mensajesDelTurno(
        peticion({
          accion: {
            name: "ver_categoria",
            surfaceId: "principal",
            sourceComponentId: "gasto",
            timestamp: "2026-09-13T09:00:00Z",
            context: { categoriaId: "cat_renta" },
          },
          pantallaDeLaAccion: "p1",
        }),
      ).at(-1)!.content,
    );
    expect(contexto).toContain('tocar "gasto" en la pantalla anterior p1');
  });
});

describe("instruccionDeAccion", () => {
  it("una accion en su lugar cierra con ajustar_pantalla sobre la misma tarjeta, sin Confirmacion", () => {
    expect(ACCIONES_EN_SU_LUGAR.has("programar_abono_capital")).toBe(true);
    const texto = instruccionDeAccion("programar_abono_capital", "credito");
    expect(texto).toContain("ejecutar_decision");
    expect(texto).toContain("`ajustar_pantalla`");
    expect(texto).toContain('"credito"');
    expect(texto).toContain("NO pintes otra pantalla");
    expect(texto).not.toContain("pantalla:");
  });

  it("si la tarjeta esta arriba, le dice que pantalla nombrar", () => {
    expect(instruccionDeAccion("programar_abono_capital", "credito", "p1")).toContain('`pantalla: "p1"`');
  });

  it("las demas acciones de mutacion siguen repintando", () => {
    expect(instruccionDeAccion("aplicar_plan_pago", "plan")).toContain("Cierra con `pintar_pantalla`");
  });
});

describe("esquemaPeticion", () => {
  it("acepta pantallas anteriores y de donde vino la accion", () => {
    expect(esquemaPeticion.safeParse({ ...peticion(), pantallaDeLaAccion: "p1" }).success).toBe(true);
  });

  it("rechaza un id de pantalla que no es p<n> y mas de 3 anteriores", () => {
    expect(esquemaPeticion.safeParse({ ...peticion(), pantallaDeLaAccion: "principal" }).success).toBe(false);
    const cuatro = [1, 2, 3, 4].map((n) => ({ ...GASTO, pantalla: `p${n}` }));
    expect(esquemaPeticion.safeParse(peticion({ superficie: { ...ACTUAL, anteriores: cuatro } })).success).toBe(false);
  });
});

describe("parchesDeterministas: la cifra que ya dio una tool no la copia el modelo", () => {
  const conSimulador = {
    arbol: [
      { id: "root", component: "Column", children: ["simulador"] },
      {
        id: "simulador",
        component: "SimuladorMeta",
        metaCentavos: 9600000,
        aportacionCentavos: { path: "/ahorro/sugerida" },
        aportacionMaximaCentavos: 498617,
        razon: "Te sobran $4,986.17 al mes",
      },
    ],
    dataModel: { ahorro: { sugerida: 450000 } },
  };
  const programo = {
    ejecutar_decision: {
      accion: "programar_abono_capital",
      resultadoAccion: { capacidadAhorro: { antesCentavos: 498617, despuesCentavos: 355712 } },
    },
  };

  it("tras programar un abono, el tope del simulador sale de capacidadAhorro y la aportacion se recorta", () => {
    expect(parchesDeterministas(conSimulador, programo)).toEqual([
      { id: "simulador", props: { aportacionMaximaCentavos: 355712, aportacionCentavos: 355712 } },
    ]);
  });

  it("pisa lo que invento el modelo para esas props y respeta lo demas", () => {
    const r = armarParches(
      {
        razon: RAZON,
        texto: "Programado.",
        parchesDatos: [],
        parchesComponentes: [{ id: "simulador", props: { aportacionMaximaCentavos: 520000, razon: "Te quedan libres" } }],
      },
      conSimulador,
      [],
      programo,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const componentes = (r.mensajes[0] as { updateComponents: { components: Array<Record<string, unknown>> } }).updateComponents.components;
      expect(componentes[0]).toMatchObject({ aportacionMaximaCentavos: 355712, aportacionCentavos: 355712, razon: "Te quedan libres" });
    }
  });

  it("si el modelo no toco el simulador, el host lo agrega", () => {
    const r = armarParches({ razon: RAZON, texto: "Programado.", parchesDatos: [{ path: "/ahorro/sugerida", value: 300000 }] }, conSimulador, [], programo);
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.stringify(r.mensajes)).toContain('"aportacionMaximaCentavos":355712');
  });

  it("sin una accion de abono en el turno no agrega nada", () => {
    expect(parchesDeterministas(conSimulador, {})).toEqual([]);
    expect(parchesDeterministas(conSimulador, { ejecutar_decision: { accion: "crear_apartado", resultadoAccion: {} } })).toEqual([]);
  });
});
