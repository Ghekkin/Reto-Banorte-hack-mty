import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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

/**
 * `MCP_ESTADO` viene como ruta del repo (`apps/mcp/estado.json`), y el servidor arranca
 * con `cwd` en `apps/mcp`: resolverla contra `cwd` dejaba el archivo en
 * `apps/mcp/apps/mcp/estado.json` y cada arranque empezaba sin estado. Se resuelve
 * contra la raiz del repo, que es lo que la variable describe.
 */
export function rutaDelEstado(): string {
  return isAbsolute(config.archivoEstado) ? config.archivoEstado : resolve(raizDelRepo(), config.archivoEstado);
}

/**
 * Lee el estado del disco **cada vez**, sin cache en memoria.
 *
 * Tenerlo cacheado parecia gratis y era una trampa: `pnpm reiniciar-estado` corre en OTRO
 * proceso, escribe el archivo y dice "estado reiniciado", pero el servidor seguia
 * contestando desde su copia vieja. En un ensayo eso se ve como "reiniciamos y sigue
 * apareciendo el plan aplicado", cinco minutos antes del pitch. El archivo tiene unos KB y
 * cada tool hace una o dos lecturas: leerlo siempre no se nota.
 */
export function leerEstado(): Estado {
  const ruta = rutaDelEstado();
  if (!existsSync(ruta)) return { acciones: [] };
  try {
    return JSON.parse(readFileSync(ruta, "utf8")) as Estado;
  } catch (error) {
    // Un archivo a medio escribir no puede tumbar una lectura: se parte de cero y se avisa.
    console.warn(`[mcp] estado ilegible en ${ruta}: ${error instanceof Error ? error.message : String(error)}`);
    return { acciones: [] };
  }
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
  escribirEstado(estado);
  return { aplicado: true, yaEstaba: false };
}

/**
 * Escribe a un archivo temporal y lo renombra encima: el rename es atomico en el mismo
 * disco, asi que nadie lee jamas un JSON a medio escribir (el servidor lee en cada
 * llamada, y `reiniciar-estado` corre en otro proceso).
 */
function escribirEstado(estado: Estado): void {
  const ruta = rutaDelEstado();
  const temporal = `${ruta}.${process.pid}.tmp`;
  writeFileSync(temporal, JSON.stringify(estado, null, 2) + "\n");
  renameSync(temporal, ruta);
}

/** Las acciones de un usuario, opcionalmente de un tipo. */
export function accionesDe(usuarioId: string, tipo?: string): AccionAplicada[] {
  return leerEstado().acciones.filter((a) => a.usuarioId === usuarioId && (!tipo || a.tipo === tipo));
}

/**
 * Vuelve al punto de partida. Lo llama `pnpm --filter @maya/mcp reiniciar-estado`, y surte
 * efecto en el servidor que ya este corriendo (ver `leerEstado`).
 */
export function reiniciarEstado(): void {
  escribirEstado({ acciones: [] });
}
