import { describe, expect, it, vi } from "vitest";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { modeloGuionizado, pasoConTexto, pasoConTool } from "@/lib/agente/__tests__/ayudas";
import { encargoDePortada, generarPortada } from "../generar";

/**
 * El generador de la portada con un modelo simulado: prueba el cableado (datos ->
 * modelo -> `pintar_pantalla` validada -> mensajes A2UI) sin llave, sin red y sin base.
 * Que el modelo chico ELIJA bien las tarjetas se mide con `pnpm probar-inicio`.
 */

const PANTALLA_VALIDA = JSON.stringify([
  { id: "root", component: "Column", children: ["tarjeta"] },
  {
    id: "tarjeta",
    component: "Confirmacion",
    titulo: "Tu plan sigue activo",
    detalle: "18 meses de $3,193.35",
    razon: "Tienes un plan de pago corriendo y hoy vas al dia",
  },
]);

const PINTAR_BIEN = {
  razon: "Tienes la tarjeta al 96.7 % de su limite y 12 dias de atraso",
  texto: "Hoy lo urgente es la tarjeta: con el plan a 18 meses bajas la mensualidad a $3,193.",
  componentesJson: PANTALLA_VALIDA,
  datosJson: JSON.stringify({ tarjeta: { saldoCentavos: 4738600 } }),
  sugerencias: ["¿Cuanto me ahorro con el plan?", "¿En que se me fue el dinero?"],
};

const DATOS = {
  panorama_inicial: { perfil: { nombre: "Alberto" }, tarjeta: { saldoCentavos: 4738600, usoDelLimite: 0.967 }, situacion: "deuda_urgente" },
  analizar_gasto: { patronGasto: "estable" },
  analizar_ahorro: { ahorro: null, estadoAhorro: "sin_meta" },
  consultar_creditos: { creditos: [] },
};

function herramientas(espias: { lectura?: ReturnType<typeof vi.fn>; accion?: ReturnType<typeof vi.fn> } = {}): ToolSet {
  return {
    simular_reestructura: tool({
      description: "Simula plazos",
      inputSchema: z.object({ usuarioId: z.string().optional() }),
      execute: (entrada) => {
        espias.lectura?.(entrada);
        return { planes: [{ plazoMeses: 18, mensualidadCentavos: 319335 }] };
      },
    }),
    ejecutar_decision: tool({
      description: "Aplica una accion",
      inputSchema: z.object({ accion: z.string() }),
      execute: (entrada) => {
        espias.accion?.(entrada);
        return { ok: true };
      },
    }),
  };
}

describe("generarPortada", () => {
  it("pinta en un paso con los datos ya reunidos", async () => {
    const portada = await generarPortada("usr_beto", {
      modelo: modeloGuionizado([pasoConTool("pintar_pantalla", PINTAR_BIEN)]),
      herramientas: herramientas(),
      datos: DATOS,
      nombreDelModelo: "modelo-de-prueba",
    });

    expect(portada.ok).toBe(true);
    if (!portada.ok) return;
    expect(portada.mensajes).toHaveLength(3);
    expect(portada.mensajes.map((m) => Object.keys(m)[1])).toEqual(["createSurface", "updateComponents", "updateDataModel"]);
    expect(portada.texto).toBe(PINTAR_BIEN.texto);
    expect(portada.razon).toBe(PINTAR_BIEN.razon);
    expect(portada.sugerencias).toHaveLength(2);
    expect(portada.pasos).toBe(1);
    expect(portada.modelo).toBe("modelo-de-prueba");
  });

  it("puede pedir una tool de apoyo en el paso 0 y pintar en el siguiente", async () => {
    const lectura = vi.fn();
    const portada = await generarPortada("usr_beto", {
      modelo: modeloGuionizado([
        pasoConTool("simular_reestructura", { usuarioId: "usr_beto" }),
        pasoConTool("pintar_pantalla", PINTAR_BIEN),
      ]),
      herramientas: herramientas({ lectura }),
      datos: DATOS,
    });

    expect(portada.ok).toBe(true);
    expect(portada.pasos).toBe(2);
    expect(lectura).toHaveBeenCalledTimes(1);
  });

  it("nunca ejecuta una tool de accion, aunque el modelo la pida", async () => {
    const accion = vi.fn();
    const portada = await generarPortada("usr_beto", {
      modelo: modeloGuionizado([
        pasoConTool("ejecutar_decision", { accion: "aplicar_plan_pago" }),
        pasoConTool("pintar_pantalla", PINTAR_BIEN),
      ]),
      herramientas: herramientas({ accion }),
      datos: DATOS,
      timeoutMs: 5_000,
    });

    expect(accion).not.toHaveBeenCalled();
    // Con o sin pantalla al final, lo que importa es que el estado no se toco.
    expect(portada.modelo).toBeDefined();
  });

  it("reintenta una vez cuando la pantalla viene invalida", async () => {
    const portada = await generarPortada("usr_beto", {
      modelo: modeloGuionizado([
        pasoConTool("pintar_pantalla", { ...PINTAR_BIEN, componentesJson: "esto no es JSON" }),
        pasoConTool("pintar_pantalla", PINTAR_BIEN),
      ]),
      herramientas: herramientas(),
      datos: DATOS,
    });

    expect(portada.ok).toBe(true);
    expect(portada.pasos).toBe(2);
  });

  it("devuelve el motivo cuando el modelo no entrega pantalla", async () => {
    const portada = await generarPortada("usr_beto", {
      modelo: modeloGuionizado([pasoConTexto("Hola, aqui va tu resumen en prosa.")]),
      herramientas: herramientas(),
      datos: DATOS,
    });

    expect(portada.ok).toBe(false);
    if (portada.ok) return;
    expect(portada.motivo).toContain("no entrego una pantalla");
  });

  it("devuelve el motivo cuando las dos entregas vienen invalidas", async () => {
    const mala = { ...PINTAR_BIEN, componentesJson: JSON.stringify([{ id: "root", component: "NoExiste" }]) };
    const portada = await generarPortada("usr_beto", {
      modelo: modeloGuionizado([pasoConTool("pintar_pantalla", mala), pasoConTool("pintar_pantalla", mala)]),
      herramientas: herramientas(),
      datos: DATOS,
    });

    expect(portada.ok).toBe(false);
    if (portada.ok) return;
    expect(portada.motivo).toContain("invalida");
    expect(portada.motivo).toContain("NoExiste");
  });
});

describe("encargoDePortada", () => {
  const encargo = encargoDePortada("usr_ana", DATOS);

  it("lleva los datos de cada tool tal cual, con su nombre", () => {
    expect(encargo).toContain("usuarioId: usr_ana");
    expect(encargo).toContain(`panorama_inicial: ${JSON.stringify(DATOS.panorama_inicial)}`);
    expect(encargo).toContain(`analizar_ahorro: ${JSON.stringify(DATOS.analizar_ahorro)}`);
  });

  it("pide una portada, no una respuesta: 3 tarjetas con Conclusion, una heroe, y pintar al final", () => {
    expect(encargo).toContain("MODO PORTADA");
    // El tope es de codigo (`TOPE_DE_TARJETAS` en `agente/pantalla.ts`); aqui se comprueba
    // que el encargo lo diga, para que el modelo no gaste un turno en descubrirlo.
    expect(encargo).toContain("EXACTAMENTE 3 tarjetas, y la primera es `Conclusion`");
    expect(encargo).toContain("lleva `heroe: true`, y es la UNICA que lo lleva");
    expect(encargo).toContain("Nada de `Confirmacion`");
    expect(encargo.trim().endsWith("Termina llamando `pintar_pantalla` exactamente una vez.")).toBe(true);
  });
});
