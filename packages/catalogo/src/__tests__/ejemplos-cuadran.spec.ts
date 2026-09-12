import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MensajeA2UI } from "@maya/a2ui";

/**
 * Los ejemplos `.jsonl` no solo tienen que ser VALIDOS: tienen que CUADRAR.
 *
 * Existe por un bug que llego a la demo. `gasto-por-categoria.jsonl` declaraba
 * `totalCentavos: 3334950` ($33,349.50, el gasto real de Beto en agosto) y listaba solo 6
 * de sus 11 categorias, que suman $28,034.00. La tarjeta mostraba un total que no cuadraba
 * con sus propios renglones, con un hueco de $5,315.50.
 *
 * Lo peor no era la tarjeta: ese archivo se inyecta como **few-shot en el system prompt**
 * (`apps/web/src/lib/agente/prompt.ts`), asi que le estaba ENSENANDO al modelo a recortar
 * la lista. Los numeros eran salida real de la tool, asi que el ejemplo era
 * indistinguible de uno correcto.
 *
 * `catalogo.spec.ts` no lo cazo porque valida estructura contra los JSON Schema de A2UI, y
 * la aritmetica no es parte de un schema. De ahi este archivo: las invariantes de NEGOCIO
 * de los ejemplos, que es lo que el modelo copia.
 */
const RAIZ = join(import.meta.dirname, "../..");

function leerEjemplo(archivo: string): MensajeA2UI[] {
  const ruta = join(RAIZ, "ejemplos", archivo);
  if (!existsSync(ruta)) throw new Error(`falta el ejemplo ${archivo}`);
  return readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
}

function datosDe(mensajes: MensajeA2UI[]): Record<string, unknown> {
  const mensaje = mensajes.find(
    (m): m is Extract<MensajeA2UI, { updateDataModel: unknown }> => "updateDataModel" in m,
  );
  if (!mensaje) throw new Error("el ejemplo no trae updateDataModel");
  return mensaje.updateDataModel.value as Record<string, unknown>;
}

type Gasto = {
  totalCentavos: number;
  categorias: { nombre: string; montoCentavos: number }[];
};

describe("gasto-por-categoria: el total cuadra con lo que lista", () => {
  const gasto = datosDe(leerEjemplo("gasto-por-categoria.jsonl")).gasto as Gasto;

  it("la suma de las categorias es EXACTAMENTE el total", () => {
    const suma = gasto.categorias.reduce((s, c) => s + c.montoCentavos, 0);
    expect(suma).toBe(gasto.totalCentavos);
  });

  /**
   * El schema pide todas las categorias del periodo. Beto tiene 11 en agosto de 2026; con
   * menos de 7 es senal de que alguien volvio a recortar la lista "para que se vea mejor",
   * que es exactamente como nacio el bug.
   */
  it("lista todas las categorias del periodo, no las mas grandes", () => {
    expect(gasto.categorias.length).toBeGreaterThanOrEqual(7);
  });

  it("van de mayor a menor: es lo que el schema promete al modelo", () => {
    const montos = gasto.categorias.map((c) => c.montoCentavos);
    expect([...montos].sort((a, b) => b - a)).toEqual(montos);
  });

  it("ningun monto es cero o negativo: un gasto de $0 es una fila que no informa", () => {
    for (const c of gasto.categorias) expect(c.montoCentavos).toBeGreaterThan(0);
  });
});
