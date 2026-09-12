import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { leerCSV, type Fila } from "./csv.js";

/**
 * Origen `memoria`: los 22 CSV de `db/datos/` cargados al arrancar (ADR 0007).
 * Es el default y el camino de la demo: cero red, cero servidor de base de datos.
 *
 * Los CSV son la FUENTE; Postgres es una copia cargable. Si los dos existen,
 * gana el CSV.
 */
export type Tablas = Map<string, Fila[]>;

/**
 * La raiz del repo, corra desde donde corra el proceso: `pnpm --filter @maya/mcp dev`
 * arranca con `cwd` en `apps/mcp`, y `pnpm humo` o un test lo hacen desde la raiz. Todo
 * lo que sea una ruta relativa del repo (los CSV, `estado.json`) se resuelve desde aqui.
 */
export function raizDelRepo(): string {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    try {
      readdirSync(join(dir, "db", "datos"));
      return dir;
    } catch {
      dir = resolve(dir, "..");
    }
  }
  throw new Error("no encuentro la raiz del repo (busco db/datos hacia arriba); define DATOS_CSV");
}

/** `db/datos` desde la raiz del repo, corra desde donde corra el proceso. */
export function carpetaDeDatos(): string {
  const desdeEnv = process.env.DATOS_CSV;
  if (desdeEnv) return resolve(desdeEnv);
  return join(raizDelRepo(), "db", "datos");
}

export function cargarTablas(carpeta = carpetaDeDatos()): Tablas {
  const tablas: Tablas = new Map();
  for (const archivo of readdirSync(carpeta)) {
    if (!archivo.endsWith(".csv")) continue;
    const nombre = basename(archivo, ".csv");
    tablas.set(nombre, leerCSV(readFileSync(join(carpeta, archivo), "utf8")));
  }
  return tablas;
}
