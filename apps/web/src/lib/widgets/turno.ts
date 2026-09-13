import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { stepCountIs, streamText, tool, type LanguageModel, type LanguageModelUsage, type ModelMessage, type Tool, type ToolSet } from "ai";
import { z } from "zod";
import { VERSION_A2UI, validarMensaje, type Componente, type MensajeA2UI } from "@maya/a2ui";
import { SUPERFICIE } from "@/lib/agente/config";
import { escritorEnPostgres } from "@/lib/corridas/escritor";
import { crearGrabadora, type Escritor, type Grabadora, type ResumenDeCorrida } from "@/lib/corridas/grabadora";
import { conectarMcp, herramientasDelMcp, llamarTool, type LlamadaRegistrada } from "@/lib/agente/mcp-cliente";
import { configInicio } from "@/lib/inicio/config";
import { modeloPorId, opcionesDeWidgets } from "@/lib/inicio/modelo";
import { completarAccion, nombresPermitidos } from "@/lib/agente/pantalla";
import {
  armarWidget,
  ObjetoFlexible,
  parsearObjeto,
  recalcularConclusion,
  type Procedencias,
  type ReferenciaDeDato,
} from "./armar";
import { listarCifras, quitarOracionesSinRespaldo, verificarCifras } from "./cifras";
import { canonico, crearConsultor, type Consultor, type Llamar } from "./consultor";
import { fuente, fuentesDe, IDS_DE_FUENTES } from "./fuentes";
import { componentesDe, idsEnOrden } from "./pantalla-viva";
import { promptDeWidgets } from "./prompt";

/**
 * El turno de una pregunta hecha en Inicio: **cambia una tarjeta, no el dashboard**.
 *
 * Es la respuesta a la revision con Banorte: preguntar en Inicio borraba las tres tarjetas
 * y armaba otras, "como pasar de una diapositiva a otra". Aqui la persona pregunta —sobre
 * una tarjeta que toco o en general— y el modelo cierra con UNA de tres salidas:
 *
 *  - `modificar_widget`: la misma tarjeta con otros parametros o variantes ("¿y en julio?",
 *    "a 24 meses", "ordenalo por variacion"). El servidor re-consulta SU fuente.
 *  - `reemplazar_widget`: en el hueco de una tarjeta entra otra (pregunta por su credito y
 *    ahi estaba el gasto). Las otras dos no se tocan.
 *  - `responder`: una aclaracion que se muestra junto a la tarjeta; la pantalla no cambia.
 *
 * En las tres, los numeros los pone el MCP: las tarjetas por adaptador (`fuentes.ts`) y el
 * texto pasa por el verificador (`cifras.ts`). No existe una salida que rehaga todo.
 */

export type PantallaGuardada = {
  mensajes: MensajeA2UI[];
  procedencias: Procedencias;
  referencias: ReferenciaDeDato[];
};

export type PeticionDeWidget = {
  usuarioId: string;
  pregunta: string;
  /** El id de la tarjeta sobre la que la persona pregunto, si toco "Preguntar sobre esto". */
  foco?: string;
  /** Lo ultimo que se pregunto y contesto en Inicio, para seguir el hilo. */
  historial?: Array<{ pregunta: string; respuesta: string }>;
  pantalla: PantallaGuardada;
};

export type CierreDeWidget = "modificar" | "reemplazar" | "responder";

export type EventoDeTurno =
  // `verificando` no lo emite el turno: lo emite la ruta antes del auditor (`api/inicio/widget`).
  | { tipo: "estado"; valor: "pensando" | "consultando" | "armando" | "verificando" }
  | { tipo: "tool"; nombre: string; ms: number; ok: boolean };

export type TurnoDeWidget =
  | {
      ok: true;
      cierre: CierreDeWidget;
      /** La tarjeta que cambio (o sobre la que se respondio). */
      widgetId?: string;
      /** Solo `updateComponents`: nunca `createSurface`. Vacio en `responder`. */
      mensajes: MensajeA2UI[];
      /** Las procedencias de la pantalla despues del turno. */
      procedencias: Procedencias;
      texto: string;
      razon: string;
      sugerencias: string[];
      tools: string[];
      pasos: number;
      ms: number;
      modelo: string;
      cifrasQuitadas: string[];
      /** Tokens de TODOS los pasos del turno (y de los dos intentos, si hubo). */
      uso?: LanguageModelUsage;
      /** La corrida grabada (tipo `widget`); sin escritor activo no viene. */
      corridaId?: string;
    }
  | { ok: false; motivo: string; tools: string[]; pasos: number; ms: number; modelo: string; uso?: LanguageModelUsage; corridaId?: string };

export type OpcionesDeTurno = {
  modelo?: LanguageModel;
  nombreDelModelo?: string;
  /** Para pruebas: como se llama al MCP, sin conexion. */
  llamar?: Llamar;
  /** Para pruebas: las tools de lectura de apoyo, ya armadas. */
  herramientas?: ToolSet;
  /**
   * Una conexion al MCP ya abierta (la ruta la abre para auditar despues con la misma). Si
   * viene, el turno la usa y NO la cierra.
   */
  cliente?: Client;
  alEvento?: (evento: EventoDeTurno) => void;
  timeoutMs?: number;
  /** "Hoy" para el contexto; por omision `MCP_HOY` o la fecha del sistema. */
  hoy?: string;
  /** Para pruebas: cuanto esperar al primer intento del modelo antes de repetirlo. */
  plazoPorIntentoMs?: number;
  /**
   * La grabadora de la corrida (`lib/corridas/grabadora.ts`). La ruta pasa la suya porque
   * graba tambien lo que pasa despues del turno (auditoria, `fin`) y la cierra ella. Sin
   * grabadora, el turno crea una con `escritor` y la cierra al terminar.
   */
  grabadora?: Grabadora;
  /** Donde se guarda la corrida si el turno crea su grabadora. Default: PostgreSQL. */
  escritor?: Escritor;
  /** De que visitante es la pregunta (ADR 0012), para la corrida y la conexion al MCP. */
  dispositivoId?: string;
};

/** Pasos: uno para consultar lo que haga falta, uno para cerrar, uno de gracia y uno de red. */
const MAX_PASOS = 4;
const MAX_INTENTOS = 2;
const TIMEOUT_MS = 25_000;
/** Cuanto se le espera al primer intento del modelo antes de repetirlo. */
const PLAZO_POR_INTENTO_MS = 11_000;
const INTENTOS_DEL_MODELO = 2;

function esCorte(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}


/** Las tools de lectura que el modelo puede usar para una aclaracion. Ninguna de accion. */
export const LECTURAS_DE_APOYO = new Set([
  "panorama_inicial",
  "analizar_gasto",
  "comparar_periodos",
  "consultar_movimientos",
  "detectar_fugas",
  "consultar_tarjeta",
  "consultar_creditos",
  "simular_reestructura",
  "consultar_plan",
  "proyectar_ahorro",
  "diagnostico_salud_financiera",
  "consultar_inversiones",
  "consultar_historico_inversion",
  "consultar_catalogo_inversiones",
  "simular_rebalanceo",
]);

// --- Las tres salidas ------------------------------------------------------------------

const comunes = {
  texto: z
    .string()
    .min(1)
    .describe("Una o dos frases, en segunda persona: que cambio y que significa. Se muestra junto a la tarjeta"),
  razon: z.string().min(10).describe("Una frase: por que esta respuesta, con el dato que la justifica"),
  sugerencias: z.array(z.string()).max(3).optional().describe("Hasta 3 preguntas de seguimiento sobre esta tarjeta"),
};

export const entradaModificarWidget = z.object({
  widgetId: z.string().describe("El id de la tarjeta que cambia; con foco, es la del foco"),
  fuente: z
    .enum(IDS_DE_FUENTES)
    .optional()
    .describe("Solo si cambias a otra fuente que llena el MISMO tipo de tarjeta (gasto_del_mes -> gasto_comparado)"),
  parametros: ObjetoFlexible.optional().describe(
    'Texto JSON con los parametros que CAMBIAN, p. ej. {"periodo":"2026-07"}. Los que no menciones se quedan; con null se quita uno',
  ),
  variantes: ObjetoFlexible.optional().describe('Texto JSON con las variantes que CAMBIAN, p. ej. {"orden":"variacion"}; con null se quita una'),
  ...comunes,
});

export const entradaReemplazarWidget = z.object({
  widgetId: z.string().describe("El hueco donde entra la tarjeta nueva; nunca la conclusion"),
  fuente: z.enum(IDS_DE_FUENTES).describe("La fuente de la tarjeta nueva"),
  parametros: ObjetoFlexible.optional().describe("Texto JSON con los parametros de la fuente nueva"),
  variantes: ObjetoFlexible.optional().describe("Texto JSON con las variantes de la fuente nueva"),
  ...comunes,
});

export const entradaResponderWidget = z.object({
  widgetId: z.string().optional().describe("La tarjeta a la que se refiere la aclaracion, si hay una"),
  ...comunes,
});

type Cerrado = Extract<TurnoDeWidget, { ok: true }>;
type Salida = { ok: true } | { ok: false; errores: string[] };

type Contexto = {
  usuarioId: string;
  pregunta: string;
  componentes: Map<string, Componente>;
  procedencias: Procedencias;
  referencias: ReferenciaDeDato[];
  consultor: Consultor;
  /** Lo que devolvieron las tools de apoyo: tambien cuenta como dato para el verificador. */
  datosDeApoyo: unknown[];
};

function sinNulos(objeto: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== null && v !== undefined));
}

/** Todo lo que el MCP devolvio en el turno mas lo que ya esta en pantalla (que salio del MCP). */
function datosVerificables(ctx: Contexto, extra: readonly Componente[] = []): unknown[] {
  return [
    ...ctx.consultor.consultas().map((c) => c.resultado),
    ...ctx.datosDeApoyo,
    ...[...ctx.componentes.values()].filter((c) => c.component !== "Conclusion" && c.id !== "root"),
    ...extra,
  ];
}

export function crearCierreDeWidgets(ctx: Contexto) {
  let cerrado: Omit<Cerrado, "tools" | "pasos" | "ms" | "modelo"> | undefined;
  let fallidos = 0;
  const ultimoIntento = () => fallidos >= MAX_INTENTOS - 1;

  /** Verifica el texto; en el ultimo intento quita lo que no tenga respaldo en vez de fallar. */
  function revisarTexto(texto: string, extra: readonly Componente[]): { ok: true; texto: string; quitadas: string[] } | { ok: false; errores: string[] } {
    const v = verificarCifras([texto], datosVerificables(ctx, extra), [ctx.pregunta]);
    if (v.ok) return { ok: true, texto, quitadas: [] };
    if (!ultimoIntento()) {
      return {
        ok: false,
        errores: [
          `estas cifras de tu texto no salen de ningun dato del MCP: ${listarCifras(v.noRespaldadas)}. ` +
            "Escribelas tal cual vienen en los datos (mismo monto, mismo redondeo) o quitalas.",
        ],
      };
    }
    return {
      ok: true,
      texto: quitarOracionesSinRespaldo(texto, v.noRespaldadas) ?? "Listo: la tarjeta ya muestra lo que pediste, con datos del banco.",
      quitadas: v.noRespaldadas.map((c) => c.crudo),
    };
  }

  /** La tarjeta nueva y, si sus cifras cambiaron, la conclusion rehecha; en un solo mensaje. */
  function mensajesDelCambio(nuevo: Componente): { mensajes: MensajeA2UI[]; errores: string[] } {
    const despues = new Map(ctx.componentes);
    despues.set(nuevo.id, nuevo);
    const componentes: Componente[] = [nuevo];
    const conclusion = ctx.componentes.get("conclusion");
    if (conclusion && ctx.referencias.some((r) => r.widget === nuevo.id)) {
      const rehecha = recalcularConclusion(conclusion, ctx.referencias, despues);
      if (canonico(rehecha) !== canonico(conclusion)) componentes.push(rehecha);
    }
    const mensaje: MensajeA2UI = { version: VERSION_A2UI, updateComponents: { surfaceId: SUPERFICIE, components: componentes } };
    const validado = validarMensaje(mensaje, { nombres: nombresPermitidos() });
    return { mensajes: [mensaje], errores: validado.ok ? [] : validado.errores };
  }

  function fallar(errores: string[]): Salida {
    fallidos++;
    return { ok: false, errores };
  }

  const herramientas: Record<string, Tool> = {
    modificar_widget: tool({
      description:
        "Cambia UNA tarjeta en su lugar con otros parametros o variantes de su fuente: otro mes, otro plazo, otro " +
        "orden, las N principales, otras semanas. El servidor re-consulta el MCP y la tarjeta se actualiza sin " +
        "tocar las demas. Es la salida para casi cualquier pregunta sobre una tarjeta.",
      inputSchema: entradaModificarWidget,
      execute: async (entrada): Promise<Salida> => {
        const viejo = ctx.componentes.get(entrada.widgetId);
        const procedencia = ctx.procedencias[entrada.widgetId];
        if (!viejo || !procedencia) {
          return fallar([`no hay una tarjeta con fuente "${entrada.widgetId}"; las que hay: ${Object.keys(ctx.procedencias).join(", ")}`]);
        }
        const idFuente = entrada.fuente ?? procedencia.fuente;
        const definicion = fuente(idFuente)!;
        if (definicion.componente !== procedencia.componente) {
          return fallar([
            `${idFuente} llena ${definicion.componente} y "${entrada.widgetId}" es ${procedencia.componente}: eso es cambiar de ` +
              `tarjeta, usa \`reemplazar_widget\`. Las fuentes de esta tarjeta: ${fuentesDe(procedencia.componente).map((f) => f.id).join(", ")}`,
          ]);
        }
        const errores: string[] = [];
        const nuevosParametros = parsearObjeto(entrada.parametros, "parametros", errores);
        const nuevasVariantes = parsearObjeto(entrada.variantes, "variantes", errores);
        if (errores.length) return fallar(errores);
        const mismaFuente = idFuente === procedencia.fuente;
        const parametros = sinNulos(mismaFuente ? { ...procedencia.parametros, ...nuevosParametros } : nuevosParametros);
        const variantes = sinNulos({ ...procedencia.variantes, ...nuevasVariantes });

        const armado = await armarWidget(
          { id: entrada.widgetId, fuente: idFuente, parametros, variantes, heroe: viejo.heroe === true, razon: entrada.razon },
          ctx.consultor,
          { idFijo: true },
        );
        if (!armado.ok) return fallar(armado.errores);

        const nuevo: Componente = { ...armado.componente, ...(viejo.action ? { action: viejo.action } : {}) };
        completarAccion(nuevo);
        // Se compara solo lo que produce el widget (datos del MCP, variantes, heroe): el armado
        // de la portada completa valores por omision del schema (`etiquetaBoton`) que el
        // componente recien armado no trae, y eso no es un cambio que la persona vea.
        const llaves = Object.keys(armado.componente).filter((k) => k !== "razon" && k !== "action");
        const loQueCambia = (c: Componente) => canonico(Object.fromEntries(llaves.map((k) => [k, c[k]])));
        if (loQueCambia(nuevo) === loQueCambia(viejo)) {
          return fallar([
            "con esos parametros la tarjeta queda exactamente igual. Si la persona pide otra cosa, cambia el parametro " +
              "que corresponde; si solo quiere entender lo que ve, usa `responder`.",
          ]);
        }

        const texto = revisarTexto(entrada.texto, [nuevo]);
        if (!texto.ok) return fallar(texto.errores);
        const { mensajes, errores: deMensaje } = mensajesDelCambio(nuevo);
        if (deMensaje.length) return fallar(deMensaje);

        cerrado = {
          ok: true,
          cierre: "modificar",
          widgetId: entrada.widgetId,
          mensajes,
          procedencias: { ...ctx.procedencias, [entrada.widgetId]: armado.procedencia },
          texto: texto.texto,
          razon: entrada.razon,
          sugerencias: entrada.sugerencias?.slice(0, 3) ?? [],
          cifrasQuitadas: texto.quitadas,
        };
        return { ok: true };
      },
    }),

    reemplazar_widget: tool({
      description:
        "Pone OTRA tarjeta en el hueco de una que ya esta, cuando la pregunta es de otro tema que ninguna tarjeta " +
        "muestra. Solo cambia ese hueco; la conclusion y la otra tarjeta se quedan.",
      inputSchema: entradaReemplazarWidget,
      execute: async (entrada): Promise<Salida> => {
        const viejo = ctx.componentes.get(entrada.widgetId);
        if (!viejo || !ctx.procedencias[entrada.widgetId]) {
          return fallar([`no hay una tarjeta "${entrada.widgetId}" que reemplazar; las que hay: ${Object.keys(ctx.procedencias).join(", ")}`]);
        }
        const errores: string[] = [];
        const parametros = sinNulos(parsearObjeto(entrada.parametros, "parametros", errores));
        const variantes = sinNulos(parsearObjeto(entrada.variantes, "variantes", errores));
        if (errores.length) return fallar(errores);

        const armado = await armarWidget(
          { id: entrada.widgetId, fuente: entrada.fuente, parametros, variantes, heroe: viejo.heroe === true, razon: entrada.razon },
          ctx.consultor,
          { idFijo: true },
        );
        if (!armado.ok) return fallar(armado.errores);
        const nuevo = { ...armado.componente };
        completarAccion(nuevo);

        const texto = revisarTexto(entrada.texto, [nuevo]);
        if (!texto.ok) return fallar(texto.errores);
        const { mensajes, errores: deMensaje } = mensajesDelCambio(nuevo);
        if (deMensaje.length) return fallar(deMensaje);

        cerrado = {
          ok: true,
          cierre: "reemplazar",
          widgetId: entrada.widgetId,
          mensajes,
          procedencias: { ...ctx.procedencias, [entrada.widgetId]: armado.procedencia },
          texto: texto.texto,
          razon: entrada.razon,
          sugerencias: entrada.sugerencias?.slice(0, 3) ?? [],
          cifrasQuitadas: texto.quitadas,
        };
        return { ok: true };
      },
    }),

    responder: tool({
      description:
        "Aclara lo que ya se ve SIN cambiar ninguna tarjeta: que significa una cifra, de donde sale, por que se " +
        "recomienda algo. La respuesta aparece junto a la tarjeta. Si hace falta un dato que no esta, consultalo " +
        "antes con las tools de lectura.",
      inputSchema: entradaResponderWidget,
      execute: async (entrada): Promise<Salida> => {
        if (entrada.widgetId !== undefined && !ctx.componentes.has(entrada.widgetId)) {
          return fallar([`no hay una tarjeta "${entrada.widgetId}"; omite widgetId o usa uno de: ${idsEnOrden(ctx.componentes).join(", ")}`]);
        }
        const texto = revisarTexto(entrada.texto, []);
        if (!texto.ok) return fallar(texto.errores);
        cerrado = {
          ok: true,
          cierre: "responder",
          widgetId: entrada.widgetId,
          mensajes: [],
          procedencias: ctx.procedencias,
          texto: texto.texto,
          razon: entrada.razon,
          sugerencias: entrada.sugerencias?.slice(0, 3) ?? [],
          cifrasQuitadas: texto.quitadas,
        };
        return { ok: true };
      },
    }),
  };

  return {
    herramientas,
    resultado: () => cerrado,
    cerrado: () => cerrado !== undefined,
    intentosFallidos: () => fallidos,
  };
}

// --- El turno --------------------------------------------------------------------------

/** Suma dos usos de tokens; un campo que ninguno trae se queda sin valor. */
function sumarUso(a: LanguageModelUsage | undefined, b: LanguageModelUsage | undefined): LanguageModelUsage | undefined {
  if (!a) return b;
  if (!b) return a;
  const suma = (x: number | undefined, y: number | undefined) => (x === undefined && y === undefined ? undefined : (x ?? 0) + (y ?? 0));
  return {
    inputTokens: suma(a.inputTokens, b.inputTokens),
    outputTokens: suma(a.outputTokens, b.outputTokens),
    totalTokens: suma(a.totalTokens, b.totalTokens),
    reasoningTokens: suma(a.reasoningTokens, b.reasoningTokens),
    cachedInputTokens: suma(a.cachedInputTokens, b.cachedInputTokens),
  };
}

/** Como queda la corrida segun como termino el turno. */
function resumenDelTurno(turno: TurnoDeWidget): ResumenDeCorrida {
  if (turno.ok) return { estado: "ok", cierre: turno.cierre, pasos: turno.pasos, uso: turno.uso, texto: turno.texto };
  const estado = /se corto/.test(turno.motivo)
    ? "timeout"
    : /no pude cambiar la tarjeta|no cerro el turno/.test(turno.motivo)
      ? "sin_pantalla"
      : "error";
  return { estado, pasos: turno.pasos, uso: turno.uso, error: turno.motivo };
}

/**
 * Una pregunta a una tarjeta, grabada como corrida `widget` (issue #35): modelo, prompt y tools
 * por hash, cada paso con sus tokens, cada tool con argumentos y resultado, y el total de
 * tokens de todos los pasos. La grabacion es de mejor esfuerzo y nunca frena el turno.
 */
export async function turnoDeWidget(peticion: PeticionDeWidget, opciones: OpcionesDeTurno = {}): Promise<TurnoDeWidget> {
  const propia = !opciones.grabadora;
  const grabadora =
    opciones.grabadora ??
    crearGrabadora(
      {
        tipo: "widget",
        usuarioId: peticion.usuarioId,
        motivo: peticion.foco ? `foco:${peticion.foco}` : "general",
        peticion: { pregunta: peticion.pregunta, foco: peticion.foco, historial: peticion.historial },
        dispositivoId: opciones.dispositivoId,
      },
      opciones.escritor ?? escritorEnPostgres,
    );
  const turno = await correrTurnoDeWidget(peticion, opciones, grabadora, propia);
  grabadora.resumir(resumenDelTurno(turno));
  if (propia) void grabadora.terminar();
  return grabadora.activa ? { ...turno, corridaId: grabadora.id } : turno;
}

async function correrTurnoDeWidget(
  peticion: PeticionDeWidget,
  opciones: OpcionesDeTurno,
  grabadora: Grabadora,
  grabarLineas: boolean,
): Promise<TurnoDeWidget> {
  const inicio = Date.now();
  const nombreModelo = opciones.nombreDelModelo ?? configInicio.modeloWidgets;
  const usadas: LlamadaRegistrada[] = [];
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_MS;
  let cliente: Client | undefined;
  let pasos = 0;
  let uso: LanguageModelUsage | undefined;
  const alEvento = opciones.alEvento;
  // Con la grabadora de la ruta, la ruta graba las lineas al emitirlas; con la propia, aqui.
  const avisar = (evento: EventoDeTurno) => {
    if (grabarLineas) grabadora.linea(evento);
    alEvento?.(evento);
  };

  const fallo = (motivo: string): TurnoDeWidget => ({
    ok: false,
    motivo,
    tools: usadas.map((l) => `${l.nombre}${l.ok ? "" : "!"}`),
    pasos,
    ms: Date.now() - inicio,
    modelo: nombreModelo,
    ...(uso ? { uso } : {}),
  });

  const componentes = componentesDe(peticion.pantalla.mensajes);
  if (peticion.foco !== undefined && !peticion.pantalla.procedencias[peticion.foco]) {
    return fallo(`la tarjeta "${peticion.foco}" no esta en tu Inicio`);
  }

  const registrar = (llamada: LlamadaRegistrada) => {
    usadas.push(llamada);
    avisar({ tipo: "tool", nombre: llamada.nombre, ms: llamada.ms, ok: llamada.ok });
  };

  try {
    avisar({ tipo: "estado", valor: "pensando" });
    let llamar = opciones.llamar;
    let apoyo = opciones.herramientas;
    if (!llamar || !apoyo) {
      // Solo se cierra la conexion que abrio este turno.
      if (!opciones.cliente) cliente = await conectarMcp({ dispositivoId: opciones.dispositivoId });
      const abierto = opciones.cliente ?? cliente!;
      llamar ??= (tool, argumentos) => llamarTool(abierto, tool, argumentos, { corridaId: grabadora.id });
      apoyo ??= await herramientasDelMcp(abierto, { usuarioId: peticion.usuarioId, corridaId: grabadora.id, alTerminar: registrar });
    }
    // Lo que el servidor consulta para rearmar una tarjeta (su fuente) tambien queda en la corrida.
    const llamarSinGrabar = llamar;
    const llamarGrabando: Llamar = async (tool, argumentos) => {
      const r = await llamarSinGrabar(tool, argumentos);
      grabadora.toolDelHost({ nombre: tool, argumentos, resultado: r.resultado, ok: r.ok, ms: r.ms });
      return r;
    };

    const consultor = crearConsultor({ usuarioId: peticion.usuarioId, llamar: llamarGrabando, alTerminar: registrar });
    const ctx: Contexto = {
      usuarioId: peticion.usuarioId,
      pregunta: peticion.pregunta,
      componentes,
      procedencias: peticion.pantalla.procedencias,
      referencias: peticion.pantalla.referencias,
      consultor,
      datosDeApoyo: [],
    };
    const cierre = crearCierreDeWidgets(ctx);
    const nombresDeCierre = Object.keys(cierre.herramientas);

    // Las de apoyo pasan por aqui para que su resultado cuente como dato verificable. Solo
    // las de lectura: una accion no se ejecuta desde una pregunta en Inicio.
    const tools: ToolSet = { ...cierre.herramientas };
    for (const [nombre, t] of Object.entries(apoyo)) {
      if (!LECTURAS_DE_APOYO.has(nombre) || !t.execute) continue;
      const ejecutar = t.execute;
      tools[nombre] = {
        ...t,
        execute: async (entrada: unknown, opcionesDeTool: Parameters<typeof ejecutar>[1]) => {
          avisar({ tipo: "estado", valor: "consultando" });
          const salida = (await ejecutar(entrada, opcionesDeTool)) as unknown;
          ctx.datosDeApoyo.push(salida);
          return salida;
        },
      } as Tool;
    }

    const modeloDelTurno = opciones.modelo ?? modeloPorId(nombreModelo);
    const promptSistema = promptDeWidgets();
    const mensajes: ModelMessage[] = [
      { role: "system", content: promptSistema, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
      { role: "user", content: contextoDeWidget(peticion, componentes, opciones.hoy) },
    ];
    const opcionesProveedor = opciones.modelo ? {} : opcionesDeWidgets(nombreModelo);
    grabadora.configurar({
      modelo: modeloDelTurno,
      opcionesProveedor,
      config: {
        maxPasos: MAX_PASOS,
        timeoutMs,
        intentosDelModelo: INTENTOS_DEL_MODELO,
        plazoPorIntentoMs: opciones.plazoPorIntentoMs ?? PLAZO_POR_INTENTO_MS,
        foco: peticion.foco ?? null,
      },
      promptSistema,
      mensajes,
      tools,
      origenDe: (nombre) => (nombresDeCierre.includes(nombre) ? "cierre" : "mcp"),
    });

    let errores: string[] = [];
    let corte = false;
    // Un intento que no cerro en su plazo se repite una vez: medido el 2026-09-13, el mismo
    // turno trivial tardo 0.5 s, 8 s y mas de 30 s seguidos con el mismo modelo. Se repite
    // aunque ya hubiera llamado tools, porque en este turno todas son de LECTURA: repetir una
    // consulta no cambia nada (y las de las fuentes salen de la cache del consultor).
    for (let intento = 1; intento <= INTENTOS_DEL_MODELO && !cierre.cerrado(); intento++) {
      const restante = timeoutMs - (Date.now() - inicio);
      if (restante <= 1_000) break;
      const plazo = intento < INTENTOS_DEL_MODELO ? Math.min(opciones.plazoPorIntentoMs ?? PLAZO_POR_INTENTO_MS, restante) : restante;
      corte = false;
      if (intento > 1) avisar({ tipo: "estado", valor: "pensando" });

      // `prepareStep` cuenta desde 0 en cada intento; la corrida numera los pasos del turno entero.
      const pasosAntes = pasos;
      // Lo que llevan los pasos de este intento, por si se corta antes de que haya `totalUsage`.
      let usoDelIntento: LanguageModelUsage | undefined;
      const resultado = streamText({
        model: modeloDelTurno,
        messages: mensajes,
        allowSystemInMessages: true,
        tools,
        stopWhen: [stepCountIs(MAX_PASOS), () => cierre.cerrado(), () => cierre.intentosFallidos() >= MAX_INTENTOS],
        // Paso 0: consultar lo que falte o cerrar de una vez. Del 1 en adelante, solo cerrar.
        prepareStep: ({ stepNumber }) => {
          const soloCierre = stepNumber > 0;
          grabadora.pasoPreparado(pasosAntes + stepNumber, soloCierre ? nombresDeCierre : Object.keys(tools), "required");
          return soloCierre ? { toolChoice: "required", activeTools: nombresDeCierre } : { toolChoice: "required" };
        },
        onStepFinish: (paso) => grabadora.paso(paso),
        providerOptions: opcionesProveedor,
        abortSignal: AbortSignal.timeout(plazo),
      });

      try {
        for await (const parte of resultado.fullStream) {
          switch (parte.type) {
            case "tool-call":
              grabadora.toolPedida(parte.toolCallId, parte.toolName, parte.input);
              if (nombresDeCierre.includes(parte.toolName)) avisar({ tipo: "estado", valor: "armando" });
              break;
            case "tool-result": {
              const salida = parte.output as Partial<Salida> | undefined;
              grabadora.toolTermino(parte.toolCallId, { resultado: parte.output, ok: salida?.ok !== false });
              if (nombresDeCierre.includes(parte.toolName) && salida?.ok === false) errores = salida.errores ?? [];
              break;
            }
            case "tool-error":
              grabadora.toolTermino(parte.toolCallId, {
                ok: false,
                error: parte.error instanceof Error ? parte.error.message : String(parte.error),
              });
              break;
            case "finish-step":
              pasos++;
              usoDelIntento = sumarUso(usoDelIntento, parte.usage);
              break;
            case "error":
              if (esCorte(parte.error)) corte = true;
              else {
                uso = sumarUso(uso, usoDelIntento);
                return fallo(`el modelo fallo: ${parte.error instanceof Error ? parte.error.message : String(parte.error)}`);
              }
              break;
            case "abort":
              corte = true;
              break;
            default:
              break;
          }
        }
      } catch (error) {
        if (!esCorte(error)) throw error;
        corte = true;
      }
      // `totalUsage` (la suma de los pasos del intento) solo se espera si el stream termino
      // normal: tras un corte puede no resolverse nunca, y ahi valen los pasos que llegaron.
      const totalDelIntento = corte ? undefined : await resultado.totalUsage.catch(() => undefined);
      uso = sumarUso(uso, totalDelIntento ?? usoDelIntento);
      if (!corte) break;
    }

    const cerrado = cierre.resultado();
    if (!cerrado) {
      if (corte) return fallo(`la respuesta paso de ${timeoutMs / 1000} s y se corto`);
      return fallo(errores.length ? `no pude cambiar la tarjeta: ${errores.join("; ")}` : `el modelo no cerro el turno en ${pasos} paso(s)`);
    }
    return {
      ...cerrado,
      tools: usadas.map((l) => `${l.nombre}${l.ok ? "" : "!"}`),
      pasos,
      ms: Date.now() - inicio,
      modelo: nombreModelo,
      ...(uso ? { uso } : {}),
    };
  } catch (error) {
    const abortado = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
    return fallo(abortado ? `la respuesta paso de ${timeoutMs / 1000} s y se corto` : error instanceof Error ? error.message : String(error));
  } finally {
    await cliente?.close().catch(() => undefined);
  }
}

/** Props que no aportan al modelo: son de vista o ya estan en otra linea. */
const PROPS_OMITIDAS = new Set(["id", "component", "razon", "action", "ancho", "heroe", "children"]);
const MAX_ELEMENTOS = 15;

/** Las props de una tarjeta, compactas: listas largas recortadas con el conteo de lo que falta. */
export function datosCompactos(componente: Componente): string {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(componente)) {
    if (PROPS_OMITIDAS.has(k)) continue;
    salida[k] = Array.isArray(v) && v.length > MAX_ELEMENTOS ? [...v.slice(0, MAX_ELEMENTOS), `(+${v.length - MAX_ELEMENTOS} mas)`] : v;
  }
  return JSON.stringify(salida);
}

export function contextoDeWidget(peticion: PeticionDeWidget, componentes: ReadonlyMap<string, Componente>, hoy?: string): string {
  const { procedencias } = peticion.pantalla;
  const fecha = hoy ?? process.env.MCP_HOY ?? new Date().toISOString().slice(0, 10);
  const lineas: string[] = [];

  for (const id of idsEnOrden(componentes)) {
    const c = componentes.get(id);
    if (!c) continue;
    if (c.component === "Conclusion") {
      const cifras = Array.isArray(c.datos) ? (c.datos as Array<{ etiqueta: string; valor: string }>).map((d) => `${d.etiqueta}=${d.valor}`).join("; ") : "";
      lineas.push(`- conclusion · Conclusion · titular «${String(c.titular)}»${cifras ? ` · cifras: ${cifras}` : ""} (no se modifica)`);
      continue;
    }
    const p = procedencias[id];
    lineas.push(
      `- ${id} · ${c.component}` +
        (p ? ` · fuente \`${p.fuente}\` · parametros ${JSON.stringify(p.parametros)} · variantes ${JSON.stringify(p.variantes)}` : " · sin fuente (no se puede modificar)") +
        `\n  datos: ${datosCompactos(c)}`,
    );
  }

  const foco = peticion.foco ? componentes.get(peticion.foco) : undefined;
  const historial = (peticion.historial ?? []).slice(-3);

  return [
    "--- pantalla viva ---",
    `usuarioId: ${peticion.usuarioId}`,
    `hoy: ${fecha}`,
    "",
    "tarjetas en el Inicio de la persona, en orden:",
    ...lineas,
    "",
    foco
      ? `FOCO: la persona tocó «Preguntar sobre esto» en \`${peticion.foco}\` (${foco.component}). La pregunta es sobre ESA tarjeta: si cambia algo, cambia esa.`
      : "Sin foco: la persona escribió en la barra general. Decide tú a qué tarjeta se refiere.",
    ...(historial.length
      ? ["", "lo último que se habló en Inicio:", ...historial.map((h) => `- «${h.pregunta}» -> ${h.respuesta}`)]
      : []),
    "",
    `pregunta: «${peticion.pregunta}»`,
    "",
    "Cierra con UNA tool:",
    "1. `modificar_widget` si la respuesta es la MISMA tarjeta con otros parámetros o variantes (otro mes, otro",
    "   plazo, otro orden, las N principales, más semanas). Manda solo lo que cambia. Es lo más común.",
    "2. `reemplazar_widget` si la pregunta es de un tema que ninguna tarjeta muestra: en el hueco del foco (o, sin",
    "   foco, en el de la tarjeta menos relacionada) entra la tarjeta de otra fuente. Nunca en la conclusión.",
    "3. `responder` si basta aclarar lo que ya se ve. Si te falta un dato, consúltalo primero con una tool de lectura.",
    "Nunca rehagas el dashboard completo. `texto`: una o dos frases; solo cifras tal cual vienen en los datos.",
  ].join("\n");
}
