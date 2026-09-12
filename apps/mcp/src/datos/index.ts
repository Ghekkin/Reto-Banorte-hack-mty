import { config } from "../config.js";
import { cargarTablas, type Tablas } from "./memoria.js";
import type { Fila } from "./csv.js";

/**
 * La puerta unica a los datos. **Ninguna tool escribe SQL ni lee un CSV a mano**
 * (skill `tool-mcp`): todas piden aqui.
 *
 * Origen `memoria` (default): los CSV cargados al arrancar.
 * Origen `postgres` (FEATURE_POSTGRES=true): la misma consulta contra Coolify.
 * Si Postgres no responde, se cae a memoria y la demo sigue (ADR 0007, punto 4).
 */
let tablas: Tablas | undefined;

export function datos(): Tablas {
  if (!tablas) {
    if (config.origenDatos === "postgres") {
      console.warn("[mcp] FEATURE_POSTGRES=true pero el origen postgres aun no existe; uso memoria");
    }
    tablas = cargarTablas();
  }
  return tablas;
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

export * from "./csv.js";
export * from "./estado.js";
