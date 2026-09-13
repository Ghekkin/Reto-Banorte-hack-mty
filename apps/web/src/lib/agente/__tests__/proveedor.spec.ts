import { describe, expect, it } from "vitest";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  EntradaAplicarPlanPago,
  EntradaCompararPeriodos,
  EntradaConsultarMovimientos,
  EntradaConsultarPerfil,
  EntradaConsultarPlan,
  EntradaConsultarTarjeta,
  EntradaCrearApartado,
  EntradaProyectarAhorro,
  EntradaSimularReestructura,
} from "@maya/schemas";
import { correrTurno } from "../agente";
import { herramientasDelMcp } from "../mcp-cliente";
import type { LineaStream } from "../tipos";

/**
 * La pregunta que esta prueba contesta sin gastar una llave: **¿el proveedor acepta los
 * schemas de nuestras 9 tools?** Un schema de Zod trae cosas que la API de Gemini no
 * conoce (`$schema`, `exclusiveMinimum`…) y si el proveedor no las quitara, cada turno
 * moriria con un 400 en plena demo.
 *
 * Se intercepta el `fetch` del proveedor, se inspecciona la peticion que iba a salir y se
 * responde con un error: asi tambien se comprueba que un proveedor caido deja el turno
 * con `error` + `fin` y no cuelga la interfaz.
 */

/** Los mismos schemas que publica el MCP, sin levantar el MCP. */
const ENTRADAS = {
  consultar_perfil: EntradaConsultarPerfil,
  consultar_tarjeta: EntradaConsultarTarjeta,
  consultar_movimientos: EntradaConsultarMovimientos,
  simular_reestructura: EntradaSimularReestructura,
  consultar_plan: EntradaConsultarPlan,
  aplicar_plan_pago: EntradaAplicarPlanPago,
  comparar_periodos: EntradaCompararPeriodos,
  proyectar_ahorro: EntradaProyectarAhorro,
  crear_apartado: EntradaCrearApartado,
};

function clienteConLosSchemasReales(): Client {
  return {
    listTools: async () => ({
      tools: Object.entries(ENTRADAS).map(([name, schema]) => ({
        name,
        description: `tool ${name}`,
        inputSchema: z.toJSONSchema(schema, { io: "input" }),
        annotations: { readOnlyHint: !name.startsWith("aplicar") && !name.startsWith("crear") },
      })),
    }),
    callTool: async () => ({ content: [{ type: "text", text: "{}" }] }),
    close: async () => undefined,
  } as unknown as Client;
}

/** Busca una llave en cualquier nivel del objeto: lo que Gemini rechazaria. */
function contieneLlave(valor: unknown, llave: string): boolean {
  if (Array.isArray(valor)) return valor.some((v) => contieneLlave(v, llave));
  if (typeof valor === "object" && valor !== null) {
    return Object.entries(valor).some(([k, v]) => k === llave || contieneLlave(v, llave));
  }
  return false;
}

describe("el proveedor real con nuestras tools", () => {
  it("convierte las 9 tools del MCP en declaraciones que Gemini acepta", async () => {
    let cuerpo: Record<string, unknown> | undefined;

    const google = createGoogleGenerativeAI({
      apiKey: "llave-de-prueba",
      fetch: async (_url, init) => {
        cuerpo = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ error: { message: "sin llave de verdad" } }), { status: 401 });
      },
    });

    const herramientas = await herramientasDelMcp(clienteConLosSchemasReales(), { usuarioId: "usr_beto" });
    const lineas: LineaStream[] = [];
    for await (const linea of correrTurno(
      {
        usuarioId: "usr_beto",
        conversacionId: "c_prueba",
        mensajes: [{ rol: "usuario", texto: "Quiero pagar menos intereses" }],
      },
      { modelo: google("gemini-3.8-flash"), herramientas },
    )) {
      lineas.push(linea);
    }

    // 1. La peticion salio armada.
    expect(cuerpo).toBeDefined();
    const declaraciones = (cuerpo!.tools as Array<{ functionDeclarations?: Array<{ name: string }> }>)
      .flatMap((t) => t.functionDeclarations ?? []);
    // Las tools del MCP mas las de CIERRE que aplican a este turno. La peticion no trae
    // `superficie`, asi que `crearCierre()` solo registra `pintar_pantalla`: `ajustar_pantalla`
    // y `responder` necesitan una pantalla actual contra la que ajustar o sobre la que hablar.
    expect(declaraciones.map((d) => d.name).sort()).toEqual([...Object.keys(ENTRADAS), "pintar_pantalla"].sort());

    // 2. Sin llaves que la API no conoce.
    for (const llave of ["$schema", "additionalProperties", "exclusiveMinimum", "const"]) {
      expect(contieneLlave(declaraciones, llave), `las declaraciones no deben traer ${llave}`).toBe(false);
    }

    // 3. El system prompt viaja con el catalogo dentro.
    expect(JSON.stringify(cuerpo!.systemInstruction)).toContain("Confirmacion");

    // 4. Un proveedor que contesta 401 deja el turno cerrado, no colgado.
    expect(lineas.some((l) => l.tipo === "error")).toBe(true);
    expect(lineas.at(-1)?.tipo).toBe("fin");
    expect(lineas.some((l) => l.tipo === "texto")).toBe(true);
  });
});
