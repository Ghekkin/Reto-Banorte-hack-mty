import pg from "pg";
import { config } from "../config.js";
import type { Fila } from "./fila.js";

/**
 * Origen `postgres`: la base del proyecto en Coolify, esquema `banorte`.
 *
 * Las filas salen **siempre como texto**, vacio en
 * vez de null. No es pereza; es lo que permite que `src/dominio/` y las 15 tools
 * sigan intactas (`aEntero`, `aDecimal`, `aBooleano` esperan texto). El unico
 * lugar del sistema que sabe que los datos vienen de Postgres es este archivo.
 */

const ESQUEMA = "banorte";

/**
 * `pg` convierte fechas a `Date` de JavaScript, y `String(new Date(...))` produce
 * "Mon Sep 12 2026 …", que rompe cualquier comparacion del dominio. Se apaga la
 * conversion: Postgres ya entrega `date` como "AAAA-MM-DD", que es exactamente lo
 * que el dominio espera.
 */
const DATE = 1082;
const TIMESTAMP = 1114;
const TIMESTAMPTZ = 1184;
for (const oid of [DATE, TIMESTAMP, TIMESTAMPTZ]) {
  pg.types.setTypeParser(oid, (valor: string) => valor);
}

let pool: pg.Pool | undefined;

export function obtenerPool(): pg.Pool {
  if (!config.urlPostgres) {
    throw new Error(
      "falta DATABASE_URL: el MCP lee de Postgres (ADR 0010). Copia .env.example a .env y llena la URL",
    );
  }
  pool ??= new pg.Pool({
    connectionString: config.urlPostgres,
    max: 4,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

export async function cerrarPool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** Un valor de Postgres, como texto: es lo que el dominio sabe leer. */
function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/** Los nombres de tabla del esquema, para no depender de una lista escrita a mano. */
export async function nombresDeTablas(cliente: pg.Pool): Promise<string[]> {
  const { rows } = await cliente.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = $1 order by table_name",
    [ESQUEMA],
  );
  return rows.map((r) => r.table_name);
}

/**
 * Trae el esquema entero a memoria al arrancar. Son ~3,700 filas: cabe de sobra y
 * evita que cada tool abra una consulta (y que una tool lenta arruine un turno del
 * agente delante del jurado). Las escrituras van a la base y actualizan esta copia.
 */
export async function cargarTablasDesdePostgres(): Promise<Map<string, Fila[]>> {
  const cliente = obtenerPool();
  const tablas = new Map<string, Fila[]>();
  const nombres = await nombresDeTablas(cliente);
  if (nombres.length === 0) {
    throw new Error(
      `la base respondio pero el esquema "${ESQUEMA}" no tiene tablas: corre \`pnpm datos:cargar\``,
    );
  }
  for (const nombre of nombres) {
    const { rows } = await cliente.query<Record<string, unknown>>(`select * from ${ESQUEMA}."${nombre}"`);
    tablas.set(
      nombre,
      rows.map((fila) => {
        const salida: Fila = {};
        for (const [columna, valor] of Object.entries(fila)) salida[columna] = aTexto(valor);
        return salida;
      }),
    );
  }
  return tablas;
}
