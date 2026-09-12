import { readFileSync } from "node:fs";
import { join } from "node:path";
import { usarTablasDePrueba, type Tablas } from "../datos/index.js";
import type { Fila } from "../datos/fila.js";

/**
 * Prepara las pruebas con un volcado de los datos, **sin tocar la base**.
 *
 * Las pruebas no pueden pegarle a la base de la demo: `reiniciarEstado` la truncaria
 * y un `pnpm test` a media madrugada dejaria al equipo sin el estado del ensayo.
 * Tampoco pueden depender de que haya red. El volcado se regenera con
 * `pnpm datos:fixture` cuando los datos de la base cambien.
 */
const VOLCADO = join(import.meta.dirname, "datos-de-prueba.json");

export function prepararDatos(): Tablas {
  const crudo = JSON.parse(readFileSync(VOLCADO, "utf8")) as Record<string, Fila[]>;
  const tablas: Tablas = new Map(Object.entries(crudo));
  usarTablasDePrueba(tablas);
  return tablas;
}

prepararDatos();
