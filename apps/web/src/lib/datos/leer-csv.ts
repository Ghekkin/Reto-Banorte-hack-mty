import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

/**
 * Lector de los CSV de `db/datos`. Es el fallback que el ADR 0007 exige: con
 * `FEATURE_POSTGRES` apagado la app no abre conexion, lee los mismos archivos que
 * se cargarian a la base. Hoy es la unica ruta que funciona, porque el Postgres
 * remoto no es alcanzable (ver docs/issues/2026-09-12-postgres-remoto-inalcanzable.md).
 *
 * `server-only` no es decorativo: estos archivos viven en el disco del servidor y
 * el import debe fallar en tiempo de compilacion si alguien lo mete en un componente
 * de cliente.
 */

/** `process.cwd()` es `apps/web` cuando Next corre; los datos estan en la raiz. */
const DIRECTORIO = join(process.cwd(), "..", "..", "db", "datos");

/** Una fila es un mapa columna -> valor; `null` cuando el campo venia vacio. */
export type Fila = Record<string, string | null>;

/**
 * Parser de CSV con el mismo criterio que `scripts/validar-datos.mjs`: comillas
 * dobles con `""` como escape y sin saltos de linea dentro de un campo. No se usa
 * una libreria porque el formato lo produce nuestro generador, no un tercero.
 */
function parsear(texto: string): Fila[] {
  const lineas = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trimEnd().split("\n");
  if (lineas.length < 2) return [];
  const columnas = lineas[0]!.split(",");

  return lineas.slice(1).map((linea) => {
    const campos: string[] = [];
    let actual = "";
    let enComillas = false;

    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') {
        if (enComillas && linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else {
          enComillas = !enComillas;
        }
      } else if (ch === "," && !enComillas) {
        campos.push(actual);
        actual = "";
      } else {
        actual += ch;
      }
    }
    campos.push(actual);

    return Object.fromEntries(columnas.map((c, k) => [c, campos[k] === "" ? null : (campos[k] ?? null)]));
  });
}

/**
 * Lee una tabla y la memoriza por request con `cache` de React: Inicio pide
 * `cuentas` y `movimientos` desde tres componentes distintos y el archivo se lee
 * una sola vez.
 */
export const leerTabla = cache(async (tabla: string): Promise<Fila[]> => {
  try {
    return parsear(await readFile(join(DIRECTORIO, `${tabla}.csv`), "utf8"));
  } catch {
    // Sin datos la pantalla muestra su estado vacio; no se cae la app.
    console.warn(`[datos] no se pudo leer db/datos/${tabla}.csv`);
    return [];
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
