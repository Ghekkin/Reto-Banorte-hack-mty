import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATALOGO } from "../index";

/**
 * Issue #19: el `cuandoUsarlo` de `ProyeccionCrecimiento` le decía al modelo "ya llamaste
 * proyectar_inversion", una tool que se revirtió y no existe. Esa frase viaja al system prompt:
 * el modelo buscaba la tool, no la encontraba y pintaba la tarjeta con cifras inventadas.
 *
 * La regla que se cuida: todo nombre en `snake_case` que aparezca en el `cuandoUsarlo` de un
 * componente es una tool real del MCP, una salida del turno del agente o una acción declarada
 * por el catálogo. Los nombres de las tools se leen del código del MCP, no de una lista a mano.
 */
const RAIZ = fileURLToPath(new URL("../../../../", import.meta.url));

function toolsDelMcp(): Set<string> {
  const carpeta = join(RAIZ, "apps/mcp/src/tools");
  const nombres = new Set<string>();
  for (const archivo of readdirSync(carpeta).filter((a) => a.endsWith(".ts"))) {
    for (const m of readFileSync(join(carpeta, archivo), "utf8").matchAll(/\bnombre:\s*"([a-z][a-z0-9_]*)"/g)) nombres.add(m[1]!);
  }
  return nombres;
}

/** Las salidas del turno y la tool de detalle del modo ligero: viven en el host, no en el MCP. */
const TOOLS_DEL_HOST = ["pintar_pantalla", "ajustar_pantalla", "responder", "ver_componentes"];

describe("los nombres de tools en el catálogo existen (#19)", () => {
  const tools = toolsDelMcp();
  const permitidos = new Set([...tools, ...TOOLS_DEL_HOST, ...CATALOGO.flatMap((e) => e.acciones ?? [])]);

  it("lee las tools del MCP (si esto falla, cambió la forma de declararlas)", () => {
    expect(tools.size).toBeGreaterThan(20);
    expect(tools.has("proyectar_ahorro")).toBe(true);
  });

  for (const entrada of CATALOGO) {
    it(`${entrada.nombre}: su cuandoUsarlo no nombra tools que no existen`, () => {
      const nombrados = [...entrada.cuandoUsarlo.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)].map((m) => m[0]);
      expect(nombrados.filter((n) => !permitidos.has(n))).toEqual([]);
    });
  }
});
