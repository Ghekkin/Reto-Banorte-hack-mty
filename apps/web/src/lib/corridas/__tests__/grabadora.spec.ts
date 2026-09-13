import { tool, type ToolSet } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { correrTurno } from "@/lib/agente/agente";
import { modeloGuionizado, pasoConTool } from "@/lib/agente/__tests__/ayudas";
import type { LineaStream, PeticionAgente } from "@/lib/agente/tipos";
import { generarPortada } from "@/lib/inicio/generar";
import { corridasActivas } from "../escritor";
import { acotar, type CorridaTerminada, type Escritor, type FilaCorrida } from "../grabadora";

/**
 * Lo que tiene que quedar de una corrida para depurarla sin adivinar: con que modelo, que
 * tools se ofrecieron, cada paso con su uso, cada tool con lo que entro y lo que salio, cada
 * linea que vio el navegador y el chat. Se prueba con un escritor en memoria: ninguna
 * prueba escribe en la base (ADR 0010).
 */

function escritorDePrueba() {
  const iniciadas: FilaCorrida[] = [];
  const terminadas: CorridaTerminada[] = [];
  const escritor: Escritor = {
    activo: () => true,
    iniciar: async (_prompts, corrida) => {
      iniciadas.push(corrida);
    },
    terminar: async (corrida) => {
      terminadas.push(corrida);
    },
  };
  return { escritor, iniciadas, terminadas };
}

const PANTALLA = JSON.stringify([
  {
    id: "root",
    component: "Conclusion",
    titular: "Tu tarjeta ya te esta costando mucho",
    razon: "Tu tarjeta esta al 97 % de su limite y pagas de mas en intereses",
  },
]);

function toolsDePrueba(): ToolSet {
  return {
    consultar_tarjeta: tool({
      description: "Consulta la tarjeta",
      inputSchema: z.object({ usuarioId: z.string() }),
      execute: () => ({ tarjeta: { saldoCentavos: 4738600 } }),
    }),
  };
}

const peticion: PeticionAgente = {
  usuarioId: "usr_beto",
  conversacionId: "c_grabada",
  mensajes: [{ rol: "usuario", texto: "Quiero pagar menos intereses" }],
};

async function turnoGrabado() {
  const { escritor, iniciadas, terminadas } = escritorDePrueba();
  const modelo = modeloGuionizado([
    pasoConTool("consultar_tarjeta", { usuarioId: "usr_beto" }),
    pasoConTool("pintar_pantalla", { razon: "Tu tarjeta esta al 97 % de su limite", texto: "Te dejo el plan.", componentesJson: PANTALLA }),
  ]);
  const lineas: LineaStream[] = [];
  for await (const linea of correrTurno(peticion, { modelo, herramientas: toolsDePrueba(), escritor })) lineas.push(linea);
  // La escritura va en segundo plano: se espera a que la cola se vacie.
  await new Promise((r) => setTimeout(r, 10));
  return { lineas, iniciadas, terminadas };
}

describe("la corrida de un turno", () => {
  it("el fin del stream lleva el corridaId, y es el de la fila guardada", async () => {
    const { lineas, terminadas } = await turnoGrabado();
    const fin = lineas.at(-1);
    expect(fin?.tipo).toBe("fin");
    expect(fin?.tipo === "fin" && fin.corridaId).toBe(terminadas[0]!.corrida.id);
  });

  it("se guarda temprano con estado corriendo, y al final con el resultado", async () => {
    const { iniciadas, terminadas } = await turnoGrabado();
    expect(iniciadas[0]!.estado).toBe("corriendo");
    const { corrida } = terminadas[0]!;
    expect(corrida.estado).toBe("ok");
    expect(corrida.cierre).toBe("pintar");
    expect(corrida.pasos).toBe(2);
    expect(corrida.tokensEntrada).toBe(20); // suma de los dos pasos, no solo el ultimo
    expect(corrida.ms).toBeGreaterThanOrEqual(0);
  });

  it("dice con que modelo, que tools se ofrecieron y con que prompt", async () => {
    const { terminadas } = await turnoGrabado();
    const { corrida, prompts } = terminadas[0]!;
    expect(corrida.proveedor).toBe("mock-provider");
    expect(corrida.modelo).toBe("mock-model-id");
    expect(corrida.toolsOfrecidas).toContainEqual({ nombre: "consultar_tarjeta", origen: "mcp" });
    expect(corrida.toolsOfrecidas).toContainEqual({ nombre: "pintar_pantalla", origen: "cierre" });
    expect(prompts.map((p) => p.tipo)).toEqual(["sistema", "tools"]);
    expect(corrida.promptSistemaHash).toBe(prompts[0]!.hash);
    // El system prompt no se repite en cada corrida: va por hash.
    expect(JSON.stringify(corrida.mensajesModelo)).not.toContain("Eres Maya");
    expect(JSON.stringify(corrida.mensajesModelo)).toContain("contexto del turno");
  });

  it("cada paso con su uso y lo que pidio, y cada tool con argumentos y resultado", async () => {
    const { terminadas } = await turnoGrabado();
    const { pasos, tools } = terminadas[0]!;
    expect(pasos.map((p) => p.paso)).toEqual([0, 1]);
    expect(pasos[0]!.llamadas[0]!.nombre).toBe("consultar_tarjeta");
    expect(pasos[0]!.tokensEntrada).toBe(10);
    expect(pasos[0]!.toolsActivas).toContain("consultar_tarjeta");

    const tarjeta = tools.find((t) => t.nombre === "consultar_tarjeta")!;
    expect(tarjeta).toMatchObject({ paso: 0, origen: "mcp", ok: true, argumentos: { usuarioId: "usr_beto" } });
    expect(tarjeta.resultado).toEqual({ tarjeta: { saldoCentavos: 4738600 } });
    expect(tools.find((t) => t.nombre === "pintar_pantalla")).toMatchObject({ paso: 1, origen: "cierre", ok: true });
  });

  it("guarda cada linea que salio y el chat: lo que dijo la persona y lo que contesto Maya", async () => {
    const { lineas, terminadas } = await turnoGrabado();
    const t = terminadas[0]!;
    expect(t.corrida.lineas).toHaveLength(lineas.length);
    expect(t.chat?.conversacionId).toBe("c_grabada");
    expect(t.chat?.mensajes[0]).toEqual({ rol: "usuario", texto: "Quiero pagar menos intereses", datos: {} });
    const maya = t.chat!.mensajes[1]!;
    expect(maya.rol).toBe("agente");
    expect(maya.texto).toBe("Te dejo el plan.");
    expect((maya.datos as { a2ui: unknown[] }).a2ui.length).toBeGreaterThan(0);
  });

  it("con el escritor apagado no hay corridaId ni filas", async () => {
    const apagado: Escritor = { activo: () => false, iniciar: async () => {}, terminar: async () => {} };
    const modelo = modeloGuionizado([
      pasoConTool("pintar_pantalla", { razon: "Tu tarjeta esta al 97 % de su limite", texto: "Listo.", componentesJson: PANTALLA }),
    ]);
    const lineas: LineaStream[] = [];
    for await (const l of correrTurno(peticion, { modelo, herramientas: {}, escritor: apagado })) lineas.push(l);
    const fin = lineas.at(-1);
    expect(fin?.tipo === "fin" && "corridaId" in fin).toBe(false);
  });
});

describe("la corrida de una portada", () => {
  it("queda con tipo portada, motivo, datos reunidos y la pantalla que salio", async () => {
    const { escritor, terminadas } = escritorDePrueba();
    const modelo = modeloGuionizado([
      pasoConTool("pintar_pantalla", { razon: "Tu tarjeta esta al 97 % de su limite", texto: "Tu portada.", componentesJson: PANTALLA }),
    ]);
    const portada = await generarPortada("usr_beto", {
      modelo,
      herramientas: {},
      datos: { panorama_inicial: { perfil: { nombre: "Beto" } } },
      motivo: "reloj",
      escritor,
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(portada.ok).toBe(true);
    const { corrida } = terminadas[0]!;
    expect(portada.corridaId).toBe(corrida.id);
    expect(corrida).toMatchObject({ tipo: "portada", motivo: "reloj", estado: "ok", modelo: "mock-model-id" });
    expect(corrida.lineas.some((l) => l.tipo === "a2ui")).toBe(true);
    expect(terminadas[0]!.chat).toBeUndefined();
  });
});

describe("las reglas del escritor", () => {
  it("dentro de vitest el escritor real esta apagado: ninguna prueba escribe en la base", () => {
    expect(corridasActivas()).toBe(false);
  });

  it("un JSON enorme se guarda recortado y marcado", () => {
    const grande = { texto: "x".repeat(300_000) };
    expect(acotar(grande)).toMatchObject({ truncado: true, bytes: 300_012 });
    expect(acotar({ a: 1 })).toEqual({ a: 1 });
  });
});
