import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * La coreografia de entrada de los widgets vive en `globals.css`
 * (`docs/como-funciona/animacion-de-widgets.md`). Estas pruebas cuidan tres decisiones que
 * se rompen en silencio: nadie ve en una prueba que una animacion dejo de correr en la GPU,
 * que una grafica volvio a animarse sobre un contenedor vacio, o que una clase del catalogo
 * ya no tiene regla.
 */
const RAIZ = join(import.meta.dirname, "../../../../..");
const css = readFileSync(join(RAIZ, "apps/web/src/app/globals.css"), "utf8");

/** El texto de cada `@keyframes widget-*`, con su nombre. */
function keyframesDeWidgets(): Array<[string, string]> {
  const bloques: Array<[string, string]> = [];
  for (const m of css.matchAll(/@keyframes (widget-[\w-]+)\s*\{/g)) {
    let profundidad = 1;
    let i = m.index! + m[0].length;
    const inicio = i;
    while (profundidad > 0 && i < css.length) {
      if (css[i] === "{") profundidad++;
      if (css[i] === "}") profundidad--;
      i++;
    }
    bloques.push([m[1]!, css.slice(inicio, i - 1)]);
  }
  return bloques;
}

describe("animacion de los widgets (globals.css)", () => {
  it("toda animacion de widget mueve solo transform y opacity: lo que la GPU compone sola", () => {
    const bloques = keyframesDeWidgets();
    expect(bloques.length).toBeGreaterThan(5); // si esto falla, el regex dejo de aplicar
    for (const [nombre, cuerpo] of bloques) {
      const sinComentarios = cuerpo.replace(/\/\*[\s\S]*?\*\//g, "");
      const propiedades = [...sinComentarios.matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
      for (const propiedad of propiedades) {
        // `clip-path` se probo y se quito: medido en Chromium, cae al hilo principal y ponia
        // trabajo de estilo y pintura en casi todos los cuadros de la entrada.
        expect(["transform", "opacity"], `${nombre} anima ${propiedad}`).toContain(propiedad);
      }
    }
  });

  it("las graficas empiezan cuando su SVG existe, no cuando monta la tarjeta", () => {
    // Recharts dibuja despues de medir: en una pagina pintada por el servidor (Inicio) la
    // animacion terminaba sobre un contenedor vacio y la grafica aparecia de golpe.
    for (const clase of ["animar-trazo", "animar-dona", "animar-arco"]) {
      const reglas = [...css.matchAll(new RegExp(`\\.${clase}[^{]*\\{[^}]*animation:`, "g"))].map((m) => m[0]);
      expect(reglas.length, `${clase} no tiene animacion`).toBeGreaterThan(0);
      for (const regla of reglas) expect(regla, `${clase} anima sin esperar al SVG`).toContain(":has(.recharts-surface)");
    }
  });

  it("con reducir movimiento los widgets no se animan (none, no 0.01 ms: hay retrasos)", () => {
    const bloque = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.animar-tarjeta,\s*\.animar-tarjeta \*\s*\{([^}]*)\}/);
    expect(bloque, "falta el bloque de reducir movimiento de .animar-tarjeta").not.toBeNull();
    expect(bloque![1]).toMatch(/animation:\s*none\s*!important/);
  });

  it("toda clase de animacion que usa el catalogo tiene su regla", () => {
    const usadas = new Set<string>();
    const recorrer = (dir: string) => {
      for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
          if (entrada !== "__tests__") recorrer(ruta);
        } else if (/\.tsx?$/.test(entrada)) {
          for (const m of readFileSync(ruta, "utf8").matchAll(/["`\s](animar-(?:tarjeta|filas|barra|trazo|dona|arco|icono)|cifra)["`\s]/g)) {
            usadas.add(m[1]!);
          }
        }
      }
    };
    recorrer(join(RAIZ, "packages/catalogo/src"));
    expect(usadas.size).toBeGreaterThan(5);
    for (const clase of usadas) expect(css, `.${clase} se usa en el catalogo y no tiene regla`).toContain(`.${clase}`);
  });
});
