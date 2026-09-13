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

  // Issue #34: una cifra de apoyo que no se puede resolver le costaba a la portada una peticion
  // entera al modelo. Ahora se descarta y la portada sale a la primera; ninguna cifra entra
  // sin venir de una tarjeta, asi que no se abre ningun camino para numeros inventados.
  it("una cifra de apoyo a un campo que la tarjeta no tiene se descarta y la portada sale a la primera", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      { ...BUENA, conclusion: { ...BUENA.conclusion, datos: [{ etiqueta: "Deuda", widget: "tarjeta", campo: "deudaTotalCentavos" }] } },
      consultor,
    );
    expect(r.ok, r.ok ? "" : r.errores.join("\n")).toBe(true);
    if (!r.ok) return;
    expect(componentes(r.mensajes).get("conclusion")!.datos).toBeUndefined();
    expect(r.referencias).toEqual([]);
    expect(r.datosDescartados).toEqual([expect.stringMatching(/no tiene una cifra en "deudaTotalCentavos".*saldoCentavos/)]);
  });

  it("REAL (corrida_tools 2227, Beto, 05:14 del 13): campo ausente y tarjeta ausente se descartan; lo valido queda", async () => {
    // Los argumentos tal cual los mando gemini-3.5-flash-lite; se rechazaron con dos errores.
    const pedida: EntradaPintarWidgets = {
      razon: "Alberto tiene plan activo en su tarjeta y un crédito de nómina vigente, por lo que la prioridad es mostrarle el estado de su tarjeta y su crédito.",
      texto: "Mantén el monitoreo de tus mensualidades vigentes.",
      widgets: [
        { id: "tarjeta", heroe: true, razon: "Consulta el estatus actual de tu tarjeta de crédito y tu plan activo.", fuente: "tarjeta" },
        { id: "credito", heroe: false, razon: "Revisa los detalles y el saldo insoluto de tu crédito de nómina.", fuente: "credito" },
      ],
      conclusion: {
        saludo: "Hola, Alberto",
        titular: "Tu saldo está diferido y tus pagos están bajo control",
        detalle: "Ya tienes un plan activo para diferir tu saldo en la tarjeta y mantienes al corriente tu crédito de nómina. Continúa con tus pagos puntuales para proteger tu salud financiera.",
        datos: [
          { tono: "neutro", campo: "saldoDiferidoCentavos", widget: "tarjeta", etiqueta: "Saldo diferido" },
          { tono: "bueno", campo: "mensualidadCentavos", widget: "plan_de_pago", etiqueta: "Mensualidad del plan" },
          { tono: "neutro", campo: "saldoInsolutoCentavos", widget: "credito", etiqueta: "Saldo del crédito" },
        ],
        sugerencias: ["¿Cuánto falta para terminar de pagar mi crédito de nómina?", "¿Cuáles son mis categorías con mayor gasto este mes?", "¿Cómo puedo mejorar mi puntaje de salud financiera?"],
      },
    };
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(pedida, consultor);
    expect(r.ok, r.ok ? "" : r.errores.join("\n")).toBe(true);
    if (!r.ok) return;
    const datos = componentes(r.mensajes).get("conclusion")!.datos as Array<{ etiqueta: string }>;
    expect(datos.map((d) => d.etiqueta)).toEqual(["Saldo del crédito"]);
    // Las referencias que se guardan son solo las que quedaron: `recalcularConclusion` no puede
    // resucitar despues una cifra que nunca se mostro.
    expect(r.referencias).toEqual([{ etiqueta: "Saldo del crédito", widget: "credito", campo: "saldoInsolutoCentavos", tono: "neutro" }]);
    expect(r.datosDescartados).toHaveLength(2);
    expect(r.datosDescartados.join(" ")).toMatch(/no hay una tarjeta "plan_de_pago"/);
  });

  it("si ninguna cifra de apoyo se puede resolver, la conclusion sale sin cifras (el titular basta)", async () => {
    const { consultor } = consultorFalso("usr_beto");
    const r = await armarPantallaDeWidgets(
      {
        ...BUENA,
        conclusion: {
          ...BUENA.conclusion,
          datos: [
            { etiqueta: "Tu salud financiera", widget: "salud", campo: "puntajeSalud" },
            { etiqueta: "Puntaje", widget: "tarjeta", campo: "puntajeSalud" },
          ],
        },
      },
      consultor,
    );
    expect(r.ok, r.ok ? "" : r.errores.join("\n")).toBe(true);
    if (!r.ok) return;
    const conclusion = componentes(r.mensajes).get("conclusion")!;
    expect(conclusion.titular).toBe(BUENA.conclusion.titular);
    expect(conclusion.datos).toBeUndefined();
    expect(r.referencias).toEqual([]);
  });

  it("dos heroes o ids repetidos se rechazan antes de consultar nada", async () => {
    const { consultor, llamar } = consultorFalso("usr_beto");
    const dosHeroes = await armarPantallaDeWidgets({ ...BUENA, widgets: BUENA.widgets.map((w) => ({ ...w, heroe: true })) }, consultor);
    const repetidos = await armarPantallaDeWidgets({ ...BUENA, widgets: BUENA.widgets.map((w) => ({ ...w, id: "x1" })) }, consultor);
    expect(dosHeroes.ok || repetidos.ok).toBe(false);
    expect(llamar).not.toHaveBeenCalled();
  });
});
