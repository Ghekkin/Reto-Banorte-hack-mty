import { describe, expect, it } from "vitest";
import { crearCierre } from "../cierre";
import { systemPrompt } from "../prompt";

/**
 * Issue #44: «¿Como va mi plan de pago?» cerro con `responder` y el texto hablaba de la
 * pantalla. En esa corrida el plan recien aplicado SI estaba en pantalla y `responder` era
 * correcto; lo que faltaba era la regla escrita en los dos sentidos, para que el modelo no
 * conteste de memoria cuando el estado NO esta en pantalla, y el freno de no afirmar
 * contenido que no esta en `componentes en pantalla`.
 *
 * El comportamiento real lo mide `scripts/probar-guion.mjs` («el plan ya aplicado se puede
 * consultar», en una conversacion nueva) con el modelo real.
 */
describe("una pregunta por el estado de un producto", () => {
  for (const catalogo of ["completo", "menu"] as const) {
    it(`el prompt (${catalogo}) la manda a consultar y pintar, salvo que ese estado ya este en pantalla`, () => {
      const prompt = systemPrompt({ catalogo });
      expect(prompt).toContain("Una pregunta por el ESTADO de un producto");
      expect(prompt).toMatch(/`consultar_plan`[^\n]*\n[^\n]*`pintar_pantalla`/);
      expect(prompt).toContain("Solo si ese mismo estado ya esta en `componentes en pantalla`");
      expect(prompt).toContain("Nunca digas que\n  algo se ve en pantalla si no esta en `componentes en pantalla`.");
    });
  }

  it("`responder` no afirma que la pantalla muestra algo que no esta en ella", () => {
    const cierre = crearCierre({ arbol: [{ id: "root", component: "Column", children: [] }], dataModel: {} });
    expect(cierre.herramientas.responder?.description).toContain("No afirmes que la pantalla muestra algo que no esta en ella.");
  });
});
