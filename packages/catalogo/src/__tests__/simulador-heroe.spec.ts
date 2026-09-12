import { describe, expect, it } from "vitest";
import { validarMensaje, VERSION_A2UI, type MensajeA2UI } from "@maya/a2ui";
import { crearValidador } from "@maya/a2ui/esquema";
import catalogo from "../../catalogo.json";

/**
 * Issue #14. El agente le ponía `heroe: true` a `SimuladorMeta`, que no lo declaraba, y
 * la pantalla completa se rechazaba: el turno de Ana gastaba un paso en reintentar.
 *
 * No era descuido del modelo: 13 componentes del catálogo aceptan `heroe`, y para Ana
 * —sin deuda— el simulador ES la tarjeta principal. Así que el arreglo no fue pedirle al
 * modelo que no lo hiciera, sino que el componente soporte lo que tiene sentido pedirle.
 *
 * Esta prueba usa el componente tal como lo mandó el modelo en el turno que falló.
 */
const validar = crearValidador(catalogo);

const pantalla = (simulador: Record<string, unknown>): MensajeA2UI => ({
  version: VERSION_A2UI,
  updateComponents: {
    surfaceId: "principal",
    components: [
      { id: "root", component: "Column", children: ["simulador"] },
      {
        id: "simulador",
        component: "SimuladorMeta",
        nombre: "Fondo de emergencia",
        metaCentavos: 9600000,
        saldoInicialCentavos: 4815000,
        aportacionCentavos: 265000,
        aportacionMaximaCentavos: 662905,
        razon: "No tienes deuda y tu flujo deja libres unos $6,600 al mes.",
        ...simulador,
      },
    ],
  },
});

function errores(mensaje: MensajeA2UI): string[] {
  const r = validarMensaje(mensaje, { esquema: validar, arbolCompleto: true });
  return r.ok ? [] : r.errores;
}

describe("SimuladorMeta como tarjeta héroe (issue #14)", () => {
  it("acepta heroe: true — el mensaje exacto que antes tumbaba la pantalla", () => {
    expect(errores(pantalla({ heroe: true }))).toEqual([]);
  });

  it("sigue aceptándose sin heroe", () => {
    expect(errores(pantalla({}))).toEqual([]);
  });

  it("heroe tiene que ser booleano: aceptar la prop no es aceptar cualquier cosa", () => {
    expect(errores(pantalla({ heroe: "si" })).join(" ")).toContain("heroe");
  });

  it("el catálogo publicado lo declara, que es lo que lee el modelo al elegir", () => {
    const props = (catalogo.components.SimuladorMeta.allOf[2] as { properties: Record<string, unknown> }).properties;
    expect(props).toHaveProperty("heroe");
  });
});
