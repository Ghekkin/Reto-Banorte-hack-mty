import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { config } from "../config.js";
import { raizDelRepo } from "./memoria.js";

/**
 * El estado que las acciones mutan.
 *
 * Los CSV de `db/datos/` no se tocan nunca: son la foto de partida. Lo que una
 * tool de accion aplica se escribe aqui, y las tools de lectura lo superponen a
 * los CSV. Asi `reiniciar-estado` es borrar un archivo, y la demo arranca igual
 * las veces que haga falta.
 */
export type AccionAplicada = {
  id: string;
  tipo: string;
  usuarioId: string;
  /** La llave que hace idempotente la accion (contrato agente-cliente). */
  idempotencyKey: string;
  aplicadaEn: string;
  datos: Record<string, unknown>;
};

type Estado = { acciones: AccionAplicada[] };

const VACIO: Estado = { acciones: [] };
let cache: Estado | undefined;

/**
 * `MCP_ESTADO` viene como ruta del repo (`apps/mcp/estado.json`), y el servidor arranca
 * con `cwd` en `apps/mcp`: resolverla contra `cwd` dejaba el archivo en
 * `apps/mcp/apps/mcp/estado.json` y cada arranque empezaba sin estado. Se resuelve
 * contra la raiz del repo, que es lo que la variable describe.
 */
function archivo(): string {
  return isAbsolute(config.archivoEstado) ? config.archivoEstado : resolve(raizDelRepo(), config.archivoEstado);
}

export function leerEstado(): Estado {
  if (cache) return cache;
  const ruta = archivo();
  cache = existsSync(ruta) ? (JSON.parse(readFileSync(ruta, "utf8")) as Estado) : { acciones: [] };
  return cache;
}

/**
 * Aplica una accion. Si la llave de idempotencia ya se uso, NO vuelve a aplicar
 * y avisa: un reintento del agente no puede cobrar dos veces.
 */
export function aplicarAccion(accion: AccionAplicada): { aplicado: boolean; yaEstaba: boolean } {
  const estado = leerEstado();
  if (estado.acciones.some((a) => a.idempotencyKey === accion.idempotencyKey)) {
    return { aplicado: false, yaEstaba: true };
  }
  estado.acciones.push(accion);
  writeFileSync(archivo(), JSON.stringify(estado, null, 2) + "\n");
  return { aplicado: true, yaEstaba: false };
}

/** Las acciones de un usuario, opcionalmente de un tipo. */
export function accionesDe(usuarioId: string, tipo?: string): AccionAplicada[] {
  return leerEstado().acciones.filter((a) => a.usuarioId === usuarioId && (!tipo || a.tipo === tipo));
}

/** Vuelve al punto de partida. Lo llama `pnpm --filter @maya/mcp reiniciar-estado`. */
export function reiniciarEstado(): void {
  cache = { ...VACIO, acciones: [] };
  writeFileSync(archivo(), JSON.stringify(cache, null, 2) + "\n");
}
