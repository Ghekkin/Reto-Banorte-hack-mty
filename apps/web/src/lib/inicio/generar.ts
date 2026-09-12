import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { stepCountIs, streamText, type LanguageModel, type ToolSet } from "ai";
import type { MensajeA2UI } from "@maya/a2ui";
import { conectarMcp, herramientasDelMcp, llamarTool, type LlamadaRegistrada } from "@/lib/agente/mcp-cliente";
import { crearPintor, type ResultadoPintar } from "@/lib/agente/pantalla";
import { systemPrompt } from "@/lib/agente/prompt";
import { configInicio } from "./config";
import { modeloDelInicio, opcionesDelInicio } from "./modelo";

/**
 * Arma la portada de una persona: la pantalla de Inicio que ve al abrir la app, sin
 * haber preguntado nada.
 *
 * Es el mismo motor que un turno de conversacion (`lib/agente/agente.ts`): el mismo
 * system prompt, las mismas tools del MCP, la misma `pintar_pantalla` con sus cuatro
 * validaciones. Tres diferencias, y las tres son de costo:
 *
 *  1. **Otro modelo**, mas chico (`MODELO_INICIO`). No hay intencion que interpretar.
 *  2. **Arranca con los datos en la mano.** Antes de llamar al modelo, el servidor pide
 *     al MCP lo que toda portada necesita (`reunirDatos`) y se lo pasa en el contexto.
 *     El modelo tiene UN paso para pedir lo que le falte y el siguiente es para pintar.
 *  3. **Solo tools de lectura.** Corre solo, cada cierto tiempo, sin nadie mirando: una
 *     accion desde aqui seria un cambio de estado que nadie pidio.
 *
 * Nada se escribe aqui: devuelve la pantalla o el motivo. Guardarla es del servicio.
 */

/** `nombre de tool -> lo que devolvio`, tal como se le muestra al modelo. */
export type DatosDeLaPortada = Record<string, unknown>;

export type OpcionesDeGeneracion = {
  /** Para pruebas: un modelo simulado en vez del proveedor real. */
  modelo?: LanguageModel;
  /** Para pruebas: tools ya armadas, sin abrir conexion al MCP. */
  herramientas?: ToolSet;
  /** Para pruebas: el paquete de datos ya reunido, sin MCP. */
  datos?: DatosDeLaPortada;
  nombreDelModelo?: string;
  timeoutMs?: number;
  /**
   * Lo que la persona escribio en Inicio. Con esto la pantalla deja de ser la portada de
   * "como estoy hoy" y pasa a contestar ESA pregunta, con el mismo motor y el mismo
   * catalogo: sigue siendo un dashboard, no un chat.
   *
   * Cambia solo el encargo (`encargoDeConsulta` en vez de `encargoDePortada`). Todo lo
   * demas —prefetch de datos, tools de apoyo, cero tools de accion, los tres pasos, el
   * reintento— es identico a proposito: dos caminos de generacion serian dos veces la
   * superficie de fallo, y el que se usa menos es el que nadie prueba.
   */
  pregunta?: string;
};

export type PortadaGenerada =
  | {
      ok: true;
      mensajes: MensajeA2UI[];
      texto: string;
      razon: string;
      sugerencias: string[];
      tools: string[];
      entradaTokens: number | null;
      salidaTokens: number | null;
      cacheTokens: number | null;
      pasos: number;
      ms: number;
      modelo: string;
    }
  | { ok: false; motivo: string; tools: string[]; pasos: number; ms: number; modelo: string };

/** A partir de este uso del limite, la tarjeta es lo primero que hay que resolver (`panorama_inicial`). */
const USO_ALTO = 0.5;
/** Un fondo de emergencia razonable: tres meses de gasto (misma regla que el prompt del agente). */
const MESES_DE_FONDO = 3;

/**
 * Lo que toda portada necesita, pedido de una vez y **segun la situacion** (es el prefetch
 * determinista, O3, aplicado a la portada). Tres olas:
 *
 *  1. `panorama_inicial`: dice si hay tarjeta, si ya tiene plan y cuanto puede ahorrar.
 *  2. En paralelo: gasto, ahorro, creditos (con amortizacion si NO hay tarjeta, porque
 *     entonces el credito es su deuda principal y `ProyeccionPagoCredito` la necesita),
 *     la tarjeta si la hay, y la simulacion de plazos si esta al limite y sin plan.
 *  3. La proyeccion de ahorro si no tiene meta activa pero si capacidad: se propone como
 *     objetivo tres meses de su gasto, la misma regla que el agente usa en conversacion.
 *
 * Con esto el modelo chico casi nunca necesita su paso de consulta: medido el 2026-09-12,
 * sin la ola 2 elegia las tarjetas que podia llenar con lo que tenia (el portafolio de
 * Ana) en vez de las que resolvian su situacion (su credito al 27.9 %).
 *
 * Una tool que falle entra como `{ error }` y el modelo lo lee: la portada sale con lo
 * que si hay.
 */
export async function reunirDatos(cliente: Client, usuarioId: string, usadas: LlamadaRegistrada[]): Promise<DatosDeLaPortada> {
  const pedir = async (nombre: string, argumentos: Record<string, unknown>) => {
    const r = await llamarTool(cliente, nombre, { usuarioId, ...argumentos });
    usadas.push({ nombre, ms: r.ms, ok: r.ok, mutacion: false });
    return [nombre, r.resultado] as const;
  };

  const panorama = await pedir("panorama_inicial", {});
  const p = esObjeto(panorama[1]) ? panorama[1] : {};
  const tarjeta = esObjeto(p.tarjeta) ? p.tarjeta : undefined;
  const alLimite = tarjeta !== undefined && Number(tarjeta.usoDelLimite ?? 0) >= USO_ALTO && tarjeta.tienePlanActivo !== true;
  const capacidad = Number(p.capacidadPagoMensualCentavos ?? 0);

  const segundaOla = await Promise.all([
    pedir("analizar_gasto", {}),
    pedir("analizar_ahorro", {}),
    pedir("consultar_creditos", tarjeta ? {} : { incluirAmortizacion: true, proximosPagos: 12 }),
    ...(tarjeta ? [pedir("consultar_tarjeta", {})] : []),
    ...(alLimite ? [pedir("simular_reestructura", {})] : []),
  ]);
  const datos: DatosDeLaPortada = Object.fromEntries([panorama, ...segundaOla]);

  const ahorro = esObjeto(datos.analizar_ahorro) ? datos.analizar_ahorro : undefined;
  const gasto = esObjeto(datos.analizar_gasto) && esObjeto(datos.analizar_gasto.gasto) ? datos.analizar_gasto.gasto : undefined;
  const gastoMensual = Number(gasto?.gastoCentavos ?? 0);
  if (ahorro && ahorro.ahorro === null && capacidad > 0 && gastoMensual > 0) {
    const [nombre, resultado] = await pedir("proyectar_ahorro", { montoObjetivoCentavos: gastoMensual * MESES_DE_FONDO });
    datos[nombre] = resultado;
  }

  return datos;
}

/**
 * Las tools que el modelo puede pedir en su unico paso de consulta. Solo lectura, y
 * solo las que llenan una tarjeta que el paquete base no llena: la simulacion de plazos,
 * la proyeccion de una meta, el historico de un portafolio, la amortizacion de un credito.
 * Las de accion no estan y no van a estar (ver arriba).
 */
export const TOOLS_DE_APOYO = [
  "simular_reestructura",
  "proyectar_ahorro",
  "consultar_creditos",
  "consultar_historico_inversion",
  "consultar_inversiones",
  "consultar_plan",
  "detectar_fugas",
  "comparar_periodos",
  "consultar_movimientos",
] as const;

/** Dos entregas invalidas y se corta, como en el turno de conversacion. */
const MAX_INTENTOS_DE_PANTALLA = 2;

export async function generarPortada(usuarioId: string, opciones: OpcionesDeGeneracion = {}): Promise<PortadaGenerada> {
  const inicio = Date.now();
  const usadas: LlamadaRegistrada[] = [];
  const modeloNombre = opciones.nombreDelModelo ?? configInicio.modelo;
  const timeoutMs = opciones.timeoutMs ?? configInicio.timeoutMs;
  let cliente: Client | undefined;
  let pasos = 0;

  const fallo = (motivo: string): PortadaGenerada => ({
    ok: false,
    motivo,
    tools: usadas.map((l) => `${l.nombre}${l.ok ? "" : "!"}`),
    pasos,
    ms: Date.now() - inicio,
    modelo: modeloNombre,
  });

  try {
    let herramientas = opciones.herramientas;
    let datos = opciones.datos;
    if (!herramientas || !datos) {
      cliente = await conectarMcp();
      herramientas ??= await herramientasDelMcp(cliente, { usuarioId, alTerminar: (l) => usadas.push(l) });
      datos ??= await reunirDatos(cliente, usuarioId, usadas);
    }

    const pintor = crearPintor();
    // Al modelo solo le llegan las tools de apoyo y la de pintar. Las de accion no se
    // filtran con `activeTools`: **no estan en el conjunto**, asi que ni un modelo que
    // se las invente puede ejecutarlas desde aqui.
    const tools: ToolSet = { pintar_pantalla: pintor.herramienta };
    for (const nombre of TOOLS_DE_APOYO) {
      const tool = herramientas[nombre];
      if (tool) tools[nombre] = tool;
    }
    let errores: string[] = [];
    let corte: "timeout" | undefined;

    const resultado = streamText({
      model: opciones.modelo ?? modeloDelInicio(),
      // El system prompt va primero y sin datos de la persona, igual que en el turno:
      // es el prefijo que el proveedor cachea, y los tres usuarios lo comparten.
      messages: [
        {
          role: "system",
          content: systemPrompt(),
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        {
          role: "user",
          content: opciones.pregunta
            ? encargoDeConsulta(usuarioId, datos, opciones.pregunta)
            : encargoDePortada(usuarioId, datos),
        },
      ],
      allowSystemInMessages: true,
      tools,
      stopWhen: [
        stepCountIs(configInicio.maxPasos),
        () => pintor.pintada(),
        () => pintor.intentosFallidos() >= MAX_INTENTOS_DE_PANTALLA,
      ],
      // Paso 0: pedir lo que falte (o pintar de una vez). Del 1 en adelante: solo pintar,
      // y el modelo solo ve esa tool.
      prepareStep: ({ stepNumber }) =>
        stepNumber === 0
          ? undefined
          : { toolChoice: { type: "tool", toolName: "pintar_pantalla" }, activeTools: ["pintar_pantalla"] },
      providerOptions: opciones.modelo ? {} : opcionesDelInicio(),
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    for await (const parte of resultado.fullStream) {
      switch (parte.type) {
        case "tool-result":
          if (parte.toolName === "pintar_pantalla") {
            const salida = parte.output as ResultadoPintar;
            if (!salida.ok) errores = salida.errores;
          }
          break;
        case "finish-step":
          pasos++;
          break;
        case "error":
          return fallo(`el modelo fallo: ${parte.error instanceof Error ? parte.error.message : String(parte.error)}`);
        case "abort":
          corte = "timeout";
          break;
        default:
          break;
      }
    }

    const ultima = pintor.ultima();
    if (corte === "timeout" && !pintor.pintada()) return fallo(`la generacion paso de ${timeoutMs / 1000} s y se corto`);
    if (!pintor.pintada() || !ultima) {
      return fallo(
        errores.length
          ? `la pantalla vino invalida: ${errores.join("; ")}`
          : `el modelo no entrego una pantalla en ${pasos} paso(s)`,
      );
    }

    const consumo = await resultado.usage.catch(() => undefined);
    return {
      ok: true,
      mensajes: pintor.tomarMensajes(),
      texto: ultima.texto,
      razon: ultima.razon,
      sugerencias: ultima.sugerencias,
      tools: usadas.map((l) => `${l.nombre}${l.ok ? "" : "!"}`),
      entradaTokens: consumo?.inputTokens ?? null,
      salidaTokens: consumo?.outputTokens ?? null,
      cacheTokens: consumo?.cachedInputTokens ?? null,
      pasos,
      ms: Date.now() - inicio,
      modelo: modeloNombre,
    };
  } catch (error) {
    const abortado = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return fallo(
      abortado ? `la generacion paso de ${timeoutMs / 1000} s y se corto` : error instanceof Error ? error.message : String(error),
    );
  } finally {
    await cliente?.close().catch(() => undefined);
  }
}

/**
 * El bloque de contexto de la portada. Va DESPUES del system prompt, como el bloque del
 * turno en `historial.ts`: es lo unico que cambia entre personas, y por eso va al final.
 *
 * Las reglas son las de una portada, no las de una respuesta: sin pregunta, sin accion
 * previa, 3 o 4 tarjetas en orden de urgencia y una sola heroe. Los datos ya
 * calculados se muestran tal cual salieron del MCP: el modelo enlaza, no inventa.
 */
export function encargoDePortada(usuarioId: string, datos: DatosDeLaPortada): string {
  const lineasDeDatos = Object.entries(datos).map(([tool, valor]) => `${tool}: ${JSON.stringify(valor)}`);
  return [
    "--- contexto del turno ---",
    `usuarioId: ${usuarioId}`,
    "pantalla actual: (ninguna; es la portada)",
    "",
    "MODO PORTADA. No hay pregunta ni accion: estas armando la pantalla de INICIO de esta persona, lo",
    "primero que ve al abrir la app. La portada responde \"¿como estoy hoy y que me conviene hacer?\".",
    "",
    "Reglas de la portada:",
    "1. SIEMPRE de 3 a 4 tarjetas del catalogo, nunca menos de 3, en orden de urgencia. Para elegir la",
    "   primera (la heroe) recorre esta escalera y quedate con lo PRIMERO que aplique:",
    "   a) tarjeta de credito al limite (`usoDelLimite` >= 0.5) o con mora -> `ResumenTarjeta` heroe y",
    "      `PlanDePago` (pide `simular_reestructura`); si `tienePlanActivo` ya es true, `ResumenTarjeta`",
    "      con el plan y SIN `PlanDePago`;",
    "   b) sin tarjeta (`tarjeta: null`) pero con creditos a plazo -> `ProyeccionPagoCredito` heroe con su",
    "      credito mas caro (pide `consultar_creditos` con `incluirAmortizacion: true`, `proximosPagos: 12`),",
    "      y `SimuladorMeta` con lo que le sobra al mes (pide `proyectar_ahorro`);",
    "   c) portafolio desviado de su modelo -> `DistribucionPortafolio` heroe y `OrdenRebalanceo`;",
    "   d) topes excedidos o fugas -> `AlertaFugas` o `GastoPorCategoria`;",
    "   e) meta activa -> `MetaActiva`; sin meta y con `capacidadPagoMensualCentavos` > 0 -> `SimuladorMeta`.",
    "   Despues de la heroe completa hasta 3 o 4 con lo que siga aplicando de la escalera y con contexto:",
    "   `GastoPorCategoria` (siempre hay gasto en `analizar_gasto`) y `TermometroSaludFinanciera` (siempre",
    "   hay puntaje en `panorama_inicial.salud`). Dos personas con datos distintos reciben portadas distintas.",
    "2. Exactamente UNA tarjeta con `heroe: true`: la primera, y solo en un componente que declare esa prop.",
    "3. Nada de `Confirmacion` (no hubo accion) ni de `Text` (no hay pregunta que contestar).",
    "4. Todo numero sale de los datos ya calculados de abajo o de una tool. Si a una tarjeta le falta",
    "   su dato —la simulacion de plazos para `PlanDePago`, la proyeccion para `SimuladorMeta` (propon",
    "   el objetivo si no hay meta), el historico para `RendimientoHistorico`, la amortizacion para",
    "   `ProyeccionPagoCredito`—, pide esas tools AHORA, todas en este mismo paso: en el siguiente",
    "   solo vas a poder pintar. `proyectar_ahorro` falla si `capacidadPagoMensualCentavos` es 0: no la",
    "   pidas en ese caso.",
    "5. Los botones se quedan y FUNCIONAN: toda tarjeta con boton lleva su `action` declarado, igual",
    "   que en los ejemplos (`PlanDePago` -> `aplicar_plan_pago` con `context: { tarjetaId }`;",
    "   `SimuladorMeta` -> `crear_apartado`; `AlertaFugas` -> `cancelar_suscripcion`; `OrdenRebalanceo` ->",
    "   `confirmar_rebalanceo`). Sin `action`, el boton sale apagado. Al tocarlo, la persona pasa a Maya",
    "   con esa accion ya disparada.",
    "6. `texto`: de una a tres frases, como si la saludaras al abrir la app: que ves hoy y que le",
    "   recomiendas, con el numero que lo sostiene. Empieza por lo de la tarjeta heroe: es lo",
    "   importante, no lo ultimo. `sugerencias`: 3 preguntas que le convendria hacerle a Maya con",
    "   estos datos.",
    "",
    "datos ya calculados (lo que devolvio cada tool del MCP):",
    ...lineasDeDatos,
    "",
    "Termina llamando `pintar_pantalla` exactamente una vez.",
  ].join("\n");
}

/**
 * El encargo cuando la persona PREGUNTO algo desde Inicio.
 *
 * La diferencia con `encargoDePortada` no es de tono, es de forma: la respuesta sigue
 * siendo un **dashboard**, no un mensaje. La persona no abrio un chat: escribio en su
 * pantalla de inicio y espera que su pantalla cambie.
 *
 * Por eso se le insiste en dos cosas que el modelo tiende a romper cuando ve una pregunta:
 * que la conteste con TARJETAS (no con `Text`) y que la primera sea `Conclusion`, que es
 * donde vive la frase que antes hubiera escrito como parrafo. Sin la primera regla el
 * modelo cae en prosa; sin la segunda, la respuesta queda sin veredicto y son tarjetas
 * sueltas.
 */
export function encargoDeConsulta(usuarioId: string, datos: DatosDeLaPortada, pregunta: string): string {
  const lineasDeDatos = Object.entries(datos).map(([tool, valor]) => `${tool}: ${JSON.stringify(valor)}`);
  return [
    "--- contexto del turno ---",
    `usuarioId: ${usuarioId}`,
    "pantalla actual: (se va a reemplazar por completo con la que armes ahora)",
    "",
    "MODO CONSULTA. La persona escribio esto en su pantalla de Inicio:",
    "",
    `  «${pregunta}»`,
    "",
    "Reglas de la consulta:",
    "1. La respuesta es una PANTALLA, no un mensaje. La persona no abrio un chat: escribio en su",
    "   dashboard y espera que su dashboard cambie. De 2 a 4 tarjetas del catalogo.",
    "2. La PRIMERA tarjeta es `Conclusion`, siempre: ahi va tu lectura en una frase (`titular`), el",
    "   porque y la recomendacion (`detalle`), hasta 3 cifras de apoyo (`datos`, las MISMAS que estan",
    "   en las otras tarjetas y con centavos si son dinero) y 3 preguntas de seguimiento",
    "   (`sugerencias`). Es la que contesta; las demas la sostienen.",
    "3. Despues de `Conclusion`, las tarjetas que respondan la pregunta con datos: el gasto si pregunto",
    "   por su gasto, el credito si pregunto por su deuda, el portafolio si pregunto por sus",
    "   inversiones. Si la pregunta no aplica a su situacion, NO contestes con texto: arma la pantalla",
    "   de lo que si le sirve y explicalo en la `razon`.",
    "4. Nada de `Text` ni de `Confirmacion`: no hubo accion y no estas escribiendo un parrafo.",
    "5. Una sola tarjeta con `heroe: true`, o ninguna. `Conclusion` no lleva `heroe`.",
    "6. Todo numero sale de los datos de abajo o de una tool. Si te falta algo para una tarjeta, pide",
    "   esas tools AHORA, todas en este mismo paso: en el siguiente solo vas a poder pintar.",
    "7. `texto`: una frase corta, porque el veredicto ya va en `Conclusion` y no se repite.",
    "",
    "datos ya calculados (lo que devolvio cada tool del MCP):",
    ...lineasDeDatos,
    "",
    "Termina llamando `pintar_pantalla` exactamente una vez.",
  ].join("\n");
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
