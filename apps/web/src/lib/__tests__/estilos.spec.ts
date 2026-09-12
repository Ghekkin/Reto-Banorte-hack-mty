import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * El fallo mas caro que he visto en este repo y el mas difícil de notar.
 *
 * Tailwind v4 detecta las fuentes desde la raiz de ESTA app, asi que `packages/*` queda
 * fuera: una clase usada UNICAMENTE en `packages/catalogo` **no genera CSS**, no avisa, no
 * rompe el build y no falla ninguna prueba. Simplemente no se ve.
 *
 * Lo que costo el 2026-09-12: en `GastoPorCategoria` todas las barras salian rojas porque
 * `bg-chart-4` (la plata del resto de las categorias) no existia — el sistema de diseño
 * dice "lo que mas duele va en rojo y el resto en plata", y la grafica decia que todo
 * duele—, y los overrides de la barra del heroe tampoco se generaban, asi que el "uso del
 * limite" era un indicador rojo sobre una tarjeta roja.
 *
 * Estas dos pruebas cuidan el `@source`. Si alguien lo quita, aqui se nota.
 */
const RAIZ = join(import.meta.dirname, "../../../../..");
const GLOBALS = join(RAIZ, "apps/web/src/app/globals.css");

/** Los paquetes del workspace que traen clases de Tailwind. */
const PAQUETES = ["packages/catalogo/src", "packages/a2ui/src"];

describe("las fuentes de Tailwind", () => {
  const css = readFileSync(GLOBALS, "utf8");

  for (const paquete of PAQUETES) {
    it(`incluye ${paquete} con @source`, () => {
      const nombre = paquete.split("/")[1]!;
      expect(
        css.includes(`@source`) && new RegExp(`@source[^;\\n]*${nombre}`).test(css),
        `globals.css no declara @source para ${paquete}: las clases que solo se usen ahi no van a generar CSS y nadie se va a enterar`,
      ).toBe(true);
    });
  }

  it("ninguna clase de color del catalogo depende de que apps/web la use por casualidad", () => {
    // No compila CSS (eso es el build): comprueba la condicion que hace falta para que
    // compile, que es la unica que se puede romper en silencio.
    const usadas = new Set<string>();
    const recorrer = (dir: string) => {
      for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (/\.tsx?$/.test(entrada)) {
          for (const m of readFileSync(ruta, "utf8").matchAll(/\b(bg|text|border)-(chart-\d|exito|advertencia|tinte|oscuro|marca-\w+)\b/g)) {
            usadas.add(m[0]);
          }
        }
      }
    };
    recorrer(join(RAIZ, "packages/catalogo/src"));
    expect(usadas.size).toBeGreaterThan(0); // si esto falla, el regex dejo de aplicar
    // La condicion: el paquete esta declarado como fuente. Si no, cualquiera de estas
    // clases puede desaparecer del CSS sin aviso.
    expect(/@source[^;\n]*catalogo/.test(css)).toBe(true);
  });
});
