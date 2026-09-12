import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, Superficie, type MensajeA2UI } from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { CATALOGO, registrarCatalogo } from "../index";

/**
 * Que cada componente PINTE de verdad con su ejemplo, no solo que su schema valide.
 * Un componente que truena al recibir sus props no lo detecta ningun schema; esto si.
 * Se pinta en el servidor (sin DOM): es el mismo arbol de React que ve el navegador.
 */
registrarLayout();
registrarCatalogo();

const RAIZ = join(import.meta.dirname, "../..");
const kebab = (n: string) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function pintar(nombre: string): string {
  const texto = readFileSync(join(RAIZ, "ejemplos", `${kebab(nombre)}.jsonl`), "utf8");
  const mensajes = texto
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
  const { estado, error } = procesarVarios(estadoVacio(), mensajes);
  expect(error).toBeUndefined();
  return renderToStaticMarkup(
    createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c_prueba", alAccionar: () => {} }),
  );
}

describe("cada componente pinta su ejemplo", () => {
  for (const entrada of CATALOGO) {
    it(`${entrada.nombre} pinta sin tronar y muestra dinero formateado`, () => {
      const html = pintar(entrada.nombre);
      expect(html.length).toBeGreaterThan(200);
      expect(html).not.toContain("Componente desconocido");
      // Todo componente del catalogo muestra al menos un monto en pesos.
      expect(html).toMatch(/\$\d{1,3}(,\d{3})*\.\d{2}/);
      // Y la linea "¿Por que veo esto?" con la razon del ejemplo.
      expect(html).toContain("Por qué veo esto");
    });
  }

  it("el estado de carga no truena cuando el data model llega vacio", () => {
    for (const entrada of CATALOGO) {
      const { estado } = procesarVarios(estadoVacio(), [
        { version: "v0.9.1", createSurface: { surfaceId: "principal", catalogId: "x" } },
        { version: "v0.9.1", updateComponents: { surfaceId: "principal", components: [{ id: "root", component: entrada.nombre, razon: "sin datos todavia" }] } },
      ]);
      const html = renderToStaticMarkup(
        createElement(Superficie, { superficie: estado.get("principal"), conversacionId: "c", alAccionar: () => {} }),
      );
      expect(html, entrada.nombre).toContain('data-slot="skeleton"');
    }
  });
});

/* --- Las reglas del sistema de diseno que se pueden verificar sobre el HTML --- */

describe("reglas de diseno (skill diseno-banorte)", () => {
  /**
   * El bug que costo el rediseno de `GastoPorCategoria`: los montos vivian en el tooltip
   * de la grafica, asi que en movil —donde no hay hover— no se podia leer una sola cifra.
   * Si vuelve a pasar, esto truena.
   */
  it("GastoPorCategoria muestra TODOS los montos, ninguno solo en un tooltip", () => {
    const html = pintar("GastoPorCategoria");
    for (const monto of ["$7,200.00", "$5,326.00", "$4,800.00", "$4,601.50", "$3,702.00", "$2,404.50"]) {
      expect(html, `falta el monto ${monto} en el HTML`).toContain(monto);
    }
  });

  it("ninguna tabla pasa de dos columnas: a 360 px la tercera obliga a scroll horizontal", () => {
    for (const entrada of CATALOGO) {
      const html = pintar(entrada.nombre);
      const celdasPorFila = [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map(
        (m) => (m[1]!.match(/<t[dh][\s>]/g) ?? []).length,
      );
      const maximo = Math.max(0, ...celdasPorFila);
      expect(maximo, `${entrada.nombre} tiene una fila de ${maximo} celdas`).toBeLessThanOrEqual(2);
    }
  });

  it("todo lo tocable mide 48 px de alto (min-h-12)", () => {
    for (const entrada of CATALOGO) {
      const html = pintar(entrada.nombre);
      for (const coincidencia of html.matchAll(/<(button|label)([^>]*)>/g)) {
        const etiqueta = coincidencia[1] ?? "";
        const atributos = coincidencia[2] ?? "";
        // El radio de una opcion es tocable por su <label>, que es quien lleva la altura.
        if (etiqueta === "button" && /data-slot="radio-group-item"/.test(atributos)) continue;
        expect(atributos, `${entrada.nombre}: un <${etiqueta}> sin min-h-12`).toMatch(/min-h-12/);
      }
    }
  });

  it("cero hex en el HTML: todo color sale de un token", () => {
    for (const entrada of CATALOGO) {
      const html = pintar(entrada.nombre);
      const hex = html.match(/(?:style|fill|stroke)="[^"]*#[0-9a-fA-F]{3,8}/g) ?? [];
      expect(hex, `${entrada.nombre} pinta un hex suelto`).toEqual([]);
    }
  });

  it("todas las tarjetas usan la densidad del sistema, medida contra la TARJETA", () => {
    for (const entrada of CATALOGO) {
      const html = pintar(entrada.nombre);
      expect(html, `${entrada.nombre} no va dentro del contenedor de Tarjeta`).toContain("@container/tarjeta");
      expect(html, `${entrada.nombre} no usa --card-spacing del sistema`).toContain("--card-spacing:--spacing(4)");
      expect(html, `${entrada.nombre} no sube a p-5 cuando la tarjeta es ancha`).toContain(
        "@md/tarjeta:[--card-spacing:--spacing(5)]",
      );
    }
  });

  /**
   * Un widget no sabe donde lo van a poner. Con `sm:`/`md:` una tarjeta de 245 px en un
   * escritorio se pintaba con el acomodo de escritorio y todo se recortaba (medido el
   * 2026-09-12 en el chat de Maya). Dentro del catalogo, todo se acomoda con variantes de
   * contenedor (`@md/tarjeta:`), que miden la tarjeta.
   */
  it("ningun componente usa breakpoints de PANTALLA: se adaptan a su propio ancho", () => {
    const fuentes = readdirSync(join(RAIZ, "src"), { recursive: true, encoding: "utf8" }).filter(
      (f) => /\.tsx?$/.test(f) && !f.includes("__tests__"),
    );
    const culpables: string[] = [];
    for (const archivo of fuentes) {
      const codigo = readFileSync(join(RAIZ, "src", archivo), "utf8")
        .split("\n")
        .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)) // los comentarios pueden nombrarlos
        .join("\n");
      for (const m of codigo.matchAll(/(?<![\w@\/\-\[])(sm|md|lg|xl|2xl):[a-z\[]/g)) {
        culpables.push(`${archivo}: ${codigo.slice(m.index!, m.index! + 24)}`);
      }
    }
    expect(culpables).toEqual([]);
  });

  /** Doce lineas de "¿Por que veo esto?" en una pantalla de tres tarjetas eran ruido. */
  it("la razon viene plegada: el boton la anuncia y el texto esta en el HTML, oculto", () => {
    for (const entrada of CATALOGO) {
      const html = pintar(entrada.nombre);
      expect(html, entrada.nombre).toMatch(/<button[^>]*aria-expanded="false"[^>]*>.*?¿Por qué veo esto\?/s);
      expect(html, `${entrada.nombre}: la razon no esta oculta`).toMatch(/<p id="[^"]+" hidden=""/);
      expect(html, `${entrada.nombre}: queda la banda gris del pie de shadcn`).not.toMatch(
        /data-slot="card-footer" class="[^"]*bg-muted\/50(?![^"]*bg-transparent)/,
      );
    }
  });
});
