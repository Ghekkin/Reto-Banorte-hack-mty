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

/** `db/datos` desde la raiz del repo, corra desde donde corra el proceso. */
export function carpetaDeDatos(): string {
  const desdeEnv = process.env.DATOS_CSV;
  if (desdeEnv) return resolve(desdeEnv);
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    try {
      readdirSync(join(dir, "db", "datos"));
      return join(dir, "db", "datos");
    } catch {
      dir = resolve(dir, "..");
    }
  }
  throw new Error("no encuentro db/datos; define DATOS_CSV con la ruta absoluta");
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
