import { tool, type ToolSet } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { correrTurno } from "@/lib/agente/agente";
import type { LineaStream, PeticionAgente } from "@/lib/agente/tipos";
import { pasoConTool } from "@/lib/agente/__tests__/ayudas";

/**
 * La condición que hace que el prompt caching sirva, comprobada sobre lo que el SDK manda
 * DE VERDAD al proveedor.
 *
 * Los dos proveedores cachean por coincidencia de prefijo: el primer byte que cambia
 * invalida todo lo que sigue. Un turno hace 2-3 peticiones y cada una reenvía ~13,000
 * tokens de system prompt + definiciones de tools. Si ese prefijo no es idéntico entre
 * pasos, el caché no puede pegar y nadie se entera: el turno solo sale más caro.
 *
 * Ya hay una prueba de que `mensajesDelTurno` pone lo estable primero (`agente.spec.ts`).
 * Esta va un nivel más abajo: intercepta el `doStream` del modelo y compara los prompts
 * que salieron. Es lo único que prueba la propiedad real, porque entre `mensajesDelTurno`
 * y el proveedor están el bucle de pasos y el propio SDK.
 */
const PANTALLA = JSON.stringify([
  {
    id: "root",
    component: "Confirmacion",
    titulo: "Tu plan quedo activo",
    detalle: "18 meses de $3,193.35",
    razon: "Te muestro esto porque tu tarjeta estaba al 97 % de su limite",
  },
]);

function peticion(): PeticionAgente {
  return {
    usuarioId: "usr_beto",
    conversacionId: "c_cache",
    mensajes: [{ rol: "usuario", texto: "Quiero pagar menos intereses de mi tarjeta" }],
  };
}

function toolsDePrueba(): ToolSet {
  return {
    consultar_tarjeta: tool({
      description: "Consulta la tarjeta",
      inputSchema: z.object({ usuarioId: z.string() }),
      execute: () => ({ tarjeta: { saldoCentavos: 4738600 } }),
    }),
    consultar_movimientos: tool({
      description: "Consulta los movimientos",
      inputSchema: z.object({ usuarioId: z.string() }),
      execute: () => ({ movimientos: [] }),
    }),
  };
}

/** Corre un turno de dos pasos y devuelve lo que el modelo recibió en cada llamada. */
async function llamadasDelTurno() {
  const pasos = [
    pasoConTool("consultar_tarjeta", { usuarioId: "usr_beto" }),
    pasoConTool("pintar_pantalla", {
      razon: "Tu tarjeta esta al 97 % de su limite y pagas de mas en intereses",
      texto: "Te dejo el plan.",
      componentesJson: PANTALLA,
    }),
  ];
  const llamadas: Array<{ prompt: unknown[]; tools: string[] }> = [];
  let i = 0;

  const modelo = new MockLanguageModelV2({
    doStream: async (opciones) => {
      llamadas.push({
        prompt: opciones.prompt as unknown[],
        tools: ((opciones.tools ?? []) as Array<{ name?: string }>).map((t) => t.name ?? "?"),
      });
      const paso = pasos[i++];
      if (!paso) throw new Error("el modelo simulado se quedo sin pasos");
      return paso;
    },
  });

  const lineas: LineaStream[] = [];
  for await (const linea of correrTurno(peticion(), { modelo, herramientas: toolsDePrueba() })) {
    lineas.push(linea);
  }
  return { llamadas, lineas };
}

describe("el prefijo que el proveedor puede cachear", () => {
  it("el turno hace dos peticiones y pinta", async () => {
    const { llamadas, lineas } = await llamadasDelTurno();
    expect(llamadas).toHaveLength(2);
    expect(lineas.some((l) => l.tipo === "a2ui")).toBe(true);
  });

  it("el system prompt es BYTE POR BYTE el mismo en las dos peticiones", async () => {
    const { llamadas } = await llamadasDelTurno();
    const sistema = (p: unknown[]) => JSON.stringify((p as Array<{ role?: string }>).filter((m) => m.role === "system"));
    expect(sistema(llamadas[0]!.prompt)).toBe(sistema(llamadas[1]!.prompt));
    expect(sistema(llamadas[0]!.prompt).length).toBeGreaterThan(1000); // que de verdad lleve el prompt
  });

  it("la lista de tools va en el MISMO orden: el orden es parte del prefijo", async () => {
    const { llamadas } = await llamadasDelTurno();
    expect(llamadas[1]!.tools).toEqual(llamadas[0]!.tools);
    expect(llamadas[0]!.tools).toContain("pintar_pantalla");
  });

  it("la segunda petición ARRANCA con la primera completa: lo nuevo va al final", async () => {
    const { llamadas } = await llamadasDelTurno();
    const primera = llamadas[0]!.prompt;
    const segunda = llamadas[1]!.prompt;
    expect(segunda.length).toBeGreaterThan(primera.length);
    // La propiedad del caché: el prefijo se repite tal cual. Si esto falla, algo reescribe
    // la conversación entre pasos y el caché no puede pegar nunca.
    expect(JSON.stringify(segunda.slice(0, primera.length))).toBe(JSON.stringify(primera));
  });
});

/**
 * El caché de Claude es EXPLÍCITO: sin un `cache_control` en el cuerpo de la petición,
 * Anthropic no cachea nada. Nosotros lo pedimos desde `mensajesDelTurno` con
 * `providerOptions.anthropic.cacheControl`, pero entre eso y el cuerpo HTTP está la
 * conversión del proveedor, que es donde se pierden estas cosas.
 *
 * Esta prueba intercepta el `fetch` del proveedor y mira el JSON que DE VERDAD saldría,
 * sin llamar a la API ni gastar un token. Es la única forma de saber, con la cuota de
 * Gemini agotada y sin llave de Anthropic, que el camino de respaldo va a cachear cuando
 * alguien ponga la llave.
 */
describe("el breakpoint de caché que Claude necesita", () => {
  it("sale en el cuerpo HTTP, sobre el system prompt y no sobre el mensaje volátil", async () => {
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    const { streamText } = await import("ai");
    const { mensajesDelTurno } = await import("@/lib/agente/historial");

    let cuerpo: Record<string, unknown> | undefined;
    const proveedor = createAnthropic({
      apiKey: "llave-de-prueba",
      fetch: async (_url, opciones) => {
        cuerpo = JSON.parse(String(opciones?.body ?? "{}")) as Record<string, unknown>;
        // No hace falta contestar bien: lo que importa ya se capturó.
        return new Response("{}", { status: 401, headers: { "content-type": "application/json" } });
      },
    });

    const resultado = streamText({
      model: proveedor("claude-sonnet-5"),
      messages: mensajesDelTurno(peticion()),
      // Igual que el agente: el system prompt va en `messages` para poder marcarlo como
      // prefijo cacheable, y es una constante nuestra, no texto de la persona.
      allowSystemInMessages: true,
    });
    // El 401 llega como parte `error` del stream; se consume y se ignora a propósito.
    for await (const _ of resultado.fullStream) void _;

    expect(cuerpo, "el proveedor no llego a mandar cuerpo").toBeDefined();
    const sistema = cuerpo!.system as Array<Record<string, unknown>>;
    expect(Array.isArray(sistema)).toBe(true);
    // El corte del caché, en el bloque del system prompt.
    expect(sistema.at(-1)!.cache_control).toEqual({ type: "ephemeral" });
    expect(String(sistema.at(-1)!.text).length).toBeGreaterThan(1000);

    // Y lo volátil del turno queda FUERA del prefijo cacheado: va en `messages`, después
    // del corte. Si alguien lo sube al `system`, el caché se invalida en cada turno.
    const mensajes = JSON.stringify(cuerpo!.messages);
    expect(mensajes).toContain("usr_beto");
    expect(JSON.stringify(sistema)).not.toContain("usr_beto");
  });
});
