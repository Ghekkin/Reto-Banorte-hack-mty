import { describe, expect, it, vi } from "vitest";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { correrTurno } from "../agente";
import { mensajesDelTurno } from "../historial";
import { herramientasDelMcp } from "../mcp-cliente";
import { armarMensajes } from "../pantalla";
import type { LineaStream, PeticionAgente } from "../tipos";
import { modeloGuionizado, pasoConTool } from "./ayudas";

/**
 * El bucle del agente con un modelo simulado: prueba el CABLEADO (tools -> A2UI ->
 * stream JSONL, reintento incluido) sin llave y sin red. Que el modelo real decida bien
 * es otra cosa y se mide con los prompts del guion (skill `probar`, nivel 4).
 */

const PANTALLA_VALIDA = JSON.stringify([
  { id: "root", component: "Column", children: ["conf"] },
  {
    id: "conf",
    component: "Confirmacion",
    titulo: "Tu plan quedo activo",
    detalle: "18 meses de $3,193.35",
    razon: "Te muestro esto porque tu tarjeta estaba al 97 % de su limite",
  },
]);

function peticion(extra: Partial<PeticionAgente> = {}): PeticionAgente {
  return {
    usuarioId: "usr_beto",
    conversacionId: "c_prueba",
    mensajes: [{ rol: "usuario", texto: "Quiero pagar menos intereses de mi tarjeta" }],
    ...extra,
  };
}

async function recolectar(generador: AsyncGenerator<LineaStream>): Promise<LineaStream[]> {
  const lineas: LineaStream[] = [];
  for await (const linea of generador) lineas.push(linea);
  return lineas;
}

/** Una tool de datos de mentiras, con la forma de una del MCP. */
function toolsDePrueba(espia = vi.fn()): ToolSet {
  return {
    consultar_tarjeta: tool({
      description: "Consulta la tarjeta",
      inputSchema: z.object({ usuarioId: z.string() }),
      execute: (entrada) => {
        espia(entrada);
        return { tarjeta: { saldoCentavos: 4738600, usoDelLimite: 0.967 }, alerta: "mora" };
      },
    }),
  };
}

describe("correrTurno", () => {
  it("consulta una tool, pinta la pantalla y cierra el turno", async () => {
    const espia = vi.fn();
    const lineas = await recolectar(
      correrTurno(peticion(), {
        modelo: modeloGuionizado([
          pasoConTool("consultar_tarjeta", { usuarioId: "usr_beto" }),
          pasoConTool("pintar_pantalla", {
            razon: "Tu tarjeta esta al 97 % de su limite y pagas $2,950 de intereses al mes",
            texto: "Te dejo tres planes para bajarle a los intereses.",
            componentesJson: PANTALLA_VALIDA,
            datosJson: JSON.stringify({ tarjeta: { saldoCentavos: 4738600 } }),
            sugerencias: ["¿Y en que se me va el dinero?"],
          }),
        ]),
        herramientas: toolsDePrueba(espia),
      }),
    );

    const tipos = lineas.map((l) => l.tipo);
    expect(tipos[0]).toBe("estado");
    expect(tipos).toContain("tool");
    expect(tipos.filter((t) => t === "a2ui")).toHaveLength(3);
    expect(tipos.at(-1)).toBe("fin");
    expect(tipos).not.toContain("error");

    // La tool se llamo de verdad, con el usuario del turno.
    expect(espia).toHaveBeenCalledWith({ usuarioId: "usr_beto" });

    const llamada = lineas.find((l) => l.tipo === "tool");
    expect(llamada).toMatchObject({ nombre: "consultar_tarjeta", ok: true });

    // Los tres mensajes A2UI, en orden y sobre la superficie del contrato.
    const a2ui = lineas.filter((l) => l.tipo === "a2ui").map((l) => (l as { mensaje: Record<string, unknown> }).mensaje);
    expect(a2ui[0]).toHaveProperty("createSurface");
    expect(a2ui[1]).toHaveProperty("updateComponents");
    expect(a2ui[2]).toHaveProperty("updateDataModel");
    for (const m of a2ui) expect(m.version).toBe("v0.9.1");

    expect(lineas.find((l) => l.tipo === "texto")).toMatchObject({ valor: expect.stringContaining("planes") });
    expect(lineas.find((l) => l.tipo === "razon")).toBeDefined();
    expect(lineas.find((l) => l.tipo === "sugerencias")).toMatchObject({ valores: ["¿Y en que se me va el dinero?"] });
    expect(lineas.at(-1)).toMatchObject({ tipo: "fin", pasos: 2 });
  });

  it("una pantalla invalida se reintenta una vez y no llega al renderer", async () => {
    const lineas = await recolectar(
      correrTurno(peticion(), {
        modelo: modeloGuionizado([
          pasoConTool("pintar_pantalla", {
            razon: "Una razon suficientemente larga para el schema",
            texto: "Ahi va.",
            // `Inventado` no esta en el catalogo y no hay raiz: dos errores.
            componentesJson: JSON.stringify([{ id: "x", component: "Inventado" }]),
          }),
          pasoConTool("pintar_pantalla", {
            razon: "Tu tarjeta esta al 97 % de su limite",
            texto: "Corregido.",
            componentesJson: PANTALLA_VALIDA,
          }),
        ]),
        herramientas: toolsDePrueba(),
      }),
    );

    const errores = lineas.filter((l) => l.tipo === "error");
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatchObject({ codigo: "a2ui" });
    expect((errores[0] as { mensaje: string }).mensaje).toMatch(/no esta en el catalogo/);
    // Y aun asi el turno acaba con pantalla: el reintento la arreglo.
    expect(lineas.filter((l) => l.tipo === "a2ui")).toHaveLength(3);
    expect(lineas.find((l) => l.tipo === "texto")).toMatchObject({ valor: "Corregido." });
  });

  it("si nunca logra una pantalla valida, contesta en prosa y no se queda mudo", async () => {
    const malo = {
      razon: "Una razon suficientemente larga para el schema",
      texto: "Ahi va.",
      componentesJson: "{ esto no es JSON",
    };
    const lineas = await recolectar(
      correrTurno(peticion(), {
        modelo: modeloGuionizado([
          pasoConTool("pintar_pantalla", malo, "Tu tarjeta trae saldo de $47,386. "),
          pasoConTool("pintar_pantalla", malo),
        ]),
        herramientas: toolsDePrueba(),
      }),
    );

    expect(lineas.filter((l) => l.tipo === "a2ui")).toHaveLength(0);
    expect(lineas.filter((l) => l.tipo === "error").length).toBeGreaterThanOrEqual(2);
    expect(lineas.find((l) => l.tipo === "texto")).toMatchObject({ valor: expect.stringContaining("$47,386") });
    expect(lineas.at(-1)?.tipo).toBe("fin");
  });

  it("respeta el tope de pasos en vez de ciclarse", async () => {
    const pasos = Array.from({ length: 12 }, () => pasoConTool("consultar_tarjeta", { usuarioId: "usr_beto" }));
    const lineas = await recolectar(
      correrTurno(peticion(), { modelo: modeloGuionizado(pasos), herramientas: toolsDePrueba() }),
    );
    const fin = lineas.at(-1) as { tipo: string; pasos: number };
    expect(fin.tipo).toBe("fin");
    expect(fin.pasos).toBeLessThanOrEqual(8);
  });
});

describe("herramientasDelMcp", () => {
  /** Un MCP de mentiras: publica una tool de lectura y una de accion. */
  function clienteFalso(registro: Array<{ nombre: string; argumentos: unknown }>) {
    return {
      listTools: async () => ({
        tools: [
          {
            name: "consultar_tarjeta",
            description: "lee",
            inputSchema: { type: "object", properties: { usuarioId: { type: "string" } }, required: ["usuarioId"] },
            annotations: { readOnlyHint: true },
          },
          {
            name: "aplicar_plan_pago",
            description: "aplica",
            inputSchema: {
              type: "object",
              properties: {
                usuarioId: { type: "string" },
                plazoMeses: { type: "integer" },
                idempotencyKey: { type: "string" },
              },
              required: ["usuarioId", "plazoMeses", "idempotencyKey"],
            },
            annotations: { readOnlyHint: false },
          },
        ],
      }),
      callTool: async ({ name, arguments: argumentos }: { name: string; arguments: unknown }) => {
        registro.push({ nombre: name, argumentos });
        return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
      },
    } as unknown as Client;
  }

  it("publica una tool del AI SDK por cada tool del MCP", async () => {
    const herramientas = await herramientasDelMcp(clienteFalso([]), { usuarioId: "usr_beto" });
    expect(Object.keys(herramientas)).toEqual(["consultar_tarjeta", "aplicar_plan_pago"]);
  });

  it("fuerza el usuarioId del turno aunque el modelo escriba otro", async () => {
    const registro: Array<{ nombre: string; argumentos: unknown }> = [];
    const herramientas = await herramientasDelMcp(clienteFalso(registro), { usuarioId: "usr_beto" });
    await herramientas.consultar_tarjeta!.execute!({ usuarioId: "usr_ana" }, { toolCallId: "1", messages: [] });
    expect(registro[0]!.argumentos).toEqual({ usuarioId: "usr_beto" });
  });

  it("le pone a la accion la llave de idempotencia de la interfaz si falta", async () => {
    const registro: Array<{ nombre: string; argumentos: unknown }> = [];
    const herramientas = await herramientasDelMcp(clienteFalso(registro), {
      usuarioId: "usr_beto",
      idempotencyKey: "c_prueba:2026-09-13T01:00:00Z",
    });
    await herramientas.aplicar_plan_pago!.execute!({ plazoMeses: 18 }, { toolCallId: "1", messages: [] });
    expect(registro[0]!.argumentos).toEqual({
      plazoMeses: 18,
      usuarioId: "usr_beto",
      idempotencyKey: "c_prueba:2026-09-13T01:00:00Z",
    });
  });

  it("avisa cuando una tool falla, en vez de lanzar", async () => {
    const cliente = {
      listTools: async () => ({
        tools: [{ name: "consultar_tarjeta", inputSchema: { type: "object", properties: {} } }],
      }),
      callTool: async () => ({ isError: true, content: [{ type: "text", text: "no existe el usuario" }] }),
    } as unknown as Client;
    const llamadas: Array<{ ok: boolean }> = [];
    const herramientas = await herramientasDelMcp(cliente, {
      usuarioId: "usr_beto",
      alTerminar: (l) => llamadas.push(l),
    });
    const salida = await herramientas.consultar_tarjeta!.execute!({}, { toolCallId: "1", messages: [] });
    expect(salida).toEqual({ error: "no existe el usuario" });
    expect(llamadas[0]!.ok).toBe(false);
  });
});

describe("armarMensajes", () => {
  const base = { razon: "Una razon suficientemente larga", texto: "Listo." };

  it("rechaza un componente que no esta en el catalogo", () => {
    const r = armarMensajes({ ...base, componentesJson: JSON.stringify([{ id: "root", component: "Tabla" }]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/no esta en el catalogo/);
  });

  it("rechaza un arbol sin raiz", () => {
    const r = armarMensajes({ ...base, componentesJson: JSON.stringify([{ id: "x", component: "Column" }]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/componente raiz/);
  });

  it("rechaza un hijo que no existe", () => {
    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify([{ id: "root", component: "Column", children: ["fantasma"] }]),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/fantasma/);
  });

  it("rechaza props que no cumplen el schema del componente", () => {
    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify([
        { id: "root", component: "Confirmacion", detalle: "falta el titulo", razon: base.razon },
      ]),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/titulo/);
  });

  it("acepta props enlazadas al data model sin validarlas por valor", () => {
    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify([
        {
          id: "root",
          component: "Confirmacion",
          titulo: { path: "/plan/titulo" },
          detalle: { path: "/plan/detalle" },
          razon: base.razon,
        },
      ]),
      datosJson: JSON.stringify({ plan: { titulo: "Listo", detalle: "18 meses" } }),
    });
    expect(r.ok).toBe(true);
  });

  it("le pone al componente la razon del turno si se le olvido", () => {
    const r = armarMensajes({
      ...base,
      componentesJson: JSON.stringify([{ id: "root", component: "Confirmacion", titulo: "T", detalle: "D" }]),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const mensaje = r.mensajes[1] as { updateComponents: { components: Array<{ razon?: string }> } };
      expect(mensaje.updateComponents.components[0]!.razon).toBe(base.razon);
    }
  });
});

describe("mensajesDelTurno", () => {
  it("manda el historial como texto y el contexto al final", () => {
    const mensajes = mensajesDelTurno(
      peticion({
        mensajes: [
          { rol: "usuario", texto: "hola" },
          { rol: "agente", texto: "te muestro tres planes" },
        ],
      }),
    );
    expect(mensajes.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(String(mensajes.at(-1)!.content)).toContain("usr_beto");
    expect(String(mensajes.at(-1)!.content)).toContain("primer turno");
  });

  it("cuando viene una accion de mutacion, le dice que llame la tool del mismo nombre", () => {
    const mensajes = mensajesDelTurno(
      peticion({
        mensajes: [{ rol: "accion", texto: "aplicar_plan_pago {...}" }],
        accion: {
          name: "aplicar_plan_pago",
          surfaceId: "principal",
          sourceComponentId: "btn_aplicar",
          timestamp: "2026-09-13T01:12:00Z",
          context: { plazoMeses: 18, idempotencyKey: "c_prueba:2026-09-13T01:12:00Z" },
        },
        superficie: { surfaceId: "principal", componentes: ["PlanDePago"], dataModel: { planElegido: 18 } },
      }),
    );
    const contexto = String(mensajes.at(-1)!.content);
    expect(contexto).toContain('la tool "aplicar_plan_pago"');
    expect(contexto).toContain("idempotencyKey");
    expect(contexto).toContain("PlanDePago");
    expect(String(mensajes[0]!.content)).toContain("toco la interfaz");
  });

  it("una accion de vista no pide tools de accion", () => {
    const mensajes = mensajesDelTurno(
      peticion({
        accion: {
          name: "ver_categoria",
          surfaceId: "principal",
          sourceComponentId: "cat_restaurantes",
          timestamp: "2026-09-13T01:12:00Z",
          context: { categoriaId: "cat_restaurantes" },
        },
      }),
    );
    expect(String(mensajes.at(-1)!.content)).toContain("solo cambia la vista");
  });
});
