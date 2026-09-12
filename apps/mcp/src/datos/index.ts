import { cargarTablasDesdePostgres } from "./postgres.js";
import { refrescarAcciones, marcarBaseNoDisponible } from "./estado.js";
import type { Fila } from "./fila.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * La puerta unica a los datos. **Ninguna tool escribe SQL** (skill `tool-mcp`):
 * todas piden aqui.
 *
 * El origen es **PostgreSQL** (ADR 0010): el esquema `banorte` de la base del
 * proyecto. Se carga entero a memoria al arrancar —son ~3,700 filas— y a partir de
 * ahi las lecturas son sincronas, que es lo que permite que el dominio y las 15
 * tools se lean como codigo normal en vez de como una cascada de `await`.
 *
 * Las escrituras (tools de accion) SI van a la base en el momento, y las acciones
 * se refrescan antes de cada llamada a una tool.
 */
export type Tablas = Map<string, Fila[]>;

let tablas: Tablas | undefined;

/**
 * Carga los datos. La llama `server.ts` **antes de escuchar**: si la base no
 * responde, el proceso no arranca y se sabe en ese momento, no a media demo.
 */
export async function inicializarDatos(): Promise<Tablas> {
  try {
    tablas = await cargarTablasDesdePostgres();
    await refrescarAcciones();
  } catch (error) {
    marcarBaseNoDisponible();
    console.warn(
      `[datos] no se pudo conectar a PostgreSQL (${error instanceof Error ? error.message : error}); cargando volcado en memoria`,
    );
    const ruta = join(import.meta.dirname, "..", "__tests__", "datos-de-prueba.json");
    if (existsSync(ruta)) {
      const crudo = JSON.parse(readFileSync(ruta, "utf8")) as Record<string, Fila[]>;
      tablas = new Map(Object.entries(crudo));
    } else {
      throw error;
    }
  }
  return tablas;
}

export function datos(): Tablas {
  if (!tablas) {
    throw new Error(
      "los datos no se han cargado: llama a `inicializarDatos()` antes de usar las tools " +
        "(lo hace `server.ts` al arrancar; en una prueba, llamalo tu)",
    );
  }
  return tablas;
}

/** Para las pruebas: datos en memoria, sin tocar la base. */
export function usarTablasDePrueba(nuevas: Tablas): void {
  tablas = nuevas;
}

/** Todas las filas de una tabla: `tabla("usuarios")`. */
export function tabla(nombre: string): Fila[] {
  const t = datos().get(nombre);
  if (!t) throw new Error(`tabla desconocida: ${nombre}. Hay ${[...datos().keys()].join(", ")}`);
  return t;
}

/** La primera fila cuyo campo coincide. `undefined` si no hay. */
export function buscar(nombre: string, campo: string, valor: string): Fila | undefined {
  return tabla(nombre).find((f) => f[campo] === valor);
}

/** Todas las filas cuyo campo coincide. */
export function filtrar(nombre: string, campo: string, valor: string): Fila[] {
  return tabla(nombre).filter((f) => f[campo] === valor);
}

export * from "./fila.js";
export * from "./estado.js";
export { cerrarPool, obtenerPool } from "./postgres.js";
