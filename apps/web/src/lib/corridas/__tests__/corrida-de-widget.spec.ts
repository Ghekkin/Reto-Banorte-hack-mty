import { tool } from "ai";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { modeloGuionizado, pasoConTool } from "@/lib/agente/__tests__/ayudas";
import { crearConsultor } from "@/lib/widgets/consultor";
import { armarPantallaDeWidgets, type EntradaPintarWidgets } from "@/lib/widgets/pintar";
import { turnoDeWidget, type PantallaGuardada } from "@/lib/widgets/turno";
import { llamarFalso } from "@/lib/widgets/__tests__/mcp-falso";
import type { CorridaTerminada, Escritor, FilaCorrida } from "../grabadora";

/**
 * Una pregunta a una tarjeta de Inicio (widgets vivos) tambien es trabajo del modelo, y deja su
 * corrida como el turno del chat y la portada (issue #35): tipo `widget`, cada paso con sus
 * tokens, el total de todos los pasos, y cada tool con lo que entro y lo que salio. Con un
 * escritor en memoria: ninguna prueba escribe en la base (ADR 0010).
 */

function escritorDePrueba() {
  const iniciadas: FilaCorrida[] = [];
  const terminadas: CorridaTerminada[] = [];
  const escritor: Escritor = {
    activo: () => true,
    iniciar: async (_prompts, corrida) => {
      iniciadas.push(corrida);
    },
    terminar: async (corrida) => {
      terminadas.push(corrida);
    },
  };
  return { escritor, iniciadas, terminadas };
}

const PORTADA: EntradaPintarWidgets = {
  razon: "Tu tarjeta esta al 96.7 % de su limite y llevas 12 dias de atraso",
  texto: "Hoy lo urgente es tu tarjeta.",
  conclusion: {
    titular: "Tu tarjeta está al límite y con atraso: conviene diferirla hoy.",
    datos: [{ etiqueta: "Saldo de tu tarjeta", widget: "tarjeta", campo: "saldoCentavos", tono: "alerta" }],
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

/** Una lectura de apoyo que el modelo pide antes de cerrar. */
const apoyo = {
  consultar_tarjeta: tool({
    description: "Consulta la tarjeta",
    inputSchema: z.object({ usuarioId: z.string() }),
    execute: async () => ({ tarjeta: { saldoCentavos: 4738600 } }),
  }),
};

async function preguntaGrabada() {
  const { escritor, iniciadas, terminadas } = escritorDePrueba();
  const turno = await turnoDeWidget(
    { usuarioId: "usr_beto", pregunta: "¿y a 24 meses?", foco: "plan", pantalla },
    {
      modelo: modeloGuionizado([
        pasoConTool("consultar_tarjeta", { usuarioId: "usr_beto" }),
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
      herramientas: apoyo,
      escritor,
      dispositivoId: "dis_000000000000000000000001",
    },
  );
  // La escritura va en segundo plano: se espera a que la cola se vacie.
  await new Promise((r) => setTimeout(r, 10));
  return { turno, iniciadas, terminadas };
}

describe("la corrida de una pregunta a una tarjeta", () => {
  it("queda con tipo widget, quien, desde que dispositivo, que pregunto y como cerro", async () => {
    const { turno, iniciadas, terminadas } = await preguntaGrabada();
    expect(turno.ok, turno.ok ? "" : turno.motivo).toBe(true);
    expect(iniciadas[0]!.estado).toBe("corriendo");
    expect(terminadas).toHaveLength(1);
    const { corrida } = terminadas[0]!;
    expect(corrida).toMatchObject({
      tipo: "widget",
      usuarioId: "usr_beto",
      dispositivoId: "dis_000000000000000000000001",
      motivo: "foco:plan",
      estado: "ok",
      cierre: "modificar",
      modelo: "mock-model-id",
    });
    expect(corrida.peticion).toMatchObject({ pregunta: "¿y a 24 meses?", foco: "plan" });
    expect(turno.corridaId).toBe(corrida.id);
  });

  it("los tokens de la corrida son la suma de todos los pasos, y cada paso guarda los suyos", async () => {
    const { terminadas } = await preguntaGrabada();
    const { corrida, pasos } = terminadas[0]!;
    expect(corrida.pasos).toBe(2);
    expect(pasos.map((p) => p.paso)).toEqual([0, 1]);
    expect(pasos.map((p) => p.tokensEntrada)).toEqual([10, 10]);
    expect(corrida.tokensEntrada).toBe(20);
    expect(corrida.tokensSalida).toBe(20);
  });

  it("dice que tools se ofrecieron y guarda cada llamada con argumentos y resultado", async () => {
    const { terminadas } = await preguntaGrabada();
    const { corrida, tools, prompts } = terminadas[0]!;
    expect(corrida.toolsOfrecidas).toContainEqual({ nombre: "modificar_widget", origen: "cierre" });
    expect(corrida.toolsOfrecidas).toContainEqual({ nombre: "consultar_tarjeta", origen: "mcp" });
    expect(prompts.map((p) => p.tipo)).toEqual(["sistema", "tools"]);
    expect(corrida.promptSistemaHash).toBe(prompts[0]!.hash);

    expect(tools.find((t) => t.nombre === "consultar_tarjeta")).toMatchObject({ paso: 0, origen: "mcp", ok: true });
    expect(tools.find((t) => t.nombre === "modificar_widget")).toMatchObject({ paso: 1, origen: "cierre", ok: true });
    // La consulta que hizo el servidor para rearmar la tarjeta (la fuente del plan) tambien queda.
    expect(tools.find((t) => t.nombre === "simular_reestructura")).toMatchObject({ paso: -1, ok: true });
  });

  it("guarda las lineas que salieron (estado y tools) cuando nadie mas las graba", async () => {
    const { terminadas } = await preguntaGrabada();
    const tipos = terminadas[0]!.corrida.lineas.map((l) => l.tipo);
    expect(tipos).toContain("estado");
    expect(tipos).toContain("tool");
  });

  it("un turno que no cierra queda grabado con su estado y su error, no como ok", async () => {
    const { escritor, terminadas } = escritorDePrueba();
    const turno = await turnoDeWidget(
      { usuarioId: "usr_beto", pregunta: "aplica el plan", foco: "plan", pantalla },
      {
        modelo: modeloGuionizado(Array.from({ length: 8 }, () => pasoConTool("aplicar_plan_pago", { plazoMeses: 18 }))),
        nombreDelModelo: "simulado",
        llamar: llamarFalso("usr_beto"),
        herramientas: {},
        escritor,
      },
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(turno.ok).toBe(false);
    const { corrida } = terminadas[0]!;
    expect(corrida.tipo).toBe("widget");
    expect(corrida.estado).not.toBe("ok");
    expect(corrida.error).toBeTruthy();
  });

  it("si la base rechaza la corrida (migracion 0008 sin aplicar), la persona recibe su respuesta igual", async () => {
    const rechaza = new Error('new row for relation "corridas" violates check constraint "corridas_tipo_check"');
    const roto: Escritor = {
      activo: () => true,
      iniciar: async () => {
        throw rechaza;
      },
      terminar: async () => {
        throw rechaza;
      },
    };
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const turno = await turnoDeWidget(
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
          escritor: roto,
        },
      );
      await new Promise((r) => setTimeout(r, 10));
      expect(turno.ok).toBe(true);
      // Un solo aviso por corrida, no uno por escritura.
      expect(aviso).toHaveBeenCalledTimes(1);
    } finally {
      aviso.mockRestore();
    }
  });

  it("con el escritor apagado no hay corridaId", async () => {
    const apagado: Escritor = { activo: () => false, iniciar: async () => {}, terminar: async () => {} };
    const turno = await turnoDeWidget(
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
        escritor: apagado,
      },
    );
    expect(turno.ok).toBe(true);
    expect("corridaId" in turno).toBe(false);
  });
});
