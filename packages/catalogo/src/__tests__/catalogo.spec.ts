import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOMBRES_DE_LAYOUT, nombres, validarMensaje, VERSION_A2UI, type MensajeA2UI } from "@maya/a2ui";
import { registrarLayout } from "@maya/a2ui/layout";
import { crearValidador } from "@maya/a2ui/esquema";
import catalogo from "../../catalogo.json";
import { CATALOGO, nombresDelCatalogo, registrarCatalogo } from "../index";

/**
 * La red de seguridad de quien agregue un componente al catalogo.
 *
 * No prueba el renderer (eso es `packages/a2ui`): prueba que la CADENA esta completa.
 * Agregar un componente toca cuatro cosas —schema, implementacion, registro y ejemplo—
 * y olvidar una de ellas no se nota hasta la demo. Aqui se nota en dos segundos:
 *
 *  - el catalogo publicado describe todo lo que el agente puede emitir;
 *  - todo lo que el catalogo anuncia existe en el registro del renderer;
 *  - todo componente tiene su `.jsonl` de ejemplo y ese ejemplo es valido de verdad,
 *    contra los JSON Schema oficiales de A2UI con nuestro catalogo dentro.
 *
 * Si falla, el mensaje dice exactamente que paso falta.
 */
const RAIZ = join(import.meta.dirname, "../..");
const validarConEsquema = crearValidador(catalogo);

/** `PlanDePago` -> `plan-de-pago`, la convencion de nombres de archivo del repo. */
function kebab(nombre: string): string {
  return nombre.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** El ejemplo vive en el catalogo; los del renderer (`packages/a2ui/ejemplos`) tambien valen. */
function rutaDelEjemplo(nombre: string): string | undefined {
  const archivo = `${kebab(nombre)}.jsonl`;
  for (const carpeta of [join(RAIZ, "ejemplos"), join(RAIZ, "../a2ui/ejemplos")]) {
    const ruta = join(carpeta, archivo);
    if (existsSync(ruta)) return ruta;
  }
  return undefined;
}

function leerJsonl(ruta: string): MensajeA2UI[] {
  return readFileSync(ruta, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l) as MensajeA2UI);
}

describe("el catalogo publicado", () => {
  it("tiene la forma de un catalogo A2UI, con lo que la spec referencia", () => {
    expect(catalogo.a2uiVersion).toBe(VERSION_A2UI);
    expect(catalogo.$defs.anyComponent.oneOf.length).toBe(Object.keys(catalogo.components).length);
    // `server_to_client.json` y `common_types.json` referencian estos tres por su nombre.
    expect(Object.keys(catalogo.$defs)).toEqual(
      expect.arrayContaining(["anyComponent", "anyFunction", "theme", "CatalogComponentCommon"]),
    );
  });

  it("describe TODO lo que el agente tiene permitido emitir", () => {
    const publicados = Object.keys(catalogo.components);
    for (const nombre of [...nombresDelCatalogo(), ...NOMBRES_DE_LAYOUT]) {
      expect(publicados, `${nombre} no esta en catalogo.json: corre \`pnpm catalogo\``).toContain(nombre);
    }
  });

  it("no anuncia nada que el renderer no sepa pintar", () => {
    registrarLayout();
    registrarCatalogo();
    const registrados = nombres();
    for (const nombre of Object.keys(catalogo.components)) {
      expect(registrados.has(nombre), `${nombre} esta en el catalogo pero nadie lo registro`).toBe(true);
    }
  });
});

describe("cada componente del catalogo", () => {
  for (const entrada of CATALOGO) {
    describe(entrada.nombre, () => {
      it("tiene su ejemplo .jsonl (skill ui-generativa, paso 6)", () => {
        expect(
          rutaDelEjemplo(entrada.nombre),
          `falta ejemplos/${kebab(entrada.nombre)}.jsonl con un mensaje A2UI que lo use`,
        ).toBeTruthy();
      });

      it("su ejemplo pasa la puerta completa: estructura, catalogo y schemas oficiales", () => {
        const ruta = rutaDelEjemplo(entrada.nombre);
        if (!ruta) return; // ya fallo la prueba de arriba; no repetir el mismo error
        const mensajes = leerJsonl(ruta);
        expect(mensajes.length).toBeGreaterThan(0);
        for (const mensaje of mensajes) {
          const resultado = validarMensaje(mensaje, {
            nombres: new Set(Object.keys(catalogo.components)),
            esquema: validarConEsquema,
            arbolCompleto: "updateComponents" in mensaje,
          });
          expect(resultado.ok ? [] : resultado.errores).toEqual([]);
        }
      });

      it("usa el componente que dice usar", () => {
        const ruta = rutaDelEjemplo(entrada.nombre);
        if (!ruta) return;
        const usados = leerJsonl(ruta)
          .filter((m): m is Extract<MensajeA2UI, { updateComponents: unknown }> => "updateComponents" in m)
          .flatMap((m) => m.updateComponents.components.map((c) => c.component));
        expect(usados).toContain(entrada.nombre);
      });
    });
  }
});

/** Lo que el agente recibe cuando se equivoca. Si esto no es claro, no se corrige. */
describe("los errores que vuelven al agente", () => {
  const pantalla = (extra: Record<string, unknown>): MensajeA2UI => ({
    version: VERSION_A2UI,
    updateComponents: {
      surfaceId: "principal",
      components: [
        {
          id: "root",
          component: "Confirmacion",
          titulo: "Tu plan quedo activo",
          detalle: "18 mensualidades fijas.",
          razon: "Aplicaste la reestructura a 18 meses.",
          ...extra,
        },
      ],
    },
  });

  const errores = (mensaje: MensajeA2UI): string[] => {
    const r = validarMensaje(mensaje, { esquema: validarConEsquema });
    return r.ok ? [] : r.errores;
  };

  it("acepta la pantalla buena", () => {
    expect(errores(pantalla({}))).toEqual([]);
  });

  it("dice que valores acepta un enum mal puesto", () => {
    const e = errores(pantalla({ tono: "festivo" })).join(" | ");
    expect(e).toContain("tono");
    expect(e).toContain("informativo");
  });

  it("señala la prop inventada por su nombre", () => {
    const e = errores(pantalla({ colorDeFondo: "azul" })).join(" | ");
    expect(e).toContain("colorDeFondo");
  });

  it("dice que componentes existen cuando el modelo inventa uno", () => {
    const e = errores({
      version: VERSION_A2UI,
      updateComponents: { surfaceId: "principal", components: [{ id: "root", component: "TarjetaMagica" }] },
    }).join(" | ");
    expect(e).toContain("TarjetaMagica");
    expect(e).toContain("Confirmacion");
  });

  it("acepta un enlace al data model en cualquier prop", () => {
    expect(errores(pantalla({ montoCentavos: { path: "/plan/mensualidadCentavos" } }))).toEqual([]);
  });

  it("exige la razon: es la evidencia de que el agente decidio", () => {
    const sinRazon = pantalla({});
    delete (sinRazon as { updateComponents: { components: Record<string, unknown>[] } }).updateComponents
      .components[0]!.razon;
    expect(errores(sinRazon).join(" | ")).toContain("razon");
  });
});
