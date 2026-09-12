/**
 * Vuelve el estado mutable al punto de partida: trunca `banorte.acciones_aplicadas`.
 * Se corre ANTES de cada ensayo y antes del pitch (skill `checklist-demo`).
 *
 * Los datos de partida no se tocan. El servidor que ya este corriendo lo nota sin
 * reiniciarse: refresca las acciones antes de cada llamada a una tool.
 *
 * **Por que este archivo carga el `.env` a mano** (issue #9): `pnpm` no lo carga, y sin
 * `DATABASE_URL` en el entorno `reiniciarEstado()` se salta el `truncate` y solo limpia
 * la copia en memoria de ESTE proceso, que muere enseguida. La version anterior imprimia
 * "quedo vacia" igual y salia con codigo 0: se reiniciaba un ensayo creyendo que Beto
 * llegaba sin plan, y llegaba con el plan aplicado. Ahora se carga el `.env` como ya
 * hacen `scripts/migrar.mjs`, `restaurar.mjs` y `volcar-fixture.mjs`, se exige la
 * variable, y se imprime **cuantas filas se borraron y contra que base**: un reinicio
 * que no borro nada tiene que verse.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

if (!process.env.DATABASE_URL && existsSync(join(RAIZ, ".env"))) {
  for (const linea of readFileSync(join(RAIZ, ".env"), "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, clave, valor = ""] = m;
    if (clave && !process.env[clave]) process.env[clave] = valor.replace(/^["']|["']$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    "falta DATABASE_URL: sin ella no hay base que reiniciar y el estado del ensayo\n" +
      "quedaria como esta. Ponla en el .env de la raiz o en el entorno (ADR 0010).",
  );
  process.exit(1);
}

// Dinamicos a proposito: `config.ts` lee `process.env` al evaluarse, asi que estos
// modulos tienen que cargarse DESPUES del .env de arriba.
const { obtenerPool, cerrarPool } = await import("../src/datos/postgres.js");
const { reiniciarEstado } = await import("../src/datos/estado.js");

async function contarFilas(): Promise<number> {
  const { rows } = await obtenerPool().query<{ filas: string }>(
    "select count(*)::text as filas from banorte.acciones_aplicadas",
  );
  return Number(rows[0]?.filas ?? 0);
}

const antes = await contarFilas();
await reiniciarEstado();
const despues = await contarFilas();
await cerrarPool();

const destino = process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, "//USUARIO:CLAVE@");

if (despues !== 0) {
  console.error(`el truncate no dejo la tabla vacia: quedan ${despues} filas en ${destino}`);
  process.exit(1);
}

const borradas = antes - despues;

console.log(
  `estado reiniciado en ${destino}\nbanorte.acciones_aplicadas: ${borradas} fila(s) borrada(s), quedo vacia`,
);
