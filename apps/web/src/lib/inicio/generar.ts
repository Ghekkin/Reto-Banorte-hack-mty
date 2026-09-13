import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { stepCountIs, streamText, type LanguageModel, type ToolSet } from "ai";
import type { MensajeA2UI } from "@maya/a2ui";
import { crearCierre } from "@/lib/agente/cierre";
import { conectarMcp, herramientasDelMcp, llamarTool, type LlamadaRegistrada } from "@/lib/agente/mcp-cliente";
import { MAX_INTENTOS_DE_PANTALLA, type ResultadoPintar } from "@/lib/agente/pantalla";
import { systemPrompt } from "@/lib/agente/prompt";
import type { Procedencias, ReferenciaDeDato } from "@/lib/widgets/armar";
import { consultaHecha, crearConsultor, type Consulta, type Llamar } from "@/lib/widgets/consultor";
import { crearCierreDePortada } from "@/lib/widgets/pintar";
import { promptDeWidgets } from "@/lib/widgets/prompt";
import { configInicio } from "./config";
import { modeloDelInicio, opcionesDeWidgets, opcionesDelInicio } from "./modelo";

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
  /**
   * Arma la portada por fuentes (`pintar_widgets`) en vez de con `pintar_pantalla`. Por
   * omision lo decide `FEATURE_WIDGETS_VIVOS`; las pruebas lo fijan.
   */
  widgets?: boolean;
  /** Para pruebas del modo widgets: como se llama al MCP, sin abrir conexion. */
  llamar?: Llamar;
  /** Para pruebas del modo widgets: el prefetch ya hecho, con sus argumentos. */
  sembradas?: Consulta[];
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
      /** Solo en modo widgets: de donde salio cada tarjeta. */
      procedencias?: Procedencias;
      /** Solo en modo widgets: a que tarjeta y campo apunta cada cifra de la conclusion. */
      referencias?: ReferenciaDeDato[];
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
export async function reunirDatos(
  cliente: Client,
  usuarioId: string,
  usadas: LlamadaRegistrada[],
  /** Si viene, cada llamada se guarda con sus argumentos: el modo widgets la reusa como cache. */
  sembradas?: Consulta[],
): Promise<DatosDeLaPortada> {
  const pedir = async (nombre: string, argumentos: Record<string, unknown>) => {
    const completos = { usuarioId, ...argumentos };
    const r = await llamarTool(cliente, nombre, completos);
    usadas.push({ nombre, ms: r.ms, ok: r.ok, mutacion: false });
    sembradas?.push(consultaHecha(nombre, completos, r.resultado, r.ok, r.ms));
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

export async function generarPortada(usuarioId: string, opciones: OpcionesDeGeneracion = {}): Promise<PortadaGenerada> {
  if (opciones.widgets ?? configInicio.widgetsVivos) return generarPortadaDeWidgets(usuarioId, opciones);
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

    // Sin pantalla previa, `crearCierre` solo publica `pintar_pantalla`: en una portada no
    // hay nada que ajustar ni que aclarar, y `responder` con texto seria justo lo contrario
    // de lo que la portada es.
    const cierre = crearCierre();
    // Al modelo solo le llegan las tools de apoyo y la de pintar. Las de accion no se
    // filtran con `activeTools`: **no estan en el conjunto**, asi que ni un modelo que
    // se las invente puede ejecutarlas desde aqui.
    const tools: ToolSet = { ...cierre.herramientas };
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
        () => cierre.cerrado(),
        () => cierre.intentosFallidos() >= MAX_INTENTOS_DE_PANTALLA,
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

    const ultima = cierre.ultima();
    if (corte === "timeout" && !cierre.cerrado()) return fallo(`la generacion paso de ${timeoutMs / 1000} s y se corto`);
    if (!cierre.cerrado() || !ultima) {
      return fallo(
        errores.length
          ? `la pantalla vino invalida: ${errores.join("; ")}`
          : `el modelo no entrego una pantalla en ${pasos} paso(s)`,
      );
    }

    const consumo = await resultado.usage.catch(() => undefined);
    return {
      ok: true,
      mensajes: cierre.tomarMensajes(),
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
 * previa, `Conclusion` mas dos tarjetas en orden de urgencia y una sola heroe. Los datos
 * ya calculados se muestran tal cual salieron del MCP: el modelo enlaza, no inventa.
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
    "1. EXACTAMENTE 3 tarjetas, y la primera es `Conclusion`: ahi va tu lectura de como esta hoy en una",
    "   frase (`titular`), el porque y la recomendacion (`detalle`), hasta 3 cifras de apoyo (`datos`,",
    "   las MISMAS que estan en las otras dos tarjetas) y 3 preguntas de seguimiento (`sugerencias`).",
    "   Y el `saludo`: «Hola, <su primer nombre>» (el nombre viene en `panorama_inicial.usuario.nombre`);",
    "   es lo primero que lee al abrir la app. Tres es un tope de verdad: una cuarta tarjeta hace que la",
    "   pantalla se rechace.",
    "2. Las OTRAS DOS son la tarjeta 2 y la 3, y salen de esta escalera. Recorrela DE ARRIBA A",
    "   ABAJO y quedate con el PRIMER caso que aplique a los datos de abajo. No la saltes porque",
    "   otro caso te parezca mas interesante: el orden ES la urgencia, y el caso que aplica es el",
    "   problema que esta persona tiene que resolver hoy.",
    "   a) tarjeta de credito al limite (`usoDelLimite` >= 0.5) o con mora -> `ResumenTarjeta` heroe y",
    "      `PlanDePago` (pide `simular_reestructura`); si `tienePlanActivo` ya es true, `ResumenTarjeta`",
    "      con el plan y en vez de `PlanDePago` la siguiente que aplique;",
    "   b) sin tarjeta (`tarjeta: null`) pero con creditos a plazo con saldo -> `ProyeccionPagoCredito`",
    "      heroe con su credito mas caro (pide `consultar_creditos` con `incluirAmortizacion: true`,",
    "      `proximosPagos: 12`), y `SimuladorMeta` con lo que le sobra al mes (pide `proyectar_ahorro`).",
    "      **Sin tarjeta NO es sin deuda, y \"al corriente\" NO es \"resuelto\":** mientras tenga saldo",
    "      insoluto esta pagando intereses cada mes, y eso le cuesta mas que cualquier desviacion de su",
    "      portafolio. Aqui no se salta al caso (c) aunque su portafolio se vea mas interesante;",
    "   c) SIN deuda (ni tarjeta al limite ni credito con saldo) y con portafolio desviado de su modelo",
    "      -> `DistribucionPortafolio` heroe y `OrdenRebalanceo`;",
    "   d) topes excedidos o fugas -> `AlertaFugas` o `GastoPorCategoria`;",
    "   e) meta activa -> `MetaActiva`; sin meta y con `capacidadPagoMensualCentavos` > 0 -> `SimuladorMeta`.",
    "   Si el caso que aplico solo te da una tarjeta, la tercera es contexto: `GastoPorCategoria` (siempre",
    "   hay gasto en `analizar_gasto`) o `TermometroSaludFinanciera` (siempre hay puntaje en",
    "   `panorama_inicial.salud`). Dos personas con datos distintos reciben portadas distintas.",
    "3. La tarjeta 2 —la primera de la escalera— lleva `heroe: true`, y es la UNICA que lo lleva.",
    "   Una portada sin heroe no tiene jerarquia: se pinta plana y no se sabe que mirar primero. Si esa",
    "   tarjeta no declara `heroe` en su lista de props, ponselo a la 3; si ninguna de las dos lo declara,",
    "   cambia la 3 por una que si (`GastoPorCategoria` y `TermometroSaludFinanciera` lo declaran).",
    "   `Conclusion` NO lleva `heroe`: es la primera, pero no es la heroe.",
    "4. Nada de `Confirmacion` (no hubo accion) ni de `Text` (para eso esta `Conclusion`).",
    "5. Todo numero sale de los datos ya calculados de abajo o de una tool. Si a una tarjeta le falta",
    "   su dato —la simulacion de plazos para `PlanDePago`, la proyeccion para `SimuladorMeta` (propon",
    "   el objetivo si no hay meta), el historico para `RendimientoHistorico`, la amortizacion para",
    "   `ProyeccionPagoCredito`—, pide esas tools AHORA, todas en este mismo paso: en el siguiente",
    "   solo vas a poder pintar. `proyectar_ahorro` falla si `capacidadPagoMensualCentavos` es 0: no la",
    "   pidas en ese caso.",
    "6. Los botones se quedan y FUNCIONAN: toda tarjeta con boton lleva su `action` declarado, igual",
    "   que en los ejemplos (`PlanDePago` -> `aplicar_plan_pago` con `context: { tarjetaId }`;",
    "   `SimuladorMeta` -> `crear_apartado`; `AlertaFugas` -> `cancelar_suscripcion`; `OrdenRebalanceo` ->",
    "   `confirmar_rebalanceo`). Sin `action`, el boton sale apagado. Al tocarlo, la persona pasa a Maya",
    "   con esa accion ya disparada.",
    "7. `texto`: una frase corta, porque el veredicto ya va en `Conclusion` y no se repite.",
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
    "   dashboard y espera que su dashboard cambie. EXACTAMENTE 3 tarjetas del catalogo, y tres es un",
    "   tope de verdad: una cuarta hace que la pantalla se rechace.",
    "2. La PRIMERA tarjeta es `Conclusion`, siempre: ahi va tu lectura en una frase (`titular`), el",
    "   porque y la recomendacion (`detalle`), hasta 3 cifras de apoyo (`datos`, las MISMAS que estan",
    "   en las otras tarjetas y con centavos si son dinero) y 3 preguntas de seguimiento",
    "   (`sugerencias`). Es la que contesta; las demas la sostienen.",
    "3. Las OTRAS DOS son las que respondan la pregunta con datos: el gasto si pregunto",
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

// --- Modo widgets (FEATURE_WIDGETS_VIVOS) ----------------------------------------------

/**
 * La portada armada por fuentes: el modelo elige tarjetas, fuentes y parametros con
 * `pintar_widgets`, y las cifras las pone el servidor con lo que devuelve el MCP
 * (`lib/widgets/`, ADR 0011).
 *
 * Mismo prefetch que el modo de siempre, y sus resultados se siembran en el consultor: si
 * la tarjeta de gasto pide `analizar_gasto {}`, ya esta en la mano y no cuesta otra
 * llamada. No hay paso de consulta para el modelo: los datos que necesita para ELEGIR ya
 * vienen en el encargo, y los de las tarjetas los trae el servidor. Por eso el bucle
 * fuerza `pintar_widgets` desde el primer paso, con un paso extra para corregir.
 */
async function generarPortadaDeWidgets(usuarioId: string, opciones: OpcionesDeGeneracion): Promise<PortadaGenerada> {
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
    const sembradas: Consulta[] = opciones.sembradas ? [...opciones.sembradas] : [];
    let llamar = opciones.llamar;
    let datos = opciones.datos;
    if (!llamar || !datos) {
      cliente = await conectarMcp();
      const abierto = cliente;
      llamar ??= (tool, argumentos) => llamarTool(abierto, tool, argumentos);
      datos ??= await reunirDatos(abierto, usuarioId, usadas, sembradas);
    }

    const consultor = crearConsultor({ usuarioId, llamar, sembradas, alTerminar: (l) => usadas.push(l) });
    const cierre = crearCierreDePortada(consultor);
    let errores: string[] = [];
    let corte: "timeout" | undefined;

    const resultado = streamText({
      model: opciones.modelo ?? modeloDelInicio(),
      messages: [
        {
          role: "system",
          content: promptDeWidgets(),
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        { role: "user", content: encargoDeWidgets(usuarioId, datos, sembradas) },
      ],
      allowSystemInMessages: true,
      tools: cierre.herramientas,
      toolChoice: { type: "tool", toolName: "pintar_widgets" },
      stopWhen: [stepCountIs(configInicio.maxPasos), () => cierre.cerrado(), () => cierre.intentosFallidos() >= MAX_INTENTOS_DE_PANTALLA],
      // Elegir fuentes no necesita razonar; las cifras no las calcula el modelo.
      providerOptions: opciones.modelo ? {} : opcionesDeWidgets(modeloNombre),
      abortSignal: AbortSignal.timeout(timeoutMs),
    });

    for await (const parte of resultado.fullStream) {
      switch (parte.type) {
        case "tool-result": {
          const salida = parte.output as { ok: boolean; errores?: string[] };
          if (!salida.ok) errores = salida.errores ?? [];
          break;
        }
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

    const pantalla = cierre.resultado();
    if (corte === "timeout" && !pantalla) return fallo(`la generacion paso de ${timeoutMs / 1000} s y se corto`);
    if (!pantalla) {
      return fallo(errores.length ? `la portada vino invalida: ${errores.join("; ")}` : `el modelo no entrego la portada en ${pasos} paso(s)`);
    }

    const consumo = await resultado.usage.catch(() => undefined);
    return {
      ok: true,
      mensajes: pantalla.mensajes,
      texto: pantalla.texto,
      razon: pantalla.razon,
      sugerencias: pantalla.sugerencias,
      procedencias: pantalla.procedencias,
      referencias: pantalla.referencias,
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
    return fallo(abortado ? `la generacion paso de ${timeoutMs / 1000} s y se corto` : error instanceof Error ? error.message : String(error));
  } finally {
    await cliente?.close().catch(() => undefined);
  }
}

/**
 * El encargo de la portada por fuentes. La escalera es la misma que la de
 * `encargoDePortada` —el orden ES la urgencia—, pero cada escalon nombra FUENTES y no
 * componentes con props.
 */
export function encargoDeWidgets(usuarioId: string, datos: DatosDeLaPortada, sembradas: readonly Consulta[] = []): string {
  const lineasDeDatos = Object.entries(datos).map(([tool, valor]) => `${tool}: ${JSON.stringify(valor)}`);
  const simulacion = sembradas.find((c) => c.tool === "proyectar_ahorro" && c.ok);
  const objetivo = simulacion?.argumentos.montoObjetivoCentavos;
  return [
    "--- contexto del turno ---",
    `usuarioId: ${usuarioId}`,
    "",
    "MODO PORTADA. Arma el INICIO de esta persona: lo primero que ve al abrir la app. Responde «¿cómo estoy",
    "hoy y qué me conviene hacer?». Llama `pintar_widgets` exactamente una vez.",
    "",
    "1. `conclusion`: tu lectura en una frase (`titular`), el porqué y la recomendación (`detalle`), el",
    "   `saludo` «Hola, <primer nombre>» (el nombre está en `panorama_inicial.perfil.nombre`), 3 preguntas de",
    "   seguimiento (`sugerencias`) y hasta 3 cifras de apoyo en `datos`, cada una por REFERENCIA:",
    '   {"etiqueta":"Uso de tu línea","widget":"tarjeta","campo":"saldoCentavos","tono":"alerta"}.',
    "2. `widgets`: EXACTAMENTE 2 tarjetas. Recorre esta escalera DE ARRIBA A ABAJO y quédate con el PRIMER caso",
    "   que aplique; no la saltes porque otro caso te parezca más interesante:",
    "   a) tarjeta de crédito al límite (`usoDelLimite` >= 0.5) o con mora -> `tarjeta` (heroe) y `plan_de_pago`;",
    "      si ya `tienePlanActivo`, `tarjeta` y la siguiente que aplique;",
    "   b) sin tarjeta pero con créditos con saldo -> `credito` (heroe) y `simulador_meta`. Sin tarjeta NO es sin",
    "      deuda: mientras tenga saldo insoluto paga intereses cada mes;",
    "   c) SIN deuda y con portafolio desviado de su modelo -> `portafolio` (heroe) y `rebalanceo`;",
    "   d) topes excedidos o fugas -> `fugas` o `gasto_del_mes`;",
    "   e) meta activa -> `meta_activa`; sin meta y con capacidad de ahorro -> `simulador_meta`.",
    "   Si el caso solo da una tarjeta, la otra es contexto: `gasto_del_mes` o `salud`.",
    "3. Una sola tarjeta con `heroe: true`: la primera de la escalera.",
    objetivo !== undefined
      ? `4. \`proyectar_ahorro\` ya se consultó con montoObjetivoCentavos=${String(objetivo)} (tres meses de su gasto): si usas \`simulador_meta\`, pasa {"montoObjetivoCentavos":${String(objetivo)},"nombre":"Fondo de emergencia"}.`
      : "4. Si usas `simulador_meta` y no tiene meta, propón como objetivo tres meses de su gasto (`analizar_gasto.gasto.gastoCentavos` x 3).",
    "5. `texto`: una frase corta, sin repetir el titular.",
    "",
    "datos para decidir (lo que devolvió cada tool del MCP):",
    ...lineasDeDatos,
  ].join("\n");
}
