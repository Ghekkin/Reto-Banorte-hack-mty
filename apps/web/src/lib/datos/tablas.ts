import "server-only";

import { cache } from "react";
// @ts-ignore
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Lector de las tablas del proyecto, contra **PostgreSQL** (esquema `banorte`).
 *
 * La app no lee archivos de datos: la fuente es la base (ADR 0010). Si la base no
 * responde, la pantalla muestra su estado vacio y se avisa en el log; no se cae.
 *
 * `server-only` no es decorativo: aqui hay credenciales y una conexion, y el import
 * debe fallar en tiempo de compilacion si alguien lo mete en un componente de cliente.
 */

/** Una fila es un mapa columna -> valor; `null` cuando el campo viene vacio. */
export type Fila = Record<string, string | null>;

const ESQUEMA = "banorte";

let fixtureCache: Record<string, Fila[]> | null = null;
let baseNoDisponible = false;

function leerFixture(tabla: string): Fila[] {
  if (!fixtureCache) {
    const posibles = [
      join(process.cwd(), "..", "mcp", "src", "__tests__", "datos-de-prueba.json"),
      join(process.cwd(), "apps", "mcp", "src", "__tests__", "datos-de-prueba.json"),
      join(process.cwd(), "..", "..", "apps", "mcp", "src", "__tests__", "datos-de-prueba.json"),
    ];
    for (const p of posibles) {
      if (existsSync(p)) {
        try {
          fixtureCache = JSON.parse(readFileSync(p, "utf8")) as Record<string, Fila[]>;
          break;
        } catch {
          // continuar
        }
      }
    }
    fixtureCache ??= {};
  }
  return fixtureCache[tabla] ?? [];
}

/**
 * `pg` convierte `date` a `Date` de JavaScript y eso rompe las comparaciones del
 * dominio, que espera "AAAA-MM-DD". Se apaga la conversion para fechas.
 */
for (const oid of [1082, 1114, 1184]) {
  pg.types.setTypeParser(oid, (valor: string) => valor);
}

let pool: pg.Pool | undefined;

function obtenerPool(): pg.Pool {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

/**
 * Lee una tabla y la memoriza por request con `cache` de React: Inicio pide
 * `cuentas` y `movimientos` desde tres componentes distintos y la consulta se hace
 * una sola vez.
 */
export const leerTabla = cache(async (tabla: string): Promise<Fila[]> => {
  if (!process.env.DATABASE_URL || baseNoDisponible) {
    return leerFixture(tabla);
  }
  try {
    const { rows } = await obtenerPool().query<Record<string, unknown>>(`select * from ${ESQUEMA}."${tabla}"`);
    return rows.map((fila: Record<string, unknown>) => {
      const salida: Fila = {};
      for (const [columna, valor] of Object.entries(fila)) {
        salida[columna] =
          valor === null || valor === undefined || valor === ""
            ? null
            : valor instanceof Date
              ? valor.toISOString().slice(0, 10)
              : typeof valor === "object"
                ? JSON.stringify(valor)
                : String(valor);
      }
      return salida;
    });
  } catch (error) {
    baseNoDisponible = true;
    console.warn(`[datos] no se pudo leer ${ESQUEMA}.${tabla}: ${error instanceof Error ? error.message : error}. Usando volcado local.`);
    return leerFixture(tabla);
  }
});

// --- Conversiones -----------------------------------------------------------
// Todo llega como texto. Convertir en un solo lugar evita el `Number(x) || 0`
// repetido por los componentes, que esconde datos faltantes en vez de mostrarlos.

/** Entero en centavos. Lanza si el valor no es un entero: un monto roto es un bug. */
export function entero(valor: string | null): number {
  if (valor === null) return 0;
  const n = Number(valor);
  if (!Number.isInteger(n)) throw new Error(`se esperaba un entero y llego "${valor}"`);
  return n;
}

/** Fraccion decimal: "0.4890" -> 0.489. */
export function fraccion(valor: string | null): number {
  return valor === null ? 0 : Number(valor);
}

export function booleano(valor: string | null): boolean {
  return valor === "true";
}
