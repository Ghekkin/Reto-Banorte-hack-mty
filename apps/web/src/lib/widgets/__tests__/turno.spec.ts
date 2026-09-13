import { beforeAll, describe, expect, it, vi } from "vitest";
import { tool } from "ai";
import { z } from "zod";
import type { Componente, MensajeA2UI } from "@maya/a2ui";
import { modeloGuionizado, pasoConTool } from "@/lib/agente/__tests__/ayudas";
import { crearConsultor } from "../consultor";
import { armarPantallaDeWidgets, type EntradaPintarWidgets } from "../pintar";
import { componentesDe, fundirAjuste } from "../pantalla-viva";
import { crearCierreDeWidgets, turnoDeWidget, type PantallaGuardada } from "../turno";
import { llamarFalso } from "./mcp-falso";

/**
 * Preguntarle a una tarjeta. Lo que se garantiza aqui, sin modelo real:
 *  - las tres salidas emiten SOLO `updateComponents` de la tarjeta (y la conclusion si sus
 *    cifras cambiaron): nunca `createSurface`, nunca las otras tarjetas;
 *  - las cifras nuevas salen del MCP, y la conclusion las sigue;
 *  - lo que el modelo no puede hacer, no lo hace (cambiar de componente con modificar, dejar
 *    la tarjeta igual, inventar una cifra en la nota, llamar una accion).
 */

const PORTADA: EntradaPintarWidgets = {
  razon: "Tu tarjeta esta al 96.7 % de su limite y llevas 12 dias de atraso",
  texto: "Hoy lo urgente es tu tarjeta.",
  conclusion: {
    titular: "Tu tarjeta está al límite y con atraso: conviene diferirla hoy.",
    datos: [
      { etiqueta: "Saldo de tu tarjeta", widget: "tarjeta", campo: "saldoCentavos", tono: "alerta" },
      { etiqueta: "Mensualidad sugerida", widget: "plan", campo: "opciones.1.mensualidadCentavos" },
    ],
  },
  widgets: [
    { id: "tarjeta", fuente: "tarjeta", heroe: true, razon: "Tu tarjeta es lo mas urgente de tu mes" },
    { id: "plan", fuente: "plan_de_pago", razon: "Diferir el saldo baja lo que pagas cada mes" },
  ],
};

let pantalla: PantallaGuardada;

beforeAll(async () => {
  const r = await armarPantallaDeWidgets(PORTADA, crearConsultor({ usuarioId: "usr_beto", llamar: llamarFalso("usr_beto") }));
  if (!r.ok) throw new Error(r.errores.join("\n"));
  pantalla = { mensajes: r.mensajes, procedencias: r.procedencias, referencias: r.referencias };
});

function cierre(pregunta = "pregunta de prueba") {
  const llamar = llamarFalso("usr_beto");
  const ctx = {
    usuarioId: "usr_beto",
    pregunta,
    componentes: componentesDe(pantalla.mensajes),
    procedencias: pantalla.procedencias,
    referencias: pantalla.referencias,
    consultor: crearConsultor({ usuarioId: "usr_beto", llamar }),
    datosDeApoyo: [] as unknown[],
  };
  return { ...crearCierreDeWidgets(ctx), llamar };
}

async function ejecutar(c: ReturnType<typeof cierre>, nombre: string, entrada: Record<string, unknown>) {
  const t = c.herramientas[nombre]!;
  return (await t.execute!(entrada as never, { toolCallId: "t", messages: [] })) as { ok: boolean; errores?: string[] };
}

function cambiados(mensajes: MensajeA2UI[]): Componente[] {
  return mensajes.flatMap((m) => ("updateComponents" in m ? m.updateComponents.components : []));
}

describe("modificar_widget", () => {
  it("otro plazo preseleccionado: solo cambia la tarjeta del plan, sin createSurface", async () => {
    const c = cierre("¿y a 24 meses?");
    const r = await ejecutar(c, "modificar_widget", {
      widgetId: "plan",
      variantes: '{"plazoElegido":24}',
      texto: "A 24 meses tu mensualidad sería de $2,622.34.",
      razon: "Pediste ver el plan a 24 meses",
    });
    expect(r).toEqual({ ok: true });
    const hecho = c.resultado()!;
    expect(hecho.cierre).toBe("modificar");
    expect(hecho.mensajes.some((m) => "createSurface" in m || "updateDataModel" in m)).toBe(false);
    const [plan, ...otros] = cambiados(hecho.mensajes);
    expect(plan!.id).toBe("plan");
    expect(plan!.plazoElegido).toBe(24);
    // La mensualidad citada en la conclusion es la opcion 1, que no cambio: la conclusion no viaja.
    expect(otros).toEqual([]);
    expect(hecho.procedencias.plan!.variantes).toEqual({ plazoElegido: 24 });
    // El boton sigue siendo el mismo.
    expect(plan!.action).toEqual({ event: { name: "aplicar_plan_pago", context: {} } });
  });

  it("otros plazos cotizados: se re-consulta el MCP y la cifra de la conclusion se rehace", async () => {
    const c = cierre("cotizame a 6 y 24 meses");
    const r = await ejecutar(c, "modificar_widget", {
      widgetId: "plan",
      parametros: '{"plazosMeses":[6,24]}',
      variantes: '{"plazoElegido":24}',
      texto: "Cotizado a 6 y 24 meses.",
      razon: "Pediste comparar 6 contra 24 meses",
    });
    expect(r).toEqual({ ok: true });
    expect(c.llamar).toHaveBeenCalledWith("simular_reestructura", { plazosMeses: [6, 24], usuarioId: "usr_beto" });
    const [plan, conclusion] = cambiados(c.resultado()!.mensajes);
    const opciones = plan!.opciones as Array<{ plazoMeses: number; mensualidadCentavos: number }>;
    expect(opciones.map((o) => o.plazoMeses)).toEqual([6, 24]);
    expect(conclusion!.id).toBe("conclusion");
    const mensualidad = (conclusion!.datos as Array<{ etiqueta: string; valor: string }>).find((d) => d.etiqueta === "Mensualidad sugerida");
    expect(mensualidad!.valor).toBe(new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(opciones[1]!.mensualidadCentavos / 100));
  });

  it("no puede cambiar de tipo de tarjeta: eso es reemplazar", async () => {
    const r = await ejecutar(cierre(), "modificar_widget", { widgetId: "plan", fuente: "gasto_del_mes", texto: "x", razon: "Una razon suficientemente larga" });
    expect(r.ok).toBe(false);
    expect(r.errores![0]).toMatch(/usa `reemplazar_widget`/);
  });

  it("si la tarjeta queda igual, lo dice y sugiere responder", async () => {
    const r = await ejecutar(cierre(), "modificar_widget", { widgetId: "plan", variantes: '{"plazoElegido":18}', texto: "Igual.", razon: "Una razon suficientemente larga" });
    expect(r.ok).toBe(false);
    expect(r.errores![0]).toMatch(/queda exactamente igual.*`responder`/);
  });

  it("una tarjeta que no existe lista las que si", async () => {
    const r = await ejecutar(cierre(), "modificar_widget", { widgetId: "gasto", texto: "x", razon: "Una razon suficientemente larga" });
    expect(r.errores![0]).toMatch(/las que hay: tarjeta, plan/);
  });

  it("MODELO TRAMPOSO: una cifra inventada en la nota se rechaza aunque la tarjeta este bien", async () => {
    const c = cierre("¿y a 24 meses?");
    const r = await ejecutar(c, "modificar_widget", {
      widgetId: "plan",
      variantes: '{"plazoElegido":24}',
      texto: "A 24 meses te ahorras $15,000 al año.",
      razon: "Pediste ver el plan a 24 meses",
    });
    expect(r.ok).toBe(false);
    expect(r.errores![0]).toMatch(/"\$15,000"/);
    expect(c.resultado()).toBeUndefined();
  });
});

describe("reemplazar_widget", () => {
  it("en el hueco de la tarjeta entra el gasto; la conclusion suelta la cifra que ya no existe", async () => {
    const c = cierre("¿en qué se me fue el dinero?");
    const r = await ejecutar(c, "reemplazar_widget", {
      widgetId: "tarjeta",
      fuente: "gasto_del_mes",
      texto: "Este es tu gasto de agosto por categoría.",
      razon: "Preguntaste en que se te fue el dinero",
    });
    expect(r).toEqual({ ok: true });
    const hecho = c.resultado()!;
    const [nuevo, conclusion] = cambiados(hecho.mensajes);
    expect(nuevo).toMatchObject({ id: "tarjeta", component: "GastoPorCategoria", heroe: true });
    expect((conclusion!.datos as Array<{ etiqueta: string }>).map((d) => d.etiqueta)).toEqual(["Mensualidad sugerida"]);
    expect(hecho.procedencias.tarjeta!.tool).toBe("analizar_gasto");

    // Fundido en la portada guardada: la raiz y el plan quedan intactos.
    const despues = componentesDe(fundirAjuste(pantalla.mensajes, hecho.mensajes));
    const antes = componentesDe(pantalla.mensajes);
    expect(despues.get("root")).toEqual(antes.get("root"));
    expect(despues.get("plan")).toEqual(antes.get("plan"));
  });
});

describe("responder", () => {
  it("no emite mensajes y verifica las cifras de la aclaracion", async () => {
    const c = cierre("¿qué es el CAT?");
    const mal = await ejecutar(c, "responder", { widgetId: "plan", texto: "El CAT es 41.5 % en tu caso.", razon: "Preguntaste que es el CAT" });
    expect(mal.ok).toBe(false);
    const bien = await ejecutar(c, "responder", { widgetId: "plan", texto: "El CAT de 28.58 % suma intereses y comisiones del plan a 18 meses.", razon: "Preguntaste que es el CAT" });
    expect(bien).toEqual({ ok: true });
    expect(c.resultado()).toMatchObject({ cierre: "responder", mensajes: [] });
  });
});

describe("turnoDeWidget con modelo simulado", () => {
  it("cierra con modificar_widget y reporta la consulta al MCP", async () => {
    const eventos: string[] = [];
    const r = await turnoDeWidget(
      { usuarioId: "usr_beto", pregunta: "¿y a 24 meses?", foco: "plan", pantalla },
      {
        modelo: modeloGuionizado([
          pasoConTool("modificar_widget", {
            widgetId: "plan",
            parametros: '{"plazosMeses":[6,24]}',
            variantes: '{"plazoElegido":24}',
            texto: "Listo, ya ves el plan a 24 meses.",
            razon: "Pediste ver el plan a 24 meses",
          }),
        ]),
        nombreDelModelo: "simulado",
        llamar: llamarFalso("usr_beto"),
        herramientas: {},
        alEvento: (e) => eventos.push(e.tipo === "tool" ? `tool:${e.nombre}` : `estado:${e.valor}`),
      },
    );
    expect(r.ok, r.ok ? "" : r.motivo).toBe(true);
    if (!r.ok) return;
    expect(r).toMatchObject({ cierre: "modificar", widgetId: "plan", tools: ["simular_reestructura"] });
    expect(eventos).toContain("tool:simular_reestructura");
  });

  it("una accion no esta entre las tools del turno, aunque el MCP la ofrezca", async () => {
    const accion = vi.fn();
    const r = await turnoDeWidget(
      { usuarioId: "usr_beto", pregunta: "aplica el plan", foco: "plan", pantalla },
      {
        // Tantos pasos como el turno pueda pedir, para que el guion no se acabe antes que el bucle.
        modelo: modeloGuionizado(Array.from({ length: 8 }, () => pasoConTool("aplicar_plan_pago", { plazoMeses: 18 }))),
        nombreDelModelo: "simulado",
        llamar: llamarFalso("usr_beto"),
        herramientas: {
          aplicar_plan_pago: tool({ description: "accion", inputSchema: z.object({ plazoMeses: z.number() }), execute: async (i) => accion(i) }),
        },
      },
    );
    expect(accion).not.toHaveBeenCalled();
    expect(r.ok).toBe(false);
  });

  it("un foco que no es una tarjeta con fuente se rechaza sin llamar al modelo", async () => {
    const r = await turnoDeWidget(
      { usuarioId: "usr_beto", pregunta: "¿y esto?", foco: "conclusion", pantalla },
      { modelo: modeloGuionizado([]), llamar: llamarFalso("usr_beto"), herramientas: {} },
    );
    expect(r).toMatchObject({ ok: false, motivo: 'la tarjeta "conclusion" no esta en tu Inicio' });
  });
});

describe("turnoDeWidget: un proveedor que no contesta", () => {
  it("si el primer intento no llama nada en su plazo, se repite y cierra", async () => {
    const { MockLanguageModelV2 } = await import("ai/test");
    const { modeloColgado } = await import("@/lib/agente/__tests__/ayudas");
    const colgado = modeloColgado();
    const bueno = modeloGuionizado([
      pasoConTool("responder", { widgetId: "plan", texto: "El CAT suma intereses y comisiones del plan.", razon: "Preguntaste que es el CAT" }),
    ]);
    let llamadas = 0;
    const modelo = new MockLanguageModelV2({
      doStream: async (opciones) => (++llamadas === 1 ? colgado.doStream(opciones) : bueno.doStream(opciones)),
    });
    const r = await turnoDeWidget(
      { usuarioId: "usr_beto", pregunta: "¿qué es el CAT?", foco: "plan", pantalla },
      { modelo, llamar: llamarFalso("usr_beto"), herramientas: {}, plazoPorIntentoMs: 300, timeoutMs: 5_000 },
    );
    expect(llamadas).toBe(2);
    expect(r).toMatchObject({ ok: true, cierre: "responder" });
  });
});
