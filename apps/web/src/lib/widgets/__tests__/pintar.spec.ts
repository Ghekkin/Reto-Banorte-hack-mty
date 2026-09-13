import { describe, expect, it } from "vitest";
import type { Componente, MensajeA2UI } from "@maya/a2ui";
import { armarPantallaDeWidgets, type EntradaPintarWidgets } from "../pintar";
import { consultorFalso, salida } from "./mcp-falso";

/**
 * `pintar_widgets`: la portada por fuentes. Lo que importa probar no es que arme algo —eso
 * lo mide `pnpm probar-widgets` con el modelo real—, sino que **ningun camino deje entrar
 * una cifra que no venga del MCP**, por mas que el modelo lo intente.
 */

const BUENA: EntradaPintarWidgets = {
  razon: "Tu tarjeta esta al 96.7 % de su limite y llevas 12 dias de atraso",
  texto: "Hoy lo urgente es tu tarjeta.",
  conclusion: {
    saludo: "Hola, Alberto",
    titular: "Tu tarjeta está al límite y con atraso: conviene diferirla hoy.",
    detalle: "A 18 meses tu mensualidad sería de $3,193.35.",
    datos: [
      { etiqueta: "Saldo de tu tarjeta", widget: "tarjeta", campo: "saldoCentavos", tono: "alerta" },
      { etiqueta: "Mensualidad a 18 meses", widget: "plan", campo: "opciones.1.mensualidadCentavos" },
    ],
    sugerencias: ["¿Y a 24 meses?", "¿Qué es el CAT?", "¿En qué se me fue el dinero?"],
  },
  widgets: [
    { id: "tarjeta", fuente: "tarjeta", heroe: true, razon: "Tu tarjeta es lo mas urgente de tu mes" },
    { id: "plan", fuente: "plan_de_pago", razon: "Diferir el saldo baja lo que pagas cada mes" },
  ],
};

function componentes(mensajes: MensajeA2UI[]): Map<string, Componente> {
  const m = mensajes.find((x) => "updateComponents" in x) as Extract<MensajeA2UI, { updateComponents: unknown }>;
  return new Map(m.updateComponents.components.map((c) => [c.id, c]));
}

describe("armarPantallaDeWidgets", () => {
  it("arma la portada: tres mensajes A2UI, cifras del MCP y la procedencia de cada tarjeta", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(BUENA, consultor);
    expect(r.ok, r.ok ? "" : r.errores.join("\n")).toBe(true);
    if (!r.ok) return;

    expect(r.mensajes.map((m) => Object.keys(m).find((k) => k !== "version"))).toEqual(["createSurface", "updateComponents", "updateDataModel"]);
    const c = componentes(r.mensajes);
    expect(c.get("root")!.children).toEqual(["conclusion", "tarjeta", "plan"]);

    const tarjeta = (salida("usr_beto", "consultar_tarjeta") as { tarjeta: { saldoCentavos: number } }).tarjeta;
    expect(c.get("tarjeta")!.saldoCentavos).toBe(tarjeta.saldoCentavos);
    expect(c.get("tarjeta")!.heroe).toBe(true);
    // La cifra de apoyo la escribio el servidor, formateada desde la tarjeta.
    expect(c.get("conclusion")!.datos).toEqual([
      { etiqueta: "Saldo de tu tarjeta", valor: "$47,386.00", tono: "alerta" },
      { etiqueta: "Mensualidad a 18 meses", valor: "$3,193.35", tono: "neutro" },
    ]);
    // El boton del plan sale encendido: la accion se completa como en pintar_pantalla.
    expect(c.get("plan")!.action).toEqual({ event: { name: "aplicar_plan_pago", context: {} } });

    expect(r.procedencias.tarjeta).toMatchObject({ fuente: "tarjeta", tool: "consultar_tarjeta", argumentos: { usuarioId: "usr_beto" } });
    expect(r.procedencias.tarjeta!.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(r.referencias).toHaveLength(2);
  });

  it("MODELO TRAMPOSO: una cifra en variantes se rechaza", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      { ...BUENA, widgets: [{ ...BUENA.widgets[0]!, variantes: JSON.stringify({ saldoCentavos: 1 }) }, BUENA.widgets[1]!] },
      consultor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/variantes \(tarjeta\): no acepta saldoCentavos/);
  });

  it("MODELO TRAMPOSO: un parametro que no existe (ni un usuarioId ajeno) se rechaza", async () => {
    const { consultor, llamar } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      { ...BUENA, widgets: [{ ...BUENA.widgets[0]!, parametros: JSON.stringify({ usuarioId: "usr_carmen" }) }, BUENA.widgets[1]!] },
      consultor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/no acepta usuarioId/);
    expect(llamar.mock.calls.every(([, args]) => (args as { usuarioId: string }).usuarioId === "usr_beto")).toBe(true);
  });

  it("MODELO TRAMPOSO: una cifra inventada en el titular se rechaza con la cifra señalada", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      { ...BUENA, conclusion: { ...BUENA.conclusion, titular: "Debes $2,954,065 entre todo y eso es mucho." } },
      consultor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0]).toMatch(/"\$2,954,065"/);
  });

  it("en el ultimo intento la cifra inventada se quita, no se publica", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      {
        ...BUENA,
        conclusion: { ...BUENA.conclusion, detalle: "A 18 meses pagarías $3,193.35. Te ahorrarías $99,999 en total." },
      },
      consultor,
      { ultimoIntento: true },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(componentes(r.mensajes).get("conclusion")!.detalle).toBe("A 18 meses pagarías $3,193.35.");
    expect(r.cifrasQuitadas).toEqual(["$99,999"]);
  });

  it("una fuente que no aplica a la persona le pide al modelo elegir otra", async () => {
    const { consultor } = consultorFalso("usr_ana");
    const r = await armarPantallaDeWidgets(BUENA, consultor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(" ")).toMatch(/no aplica a esta persona.*Elige otra fuente/);
  });

  it("una cifra de apoyo a un campo que la tarjeta no tiene dice cuales si", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      { ...BUENA, conclusion: { ...BUENA.conclusion, datos: [{ etiqueta: "Deuda", widget: "tarjeta", campo: "deudaTotalCentavos" }] } },
      consultor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores[0]).toMatch(/no tiene una cifra en "deudaTotalCentavos".*saldoCentavos/);
  });

  it("dos heroes o ids repetidos se rechazan antes de consultar nada", async () => {
    const { consultor, llamar } = consultorFalso("usr_beto");
    const dosHeroes = await armarPantallaDeWidgets({ ...BUENA, widgets: BUENA.widgets.map((w) => ({ ...w, heroe: true })) }, consultor);
    const repetidos = await armarPantallaDeWidgets({ ...BUENA, widgets: BUENA.widgets.map((w) => ({ ...w, id: "x1" })) }, consultor);
    expect(dosHeroes.ok || repetidos.ok).toBe(false);
    expect(llamar).not.toHaveBeenCalled();
  });
});
