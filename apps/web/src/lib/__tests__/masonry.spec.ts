import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, type MensajeA2UI } from "@maya/a2ui";
import { Masonry, UNIDAD_FILA } from "@/components/inicio/masonry";
import { EsqueletoInicio } from "@/components/inicio/esqueleto-inicio";
import { MS_SALIDA, ZonaInicio } from "@/components/inicio/transicion-inicio";
import { Lienzo } from "@/components/maya/lienzo";

/**
 * El masonry de Inicio y la transicion de escribir.
 *
 * Lo que NO se puede probar aqui: que no queden huecos. El alto de una tarjeta solo lo sabe
 * un navegador, y el entorno de estas pruebas es Node. Lo que si se prueba es todo lo que
 * decide el resultado antes de medir: que cada tarjeta tenga su celda con el div que se
 * mide (si eso se rompe, el observador entra en bucle), que el hueco de dos columnas salga
 * del tamano natural del catalogo y no del que mando el agente, que sin JS la rejilla siga
 * siendo la de antes, y que las dos animaciones nunca convivan en el mismo elemento.
 */

const RAIZ = join(import.meta.dirname, "../../../../..");
const GLOBALS = join(RAIZ, "apps/web/src/app/globals.css");
const TURNO_REAL = fileURLToPath(new URL("./fixtures/turno-beto-deudas.jsonl", import.meta.url));

function pintar(nodo: React.ReactNode): string {
  return renderToStaticMarkup(nodo as React.ReactElement);
}

describe("la rejilla masonry", () => {
  const html = pintar(
    createElement(Masonry, {
      children: [
        createElement("div", { key: "a", "data-hueco": "amplio" }, "heroe"),
        createElement("div", { key: "b" }, "cuentas"),
        createElement("div", { key: "c", "data-hueco": "completa" }, "a lo ancho"),
      ],
    }),
  );

  it("cada tarjeta va en su celda, y dentro el div que se mide", () => {
    expect(html.match(/data-celda=""/g)).toHaveLength(3);
    expect(html.match(/data-medida=""/g)).toHaveLength(3);
  });

  it("mide contra el ancho de la rejilla, no de la pantalla", () => {
    expect(html).toContain("@container/rejilla");
    expect(html).toContain("@2xl/rejilla:grid-cols-6");
    // Un breakpoint de pantalla aqui daria columnas de 235 px con la sidebar puesta.
    expect(html).not.toMatch(/(?<![@\w/-])(md|xl):grid-cols/);
  });

  it("sin haber medido, es la rejilla de filas de siempre: con su gap y sin filas de 4 px", () => {
    // Es lo que se ve antes de que corra el JS y lo que se veria si nunca corriera.
    expect(html).toContain("gap-3");
    expect(html).not.toContain("grid-auto-rows");
    expect(html).not.toContain("row-gap");
    expect(html).toContain('data-masonry="sin-medir"');
  });

  it("la rejilla base es de 6 columnas para que dos tarjetas anchas quepan lado a lado", () => {
    // Con 3 columnas y `amplio` en 2, una portada de tres tarjetas anchas dejaba la
    // tercera columna entera vacia (385 px a 1,440, medido el 2026-09-13).
    expect(html).toContain("@2xl/rejilla:col-span-6 @5xl/rejilla:col-span-3"); // amplio
  });

  it("todas las celdas comparten ancho, y lo fija la que mas necesita", () => {
    // Anchos mixtos dejaban una franja gris vertical de 193 px (3+2 de 6 columnas). Con
    // uniforme, la fila siempre cierra: 3+3 o 2+2+2.
    const celdas = [...html.matchAll(/data-celda="" data-hueco="([^"]+)"/g)].map((m) => m[1]);
    expect(celdas).toEqual(["amplio", "amplio", "completa"]);

    // Y sin ninguna amplia, todas se van a un tercio.
    const soloNormales = pintar(
      createElement(Masonry, {
        children: [createElement("div", { key: "a" }, "una"), createElement("div", { key: "b" }, "otra")],
      }),
    );
    expect([...soloNormales.matchAll(/data-celda="" data-hueco="([^"]+)"/g)].map((m) => m[1])).toEqual([
      "normal",
      "normal",
    ]);
    expect(soloNormales).toContain("@2xl/rejilla:col-span-3 @5xl/rejilla:col-span-2");
  });

  it("en una sola columna no se aplica ningun span", () => {
    // Un `span 3` en una rejilla de 1 columna crea columnas implicitas y la tarjeta se
    // sale de la pantalla: por eso todos los spans van tras `@2xl`.
    for (const clase of [...html.matchAll(/col-span-\d/g)].map((m) => m[0])) {
      expect(html).toContain(`/rejilla:${clase}`);
    }
    // Ninguna clase `col-span-*` suelta: todas tienen que venir tras un `@…/rejilla:`.
    expect(html).not.toMatch(/(?<![:\w-])col-span-\d/);
  });

  it("entra en cascada y nunca lleva las dos animaciones a la vez", () => {
    expect(html).toContain("animar-lista");
    expect(html).not.toContain("animar-salida-lista");
  });
});

describe("el lienzo en acomodo masonry", () => {
  /** El turno real donde el agente mando `ancho: "amplio"` a una tarjeta compacta. */
  function superficieDelTurno() {
    const mensajes = readFileSync(TURNO_REAL, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l) as MensajeA2UI);
    return procesarVarios(estadoVacio(), mensajes).estado.get("principal");
  }

  const html = pintar(
    createElement(Lienzo, {
      superficie: superficieDelTurno(),
      conversacionId: "inicio",
      acomodo: "masonry",
      alAccionar: () => {},
    }),
  );

  it("el hueco sale del tamano natural del catalogo, no del ancho que copio el agente", () => {
    const huecos = [...html.matchAll(/data-tamano="([^"]+)" data-hueco="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    // ResumenTarjeta llego con `ancho: "amplio"` del agente y su natural es normal.
    expect(huecos).toEqual([
      ["compacta", "normal"],
      ["amplia", "amplio"],
    ]);
  });

  it("y como una de las dos es amplia, las dos celdas se pintan a media rejilla", () => {
    // La declaracion por pieza sigue siendo la del catalogo; el ancho con que se PINTA es
    // el comun de la pantalla, para que la fila cierre en 6 columnas.
    const celdas = [...html.matchAll(/data-celda="" data-hueco="([^"]+)"/g)].map((m) => m[1]);
    expect(celdas).toEqual(["amplio", "amplio"]);
  });

  it("la celda de la tarjeta compacta no se estira por el data-ancho que dejo el motor A2UI", () => {
    // El motor pinta `data-ancho="amplio"` en su envoltura porque eso mando el agente. La
    // celda no mira ese atributo: si lo mirara, esta tarjeta ocuparia media rejilla.
    expect(html).toContain('data-ancho="amplio"');
    expect(html).not.toContain("has-[[data-ancho");
  });

  it("el acomodo por omision sigue siendo el de filas: la conversacion no cambia", () => {
    const filas = pintar(
      createElement(Lienzo, { superficie: superficieDelTurno(), conversacionId: "c", alAccionar: () => {} }),
    );
    expect(filas).toContain("flex flex-wrap");
    expect(filas).not.toContain("data-celda");
  });
});

describe("la transicion de escribir en Inicio", () => {
  it("sin proveedor, la zona pinta sus hijos: fuera de Inicio no hay transicion", () => {
    const html = pintar(
      createElement(ZonaInicio, {
        esqueleto: createElement("p", null, "esqueleto"),
        children: createElement("p", null, "las tarjetas"),
      }),
    );
    expect(html).toContain("las tarjetas");
    expect(html).not.toContain("esqueleto");
  });

  it("el esqueleto tiene la forma de la portada y se anuncia una sola vez", () => {
    const html = pintar(createElement(EsqueletoInicio));
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain("está armando tu pantalla");
    // Cuatro bloques del ancho que arma Maya en la practica: mezclar anchos dejaba una
    // columna huerfana de 193 px durante los 8 s de la carga.
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(4);
    expect(html.match(/data-celda="" data-hueco="amplio"/g)).toHaveLength(4);
  });
});

describe("el contrato de motion en globals.css", () => {
  const css = readFileSync(GLOBALS, "utf8");
  const token = (nombre: string) => {
    const valor = new RegExp(`--${nombre}:\\s*([\\d.]+)ms`).exec(css)?.[1];
    expect(valor, `globals.css no declara --${nombre} en ms`).toBeDefined();
    return Number(valor);
  };

  it("la salida existe, es el espejo de la entrada y usa la curva de lo que se va", () => {
    expect(css).toContain("@keyframes salida-superficie");
    expect(css).toMatch(/\.animar-salida-lista > \*\s*\{[^}]*salida-superficie/);
    expect(css).toMatch(/\.animar-salida\s*\{[^}]*salida-superficie/);
    expect(css).toContain("--motion-acelerada");
  });

  it("la salida comparte los escalones de la entrada: una sola cascada en el repo", () => {
    // Si alguien agrega escalones para la entrada y se olvida de la salida, las dos
    // animaciones dejan de leerse como el mismo movimiento.
    for (const n of ["2", "3", "4"]) {
      expect(css).toContain(`.animar-salida-lista > *:nth-child(${n})`);
    }
    expect(css).toContain(".animar-salida-lista > *:nth-child(n + 5)");
  });

  it("ninguna de las dos cruza el techo de 250 ms de la skill de diseno", () => {
    const total = token("motion-rapida") + 3 * token("motion-escalon");
    expect(total).toBeLessThanOrEqual(250);
    // Y el esqueleto no puede aparecer antes de que la cascada de salida termine: si
    // `MS_SALIDA` se queda corto, la ultima tarjeta se corta a media animacion.
    expect(MS_SALIDA).toBeGreaterThanOrEqual(total);
  });

  it("la unidad de fila es fina, pero no tanto que multiplique el trabajo del navegador", () => {
    // 4 px: el hueco visible queda entre 16 y 20 px (medido: 17-19) y nunca por debajo del
    // `gap` del sistema. Con 8 px se iba a 20-23, que ya se nota junto a un `gap-4`.
    expect(UNIDAD_FILA).toBe(4);
  });
});
