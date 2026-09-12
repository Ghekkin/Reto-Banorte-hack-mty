import { describe, expect, it } from "vitest";
import { procesar, procesarVarios } from "../procesar";
import { escribir, leer, resolver } from "../bindings";
import { arbol, componentesVisibles, nombresVisibles } from "../arbol";
import { validarMensaje } from "../validar";
import { emitirAccion } from "../acciones";
import { estadoVacio, propsDe, VERSION_A2UI, type MensajeA2UI } from "../tipos";

const crear: MensajeA2UI = {
  version: VERSION_A2UI,
  createSurface: { surfaceId: "principal", catalogId: "http://localhost:3000/catalogo/v1.json" },
};

/** Formato de la spec: props planas junto a id y component; raiz con id "root". */
const componentes: MensajeA2UI = {
  version: VERSION_A2UI,
  updateComponents: {
    surfaceId: "principal",
    components: [
      { id: "root", component: "Column", children: ["resumen", "plan"] },
      { id: "resumen", component: "ResumenTarjeta", saldoCentavos: { path: "/tarjeta/saldoCentavos" } },
      {
        id: "plan",
        component: "PlanDePago",
        plazoElegido: { path: "/planElegido" },
        action: { event: { name: "aplicar_plan_pago", context: { plazo: { path: "/planElegido" } } } },
      },
    ],
  },
};

describe("procesar", () => {
  it("crea la superficie y la borra", () => {
    const { estado } = procesar(estadoVacio(), crear);
    expect(estado.get("principal")?.catalogId).toContain("/catalogo/v1.json");
    const { estado: sin } = procesar(estado, {
      version: VERSION_A2UI,
      deleteSurface: { surfaceId: "principal" },
    });
    expect(sin.has("principal")).toBe(false);
  });

  it("toma como raiz el componente con id root", () => {
    const { estado } = procesarVarios(estadoVacio(), [crear, componentes]);
    expect(estado.get("principal")?.raiz).toBe("root");
  });

  it("si el agente olvida root, cae al componente que nadie declara como hijo", () => {
    const { estado } = procesarVarios(estadoVacio(), [
      crear,
      {
        version: VERSION_A2UI,
        updateComponents: {
          surfaceId: "principal",
          components: [
            { id: "col", component: "Column", children: ["texto"] },
            { id: "texto", component: "Text" },
          ],
        },
      },
    ]);
    expect(estado.get("principal")?.raiz).toBe("col");
  });

  it("no toca el estado si la superficie no existe", () => {
    const inicial = estadoVacio();
    const { estado, error } = procesar(inicial, {
      version: VERSION_A2UI,
      updateDataModel: { surfaceId: "fantasma", path: "/saldo", value: 1 },
    });
    expect(error).toMatch(/desconocida/);
    expect(estado).toBe(inicial);
  });

  it("updateDataModel en / reemplaza todo el modelo", () => {
    const { estado } = procesarVarios(estadoVacio(), [
      crear,
      { version: VERSION_A2UI, updateDataModel: { surfaceId: "principal", path: "/tarjeta/saldo", value: 4738600 } },
      { version: VERSION_A2UI, updateDataModel: { surfaceId: "principal", path: "/", value: { planElegido: 18 } } },
    ]);
    expect(estado.get("principal")?.dataModel).toEqual({ planElegido: 18 });
  });
});

describe("propsDe", () => {
  it("separa las props de las llaves reservadas", () => {
    expect(
      propsDe({ id: "x", component: "PlanDePago", children: ["a"], action: { event: { name: "n" } }, plazo: 18 }),
    ).toEqual({ plazo: 18 });
  });
});

describe("bindings", () => {
  const modelo = { tarjeta: { saldo: 4738600 }, opciones: [{ plazo: 12 }, { plazo: 18 }] };

  it("lee por JSON Pointer, incluidos indices de arreglo", () => {
    expect(leer(modelo, "/tarjeta/saldo")).toBe(4738600);
    expect(leer(modelo, "/opciones/1/plazo")).toBe(18);
    expect(leer(modelo, "/no/existe")).toBeUndefined();
  });

  it("escribe sin mutar el original", () => {
    const nuevo = escribir(modelo as Record<string, unknown>, "/tarjeta/saldo", 0);
    expect(nuevo.tarjeta).toEqual({ saldo: 0 });
    expect(modelo.tarjeta.saldo).toBe(4738600);
  });

  it("resuelve props anidadas y paths relativos contra el item", () => {
    expect(resolver({ saldo: { path: "/tarjeta/saldo" }, fijo: "texto" }, modelo)).toEqual({
      saldo: 4738600,
      fijo: "texto",
    });
    expect(resolver({ p: { path: "plazo" } }, modelo, { plazo: 24 })).toEqual({ p: 24 });
  });
});

describe("arbol", () => {
  it("arma tres niveles y avisa de un hijo inexistente", () => {
    const { estado } = procesarVarios(estadoVacio(), [
      crear,
      {
        version: VERSION_A2UI,
        updateComponents: {
          surfaceId: "principal",
          components: [
            { id: "root", component: "Column", children: ["fila", "fantasma"] },
            { id: "fila", component: "Row", children: ["texto"] },
            { id: "texto", component: "Text" },
          ],
        },
      },
    ]);
    const avisos: string[] = [];
    const raiz = arbol(estado.get("principal")!, (m) => avisos.push(m));
    expect(raiz?.hijos[0]?.hijos[0]?.componente.id).toBe("texto");
    expect(avisos.join()).toMatch(/fantasma/);
  });

  it("repite una plantilla por cada elemento de la lista del data model", () => {
    const { estado } = procesarVarios(estadoVacio(), [
      crear,
      {
        version: VERSION_A2UI,
        updateDataModel: {
          surfaceId: "principal",
          path: "/",
          value: { opciones: [{ plazo: 6 }, { plazo: 12 }, { plazo: 18 }] },
        },
      },
      {
        version: VERSION_A2UI,
        updateComponents: {
          surfaceId: "principal",
          components: [
            { id: "root", component: "Column", children: { componentId: "opcion", path: "/opciones" } },
            { id: "opcion", component: "Text", texto: { path: "plazo" } },
          ],
        },
      },
    ]);
    const raiz = arbol(estado.get("principal")!);
    expect(raiz?.hijos).toHaveLength(3);
    expect(raiz?.hijos[2]?.item).toEqual({ plazo: 18 });
  });
});

describe("validar", () => {
  it("rechaza un mensaje sin version", () => {
    expect(validarMensaje({ createSurface: { surfaceId: "principal", catalogId: "x" } }).ok).toBe(false);
  });

  it("rechaza un componente fuera del catalogo", () => {
    const r = validarMensaje(
      {
        version: VERSION_A2UI,
        updateComponents: { surfaceId: "principal", components: [{ id: "root", component: "NoExiste" }] },
      },
      new Set(["PlanDePago"]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join()).toMatch(/NoExiste/);
  });

  it("acepta los mensajes bien formados, con plantilla incluida", () => {
    expect(validarMensaje(crear).ok).toBe(true);
    expect(validarMensaje(componentes).ok).toBe(true);
  });
});

describe("acciones", () => {
  it("resuelve el context contra el data model y agrega la llave de idempotencia", () => {
    const accion = emitirAccion({
      componente: {
        id: "btn_aplicar",
        component: "Button",
        action: { event: { name: "aplicar_plan_pago", context: { plazo: { path: "/planElegido" } } } },
      },
      surfaceId: "principal",
      dataModel: { planElegido: 18 },
      conversacionId: "c_01J",
      ahora: () => "2026-09-13T01:12:00Z",
    });
    expect(accion).toEqual({
      name: "aplicar_plan_pago",
      surfaceId: "principal",
      sourceComponentId: "btn_aplicar",
      timestamp: "2026-09-13T01:12:00Z",
      context: { plazo: 18, idempotencyKey: "c_01J:2026-09-13T01:12:00Z" },
    });
  });
});

describe("componentesVisibles", () => {
  /** El caso del issue #3: dos pantallas seguidas sobre la misma superficie. */
  const confirmacion: MensajeA2UI = {
    version: VERSION_A2UI,
    updateComponents: {
      surfaceId: "principal",
      components: [{ id: "root", component: "Confirmacion", titulo: "Tu plan quedo activo" }],
    },
  };

  it("devuelve solo lo alcanzable desde la raiz, no el historico del Map", () => {
    const { estado } = procesarVarios(estadoVacio(), [crear, componentes, confirmacion]);
    const superficie = estado.get("principal")!;
    // El Map sigue teniendo los tres de la pantalla anterior: es upsert, no reemplazo.
    expect(superficie.componentes.size).toBe(3);
    expect(componentesVisibles(superficie).map((c) => c.component)).toEqual(["Confirmacion"]);
  });

  it("lista el arbol completo cuando todo esta enlazado", () => {
    const { estado } = procesarVarios(estadoVacio(), [crear, componentes]);
    expect(componentesVisibles(estado.get("principal")!).map((c) => c.component)).toEqual([
      "Column",
      "ResumenTarjeta",
      "PlanDePago",
    ]);
  });

  it("un componente repetido por plantilla aparece una sola vez", () => {
    const conPlantilla: MensajeA2UI = {
      version: VERSION_A2UI,
      updateComponents: {
        surfaceId: "principal",
        components: [
          { id: "root", component: "Column", children: { componentId: "fila", path: "/movimientos" } },
          { id: "fila", component: "Text", texto: { path: "/descripcion" } },
        ],
      },
    };
    const datos: MensajeA2UI = {
      version: VERSION_A2UI,
      updateDataModel: {
        surfaceId: "principal",
        path: "/",
        value: { movimientos: [{ descripcion: "uno" }, { descripcion: "dos" }] },
      },
    };
    const { estado } = procesarVarios(estadoVacio(), [crear, conPlantilla, datos]);
    expect(componentesVisibles(estado.get("principal")!).map((c) => c.component)).toEqual(["Column", "Text"]);
  });

  it("sin superficie pintada, no hay nada visible", () => {
    const { estado } = procesar(estadoVacio(), crear);
    expect(componentesVisibles(estado.get("principal")!)).toEqual([]);
    expect(nombresVisibles(estado.get("principal")!)).toEqual([]);
  });

  it("nombresVisibles no repite un componente que sale dos veces", () => {
    const dosVeces: MensajeA2UI = {
      version: VERSION_A2UI,
      updateComponents: {
        surfaceId: "principal",
        components: [
          { id: "root", component: "Column", children: ["a", "b"] },
          { id: "a", component: "Text", texto: "uno" },
          { id: "b", component: "Text", texto: "dos" },
        ],
      },
    };
    const { estado } = procesarVarios(estadoVacio(), [crear, dosVeces]);
    expect(nombresVisibles(estado.get("principal")!)).toEqual(["Column", "Text"]);
  });
});

/* --- Fidelidad a la spec: lo que el renderer tenia a medias (ADR 0008) --- */

import { borrar } from "../bindings";
import { revisarArbolCompleto } from "../validar";
import { variablesDelTema } from "../Superficie";

describe("updateDataModel, los dos opcionales de la spec", () => {
  const conDatos = () => {
    const { estado } = procesarVarios(estadoVacio(), [
      crear,
      {
        version: VERSION_A2UI,
        updateDataModel: { surfaceId: "principal", path: "/", value: { tarjeta: { saldoCentavos: 100 }, plazo: 18 } },
      },
    ]);
    return estado;
  };

  it("sin `value`, borra la llave: 'the key at path is removed'", () => {
    const { estado } = procesar(conDatos(), {
      version: VERSION_A2UI,
      updateDataModel: { surfaceId: "principal", path: "/plazo" },
    });
    const modelo = estado.get("principal")!.dataModel;
    expect("plazo" in modelo).toBe(false);
    expect(modelo.tarjeta).toEqual({ saldoCentavos: 100 });
  });

  it("sin `path`, se refiere al modelo entero", () => {
    const { estado } = procesar(conDatos(), {
      version: VERSION_A2UI,
      updateDataModel: { surfaceId: "principal", value: { otro: true } },
    });
    expect(estado.get("principal")!.dataModel).toEqual({ otro: true });
  });

  it("borrar no muta el original y aguanta un camino que no existe", () => {
    const antes = { a: { b: 1, c: 2 } };
    expect(borrar(antes, "/a/b")).toEqual({ a: { c: 2 } });
    expect(antes).toEqual({ a: { b: 1, c: 2 } });
    expect(borrar(antes, "/no/existe")).toEqual(antes);
  });
});

describe("el tema de la superficie", () => {
  it("se guarda tal como vino en createSurface", () => {
    const { estado } = procesar(estadoVacio(), {
      version: VERSION_A2UI,
      createSurface: { surfaceId: "principal", catalogId: "x", theme: { primaryColor: "#EC0029" } },
    });
    expect(estado.get("principal")!.theme).toEqual({ primaryColor: "#EC0029" });
  });

  it("se traduce a variable CSS solo si el color es un hex de verdad", () => {
    expect(variablesDelTema({ primaryColor: "#EC0029" })).toEqual({ "--primary": "#EC0029" });
    expect(variablesDelTema({ primaryColor: "rojo" })).toBeUndefined();
    expect(variablesDelTema(undefined)).toBeUndefined();
  });
});

describe("arbolCompleto: el cerco que se pide cuando llega la pantalla entera", () => {
  const pantalla = (components: unknown[]): MensajeA2UI =>
    ({ version: VERSION_A2UI, updateComponents: { surfaceId: "principal", components } }) as MensajeA2UI;

  it("sin la opcion, un updateComponents incremental es legitimo (lo permite la spec)", () => {
    const r = validarMensaje(pantalla([{ id: "plan", component: "PlanDePago" }]));
    expect(r.ok).toBe(true);
  });

  it("con la opcion, exige la raiz root", () => {
    const r = validarMensaje(pantalla([{ id: "plan", component: "PlanDePago" }]), { arbolCompleto: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain("root");
  });

  it("con la opcion, rechaza un hijo que no viene en la lista", () => {
    const r = validarMensaje(pantalla([{ id: "root", component: "Column", children: ["fantasma"] }]), {
      arbolCompleto: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toContain("fantasma");
  });

  it("revisarArbolCompleto tambien mira la plantilla", () => {
    const errores = revisarArbolCompleto([
      { id: "root", component: "Column", children: { componentId: "fila", path: "/lista" } },
    ]);
    expect(errores.join(" ")).toContain("fila");
  });
});

describe("validarMensaje con validador de schemas", () => {
  it("delega en el y arrastra sus errores con el lugar donde pasan", () => {
    const r = validarMensaje(crear, {
      esquema: () => [{ donde: "/createSurface/catalogId", mensaje: "debe ser una URL" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toEqual(["/createSurface/catalogId debe ser una URL"]);
  });

  it("no lo llama si la estructura ya viene mal: sus errores solo estorbarian", () => {
    let llamado = false;
    const r = validarMensaje({ version: "v0.1", createSurface: { surfaceId: "x", catalogId: "y" } }, {
      esquema: () => {
        llamado = true;
        return [];
      },
    });
    expect(r.ok).toBe(false);
    expect(llamado).toBe(false);
  });
});

describe("updateComponents vacio", () => {
  it("se rechaza: la spec pide minItems 1", () => {
    const r = validarMensaje({
      version: VERSION_A2UI,
      updateComponents: { surfaceId: "principal", components: [] },
    });
    expect(r.ok).toBe(false);
  });
});
