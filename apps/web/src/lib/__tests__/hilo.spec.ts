import { describe, expect, it } from "vitest";
import { estadoVacio, procesarVarios, VERSION_A2UI, type EstadoSuperficie, type MensajeA2UI } from "@maya/a2ui";
import { calcularSuperficieViva, SUPERFICIE, type EntradaDelHilo } from "@/lib/agente/usar-agente";

/**
 * El hilo guarda las pantallas de los turnos anteriores, y la del turno en curso se pinta
 * aparte hasta que se congela. Equivocarse aqui no rompe nada visiblemente: solo hace que
 * la misma pantalla aparezca dos veces, o que el turno en curso no se vea mientras se
 * arma. Por eso la decision es una funcion pura y tiene pruebas.
 */
function pantalla(titulo: string): EstadoSuperficie {
  const mensajes: MensajeA2UI[] = [
    { version: VERSION_A2UI, createSurface: { surfaceId: SUPERFICIE, catalogId: "x" } },
    {
      version: VERSION_A2UI,
      updateComponents: {
        surfaceId: SUPERFICIE,
        components: [{ id: "root", component: "Confirmacion", titulo, detalle: "d", razon: "una razon larga" }],
      },
    },
  ];
  const { estado } = procesarVarios(estadoVacio(), mensajes);
  return estado.get(SUPERFICIE)!;
}

const mensaje = (texto: string): EntradaDelHilo => ({ tipo: "mensaje", rol: "usuario", texto });
const congelada = (superficie: EstadoSuperficie): EntradaDelHilo => ({
  tipo: "pantalla",
  superficie,
  transparencia: [],
});

describe("calcularSuperficieViva", () => {
  it("sin nada congelado, la pantalla actual es la del turno en curso", () => {
    const uno = pantalla("primera");
    expect(calcularSuperficieViva([mensaje("hola")], uno)).toBe(uno);
  });

  it("la que ya se congelo NO se vuelve a pintar", () => {
    const uno = pantalla("primera");
    expect(calcularSuperficieViva([mensaje("hola"), congelada(uno)], uno)).toBeUndefined();
  });

  it("la del turno nuevo si se pinta, con la anterior ya en el hilo", () => {
    const uno = pantalla("primera");
    const dos = pantalla("segunda");
    const hilo = [mensaje("hola"), congelada(uno), mensaje("y ahora?")];
    expect(calcularSuperficieViva(hilo, dos)).toBe(dos);
  });

  it("mira la ULTIMA congelada, no la primera", () => {
    const uno = pantalla("primera");
    const dos = pantalla("segunda");
    const hilo = [congelada(uno), mensaje("otra cosa"), congelada(dos)];
    expect(calcularSuperficieViva(hilo, dos)).toBeUndefined();
    expect(calcularSuperficieViva(hilo, pantalla("tercera"))).toBeDefined();
  });

  it("un turno sin pantalla (prosa, error) no deja hueco ni tapa la anterior", () => {
    const uno = pantalla("primera");
    const hilo = [congelada(uno), mensaje("pregunta que no pinto nada")];
    // El estado del renderer sigue teniendo la de antes: no se pinta de nuevo.
    expect(calcularSuperficieViva(hilo, uno)).toBeUndefined();
  });

  it("el hilo vacio no pinta nada", () => {
    expect(calcularSuperficieViva([], undefined)).toBeUndefined();
  });
});
