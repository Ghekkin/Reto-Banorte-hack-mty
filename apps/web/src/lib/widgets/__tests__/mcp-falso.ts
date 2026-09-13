import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { canonico, crearConsultor, type Llamar } from "../consultor";

/**
 * Un MCP falso que contesta con salidas REALES del servidor, capturadas el 2026-09-13 de
 * `apps/mcp` sobre la base de la demo (`fixtures/salidas-mcp.json`). Asi los adaptadores y
 * el auditor se prueban contra la forma verdadera de cada tool, no contra una que alguien
 * escribio a mano para que la prueba pase.
 *
 * Si una tool cambia su salida, se regenera el fixture y estas pruebas dicen que adaptador
 * se rompio.
 */

type Salidas = Record<string, Record<string, unknown>>;

const CRUDAS = JSON.parse(readFileSync(new URL("./fixtures/salidas-mcp.json", import.meta.url), "utf8")) as Salidas;

/** Las salidas de una persona, con la llave canonica `tool {args sin usuarioId}`. */
function salidasDe(usuarioId: string): Map<string, unknown> {
  const mapa = new Map<string, unknown>();
  for (const [llave, salida] of Object.entries(CRUDAS[usuarioId] ?? {})) {
    const corte = llave.indexOf(" ");
    const tool = llave.slice(0, corte);
    const argumentos = JSON.parse(llave.slice(corte + 1)) as Record<string, unknown>;
    mapa.set(`${tool} ${canonico(argumentos)}`, salida);
  }
  return mapa;
}

/** La salida capturada de una tool, tal cual. */
export function salida(usuarioId: string, tool: string, argumentos: Record<string, unknown> = {}): unknown {
  return salidasDe(usuarioId).get(`${tool} ${canonico(argumentos)}`);
}

/**
 * `llamar` para el consultor: busca la salida por tool y argumentos. Lo que no esta en el
 * fixture contesta como una tool que falla, igual que el MCP ante un error.
 */
export function llamarFalso(usuarioId: string, alterar?: (tool: string, salida: unknown) => unknown): Llamar & ReturnType<typeof vi.fn> {
  const salidas = salidasDe(usuarioId);
  return vi.fn(async (tool: string, argumentos: Record<string, unknown>) => {
    const { usuarioId: _u, ...resto } = argumentos;
    const encontrada = salidas.get(`${tool} ${canonico(resto)}`);
    if (encontrada === undefined) return { resultado: { error: `sin fixture para ${tool} ${canonico(resto)}` }, ok: false, ms: 1 };
    const valor = alterar ? alterar(tool, structuredClone(encontrada)) : structuredClone(encontrada);
    const ok = !(typeof valor === "object" && valor !== null && "error" in valor);
    return { resultado: valor, ok, ms: 3 };
  }) as unknown as Llamar & ReturnType<typeof vi.fn>;
}

export function consultorFalso(usuarioId: string) {
  const llamar = llamarFalso(usuarioId);
  return { llamar, consultor: crearConsultor({ usuarioId, llamar }) };
}
