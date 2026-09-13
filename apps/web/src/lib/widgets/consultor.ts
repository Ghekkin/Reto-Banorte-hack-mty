import { createHash } from "node:crypto";
import type { LlamadaRegistrada } from "@/lib/agente/mcp-cliente";
import { TOOLS_DE_WIDGETS } from "./fuentes";

/**
 * El consultor: la unica puerta por la que un widget le pide datos al MCP.
 *
 * Tres garantias que no dependen del modelo:
 *
 *  1. **`usuarioId` sale de la sesion.** Se sobreescribe siempre, venga lo que venga en los
 *     argumentos. Un modelo no puede pedir los datos de otra persona.
 *  2. **Solo tools de lectura de la lista blanca** (`TOOLS_DE_WIDGETS`). Una accion no se
 *     puede disparar por aqui, ni por error ni por un parametro envenenado.
 *  3. **Cada respuesta queda registrada con su huella** (sha256 del resultado): es la
 *     procedencia del widget y lo que el auditor vuelve a comprobar.
 *
 * La cache es por turno: la portada ya trae los datos del prefetch (`reunirDatos`), y
 * pedir `analizar_gasto {}` otra vez para llenar la tarjeta no tiene que costar otra
 * llamada. La llave es la tool mas los argumentos canonicos (llaves ordenadas).
 */

export type Consulta = {
  tool: string;
  /** Los argumentos tal cual se mandaron, `usuarioId` incluido. */
  argumentos: Record<string, unknown>;
  resultado: unknown;
  ok: boolean;
  ms: number;
  /** sha256 del resultado serializado de forma canonica. */
  huella: string;
  /** ISO 8601: cuando se consulto de verdad (no cuando se leyo de la cache). */
  en: string;
};

export type Llamar = (
  tool: string,
  argumentos: Record<string, unknown>,
) => Promise<{ resultado: unknown; ok: boolean; ms: number }>;

export type Consultor = {
  consultar(tool: string, argumentos: Record<string, unknown>): Promise<Consulta>;
  /** Todo lo que se consulto en el turno, incluido lo que vino sembrado del prefetch. */
  consultas(): Consulta[];
  /** Para la tira de transparencia: las llamadas reales, sin las que salieron de cache. */
  llamadas(): LlamadaRegistrada[];
};

export class ToolNoPermitida extends Error {}

export function crearConsultor(opciones: {
  usuarioId: string;
  llamar: Llamar;
  /** Lo que ya se consulto antes de abrir el turno (el prefetch de la portada). */
  sembradas?: Consulta[];
  alTerminar?: (llamada: LlamadaRegistrada) => void;
}): Consultor {
  const cache = new Map<string, Promise<Consulta>>();
  const todas: Consulta[] = [];
  const reales: LlamadaRegistrada[] = [];

  for (const sembrada of opciones.sembradas ?? []) {
    cache.set(llave(sembrada.tool, sembrada.argumentos), Promise.resolve(sembrada));
    todas.push(sembrada);
  }

  return {
    consultar(tool, argumentos) {
      if (!TOOLS_DE_WIDGETS.has(tool)) {
        return Promise.reject(new ToolNoPermitida(`la tool ${tool} no alimenta widgets`));
      }
      const completos = { ...argumentos, usuarioId: opciones.usuarioId };
      const clave = llave(tool, completos);
      const enCache = cache.get(clave);
      if (enCache) return enCache;

      const trabajo = opciones.llamar(tool, completos).then(({ resultado, ok, ms }) => {
        const consulta: Consulta = { tool, argumentos: completos, resultado, ok, ms, huella: huellaDe(resultado), en: new Date().toISOString() };
        todas.push(consulta);
        const llamada = { nombre: tool, ms, ok, mutacion: false };
        reales.push(llamada);
        opciones.alTerminar?.(llamada);
        return consulta;
      });
      // Una consulta que falla no se cachea: el siguiente intento del modelo la repite.
      cache.set(clave, trabajo);
      trabajo.then(
        (c) => {
          if (!c.ok) cache.delete(clave);
        },
        () => cache.delete(clave),
      );
      return trabajo;
    },
    consultas: () => [...todas],
    llamadas: () => [...reales],
  };
}

/** Una consulta ya hecha fuera del consultor (el prefetch), lista para sembrarse. */
export function consultaHecha(
  tool: string,
  argumentos: Record<string, unknown>,
  resultado: unknown,
  ok: boolean,
  ms: number,
): Consulta {
  return { tool, argumentos, resultado, ok, ms, huella: huellaDe(resultado), en: new Date().toISOString() };
}

export function llave(tool: string, argumentos: Record<string, unknown>): string {
  return `${tool} ${canonico(argumentos)}`;
}

export function huellaDe(valor: unknown): string {
  return createHash("sha256").update(canonico(valor)).digest("hex");
}

/** JSON con las llaves ordenadas y sin `undefined`: dos objetos iguales, un mismo texto. */
export function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (typeof valor === "object" && valor !== null) {
    const pares = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonico(v)}`);
    return `{${pares.join(",")}}`;
  }
  return JSON.stringify(valor) ?? "null";
}
