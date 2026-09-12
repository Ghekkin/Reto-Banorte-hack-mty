import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validadorDeDocumento } from "../esquema";

/**
 * Los casos de conformidad OFICIALES de A2UI v0.9.1, tal como vienen en
 * `spec/v0_9_1/test/cases/` (76 casos en 8 archivos, sin tocar una coma).
 *
 * Es la prueba que sostiene la frase "implementamos A2UI de verdad": no validamos contra
 * una idea nuestra del protocolo, validamos con los JSON Schema de la especificacion y
 * contra su propia bateria de casos, con su catalogo basico en el lugar del nuestro.
 *
 * Cada caso dice `valid: true|false`. Que un invalido salga invalido importa tanto como
 * lo otro: es lo que prueba que el validador no esta diciendo si a todo.
 */
const DIRECTORIO = join(import.meta.dirname, "../../spec/v0_9_1/test/cases");

type Caso = { description: string; valid: boolean; data: unknown };
type Archivo = { schema: string; tests: Caso[] };

const { servidorACliente, clienteAServidor } = validadorDeDocumento();

const archivos = readdirSync(DIRECTORIO).filter((f) => f.endsWith(".json"));

it("los 8 archivos de casos oficiales estan presentes", () => {
  expect(archivos).toHaveLength(8);
});

for (const nombre of archivos) {
  const archivo = JSON.parse(readFileSync(join(DIRECTORIO, nombre), "utf8")) as Archivo;
  const validar = archivo.schema === "client_to_server.json" ? clienteAServidor : servidorACliente;

  describe(`conformidad: ${nombre} (${archivo.tests.length})`, () => {
    for (const caso of archivo.tests) {
      it(`${caso.valid ? "acepta" : "rechaza"}: ${caso.description}`, () => {
        const errores = validar(caso.data);
        if (caso.valid) {
          expect(errores, `deberia ser valido y dio: ${JSON.stringify(errores)}`).toEqual([]);
        } else {
          expect(errores.length, "deberia ser invalido y paso").toBeGreaterThan(0);
        }
      });
    }
  });
}
