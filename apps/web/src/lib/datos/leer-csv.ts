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
 * Memoria a nivel de PROCESO, no por request.
 *
 * `cache` de React solo deduplica dentro de un mismo render: cada navegacion volvia a
 * leer del disco y a parsear los 365 KB de `movimientos.csv`, y eso era la mayor parte de
 * los 100-300 ms que se sentian como lentitud al cambiar de seccion. Los CSV no cambian
 * mientras el servidor corre, asi que parsearlos una vez es correcto.
 *
 * La contrapartida: si regeneras los datos con `node scripts/generar-datos.mjs`, hay que
 * reiniciar el servidor de desarrollo para verlos.
 */
const memoria = new Map<string, Fila[]>();

/**
 * Lee una tabla. `cache` de React se queda para deduplicar dentro del render (Inicio pide
 * `cuentas` desde tres componentes) y la memoria de proceso evita el disco a partir de la
 * segunda visita.
 */
export const leerTabla = cache(async (tabla: string): Promise<Fila[]> => {
  const memorizada = memoria.get(tabla);
  if (memorizada) return memorizada;

  try {
    const filas = parsear(await readFile(join(DIRECTORIO, `${tabla}.csv`), "utf8"));
    memoria.set(tabla, filas);
    return filas;
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
