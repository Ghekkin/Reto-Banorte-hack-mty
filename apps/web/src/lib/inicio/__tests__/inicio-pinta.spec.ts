import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MensajeA2UI } from "@maya/a2ui";
import type { PantallaDeInicio } from "../almacen";

/**
 * Que el Inicio que armo Maya PINTE de verdad, con el mismo `.jsonl` que valida el
 * catalogo: las tarjetas, lo que Maya dice, la evidencia (modelo, tools) y el
 * "¿Por que veo esto?". Sin DOM: `renderToStaticMarkup` basta para ver si salio la
 * tarjeta o el cartel de "Componente desconocido".
 *
 * `next/navigation` y `next/link` se simulan porque fuera del App Router no hay router
 * montado; aqui no se navega, se pinta.
 */
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href, ...resto }, children),
}));

const { InicioDeMaya, haceCuanto } = await import("@/components/inicio/inicio-de-maya");

const EJEMPLO = fileURLToPath(new URL("../../../../../../packages/a2ui/ejemplos/plan-de-pago.jsonl", import.meta.url));

function pantallaDelEjemplo(): PantallaDeInicio {
  const mensajes = readFileSync(EJEMPLO, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
  return {
    usuarioId: "usr_beto",
    huella: "v1|c18|a:0:0|m:812:2026-09-10",
    mensajes,
    texto: "Hoy lo urgente es la tarjeta: con el plan a 18 meses bajas la mensualidad a $3,193.",
    razon: "Tienes la tarjeta al 96.7 % de su limite y 12 dias de atraso",
    sugerencias: ["¿Cuanto me ahorro con el plan?", "¿En que se me fue el dinero?"],
    modelo: "gemini-3.5-flash-lite",
    tools: ["panorama_inicial", "analizar_gasto", "simular_reestructura"],
    entradaTokens: 15000,
    salidaTokens: 900,
    cacheTokens: 12000,
    ms: 5200,
    generadaEn: new Date(Date.now() - 4 * 60_000).toISOString(),
  };
}

describe("el Inicio que armo Maya", () => {
  const html = renderToStaticMarkup(createElement(InicioDeMaya, { pantalla: pantallaDelEjemplo(), nombre: "Alberto Ramírez" }));

  it("pinta las tarjetas del catalogo, sin componentes desconocidos", () => {
    expect(html).not.toContain("Componente desconocido");
    expect(html).toContain("•••• 4821");
    expect(html).toContain("47,386");
  });

  it("dice lo que Maya ve hoy y cuando lo armo", () => {
    expect(html).toContain("Hola, Alberto.");
    expect(html).toContain("bajas la mensualidad a $3,193");
    expect(html).toContain("hace 4 min");
  });

  it("ensena la evidencia: modelo, tools y el porque plegado", () => {
    expect(html).toContain("gemini-3.5-flash-lite");
    expect(html).toContain("3 tools del MCP");
    expect(html).toContain("5.2 s");
    expect(html).toContain("¿Por qué veo esto?");
  });

  it("ofrece las sugerencias como entradas a Maya", () => {
    expect(html).toContain(`/maya?intencion=${encodeURIComponent("¿Cuanto me ahorro con el plan?")}`);
  });
});

describe("haceCuanto", () => {
  const ahora = Date.parse("2026-09-12T20:00:00.000Z");
  it("habla en minutos, horas o dias segun toque", () => {
    expect(haceCuanto("2026-09-12T19:59:40.000Z", ahora)).toBe("hace un momento");
    expect(haceCuanto("2026-09-12T19:48:00.000Z", ahora)).toBe("hace 12 min");
    expect(haceCuanto("2026-09-12T17:00:00.000Z", ahora)).toBe("hace 3 h");
    expect(haceCuanto("2026-09-10T20:00:00.000Z", ahora)).toBe("hace 2 d");
  });
});
