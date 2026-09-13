import { describe, expect, it } from "vitest";
import type { Componente } from "@maya/a2ui";
import { accionParecida, armarMensajes, completarAccion, entradaPintarPantalla, inferirComponente, type EntradaPintarPantalla } from "../pantalla";
import rechazadas from "./fixtures/pintar-rechazadas-43.json";

/**
 * Issue #43: el `inputSchema` de `pintar_pantalla` lo valida el AI SDK ANTES de `execute`, y exigia
 * `id` y `component` en cada componente. 23 llamadas reales del 2026-09-13 se rechazaron ahi, con
 * un `invalid_union` de decenas de lineas, sin que la normalizacion llegara a correr. Y un aviso
 * con una accion que el catalogo no declara costaba otro paso.
 *
 * Los casos vienen de `banorte.corrida_tools` tal cual (`fixtures/pintar-rechazadas-43.json`), con
 * lo que devolvieron las tools del turno antes de la llamada.
 */

type Caso = { corridaTool: number; que: string; argumentos: Record<string, unknown>; datos: Record<string, unknown> };
const casos = (rechazadas as { casos: Caso[] }).casos;
const caso = (id: number): Caso => {
  const encontrado = casos.find((c) => c.corridaTool === id);
  if (!encontrado) throw new Error(`falta el caso ${id} en el fixture`);
  return encontrado;
};

function pintar(id: number) {
  const { argumentos, datos } = caso(id);
  const entrada = entradaPintarPantalla.safeParse(argumentos);
  expect(entrada.success, `el inputSchema rechaza el caso ${id}`).toBe(true);
  return armarMensajes(entrada.data as EntradaPintarPantalla, { datosBase: datos });
}

function componentesDe(armado: ReturnType<typeof armarMensajes>): Componente[] {
  if (!armado.ok) throw new Error(`se rechazo: ${armado.errores.join(" | ")}`);
  const actualizacion = armado.mensajes.find((m) => "updateComponents" in m) as { updateComponents: { components: Componente[] } };
  return actualizacion.updateComponents.components;
}

describe("pintar_pantalla: el inputSchema no rechaza lo que la normalizacion corrige (#43)", () => {
  it("los componentes sin `id` pasan el schema del SDK y la pantalla se arma (corrida_tools 2382)", () => {
    const componentes = componentesDe(pintar(2382));
    expect(componentes.every((c) => typeof c.id === "string" && c.id.length > 0)).toBe(true);
    expect(componentes.map((c) => c.component)).toContain("ResumenTarjeta");
  });

  it("un componente sin `component` cuyas props solo caben en uno se infiere (2851: ResumenTarjeta)", () => {
    const componentes = componentesDe(pintar(2851));
    const resumen = componentes.find((c) => c.id === "resumen");
    expect(resumen?.component).toBe("ResumenTarjeta");
  });

  it("sin `component` y sin una prop obligatoria que llena el MCP, se infiere igual (2836: ProyeccionPagoCredito)", () => {
    const componentes = componentesDe(pintar(2836));
    expect(componentes.find((c) => c.id === "credito")?.component).toBe("ProyeccionPagoCredito");
  });

  it('una llave con comillas de sobra (`"\\"component"`) se limpia (216)', () => {
    const componentes = componentesDe(pintar(216));
    expect(componentes.map((c) => c.component)).toContain("ProyeccionPagoCredito");
    expect(componentes.every((c) => !Object.keys(c).some((k) => k.includes('"')))).toBe(true);
  });

  it("una Conclusion con 4 sugerencias se recorta a las 3 que admite su schema (2372)", () => {
    const componentes = componentesDe(pintar(2372));
    const conclusion = componentes.find((c) => c.component === "Conclusion");
    expect((conclusion?.sugerencias as unknown[]).length).toBe(3);
  });

  it("un objeto sin `component` que no se puede inferir vuelve al modelo como UN error corto, no se tira en silencio", () => {
    const armado = armarMensajes({
      razon: "Tu tarjeta esta al limite y te conviene un plan",
      texto: "Te conviene un plan de pagos fijos.",
      componentesJson: [
        { id: "root", component: "Column", children: ["misterio"] },
        { id: "misterio", titulo: "Algo", cosaRara: 1, otraCosa: "x" },
      ],
    });
    expect(armado.ok).toBe(false);
    if (armado.ok) return;
    expect(armado.errores).toHaveLength(1);
    expect(armado.errores[0]).toMatch(/componentesJson\[1\] \(id "misterio"\) no dice que componente es: falta `component`/);
  });

  it("una razon que no alcanza (la palabra «razon») hereda el texto en las tarjetas", () => {
    const entrada = entradaPintarPantalla.parse({
      razon: "razon",
      texto: "Tu tarjeta esta al 96.7 % de su limite: congelala en un plan fijo.",
      componentesJson: [{ component: "Confirmacion", titulo: "Plan aplicado", detalle: "Tu plan a 18 meses quedo activo" }],
    });
    const componentes = componentesDe(armarMensajes(entrada));
    expect(componentes[0].razon).toBe("Tu tarjeta esta al 96.7 % de su limite: congelala en un plan fijo.");
  });
});

describe("inferirComponente: solo cuando no hay duda", () => {
  it("un objeto con `children` y sin props propias es la Column del arbol", () => {
    expect(inferirComponente({ id: "root", children: ["a", "b"] })).toBe("Column");
  });

  it("con menos de dos props propias no adivina", () => {
    expect(inferirComponente({ id: "x", razon: "Una razon de sobra larga", titulo: "Hola" })).toBeUndefined();
  });

  it("con props que caben igual de bien en varios no adivina", () => {
    expect(inferirComponente({ id: "x", titulo: "Hola", detalle: "Algo" })).toBeUndefined();
  });
});

describe("una accion que el catalogo no declara para el componente se cambia por una permitida (#43)", () => {
  it("el aviso de «quiero invertir» con `ver_plan_pago` pinta con `simular_plan` (corrida_tools 2929)", () => {
    const componentes = componentesDe(pintar(2929));
    const aviso = componentes.find((c) => c.component === "AvisoConsultaNoValida");
    expect((aviso?.action as { event: { name: string } }).event.name).toBe("simular_plan");
  });

  it("gana la permitida que comparte un sustantivo; si ninguna o varias, no hay parecida", () => {
    expect(accionParecida("ver_plan_pago", ["simular_plan", "simular_meta", "consultar_movimientos"])).toBe("simular_plan");
    expect(accionParecida("hacer_algo", ["simular_plan", "simular_meta"])).toBeUndefined();
  });

  it("sin parecida va la de por defecto; una permitida se respeta tal cual con su context", () => {
    const raro = { id: "a", component: "AvisoConsultaNoValida", action: { event: { name: "hacer_algo", context: { x: 1 } } } } as unknown as Componente;
    completarAccion(raro);
    expect(raro.action).toEqual({ event: { name: "simular_plan", context: {} } });

    const bueno = { id: "b", component: "AvisoConsultaNoValida", action: { event: { name: "simular_meta", context: { x: 1 } } } } as unknown as Componente;
    completarAccion(bueno);
    expect(bueno.action).toEqual({ event: { name: "simular_meta", context: { x: 1 } } });
  });
});
